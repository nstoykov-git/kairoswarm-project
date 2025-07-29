import logging
import json
import uuid
from datetime import datetime

import openai
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse

from modal_api.routes.auth import get_current_user
from modal_api.utils.services import get_redis, get_supabase
from modal_api.utils.services import EmbeddingRequest, generate_embedding


router = APIRouter()

@router.get("/ping")
async def ping():
    return {"status": "alive"}


# --- Create Ephemeral Swarm ---

class CreateEphemeralRequest(BaseModel):
    name: str

@router.post("/create")
async def create_ephemeral_swarm(payload: CreateEphemeralRequest):
    swarm_id = str(uuid.uuid4())
    ttl_seconds = 86400  # 24 hours

    try:
        async with get_redis() as redis:
            now = datetime.utcnow().isoformat()
            tape_key = f"{swarm_id}:conversation_tape"

            # Create system tape entry
            await redis.rpush(tape_key, json.dumps({
                "from": "system",
                "type": "system",
                "message": f"Swarm '{payload.name}' created.",
                "timestamp": now
            }))
            await redis.expire(tape_key, ttl_seconds)

            # Initialize participants and agents keys with TTL
            for key in [f"{swarm_id}:participants", f"{swarm_id}:agents"]:
                await redis.hset(key, "_init", "1")
                await redis.hdel(key, "_init")
                await redis.expire(key, ttl_seconds)

        return {"id": swarm_id, "status": "created"}

    except Exception as e:
        logging.exception("Failed to create ephemeral swarm")
        raise HTTPException(status_code=500, detail=f"Swarm creation failed: {str(e)}")


# --- Join Ephemeral Swarm ---

@router.post("/join")
async def join_ephemeral_swarm(request: Request):
    body = await request.json()
    swarm_id = body.get("swarm_id", "default")
    name = body.get("name", "Anonymous")
    user_id = body.get("user_id")  # may be None
    now = datetime.utcnow().isoformat()

    async with get_redis() as r:
        # Ensure swarm exists
        ttl = await r.ttl(f"{swarm_id}:conversation_tape")
        if ttl <= 0 and ttl != -1:
            return JSONResponse(status_code=400, content={"error": "Swarm expired or not found"})

        participant_key = f"{swarm_id}:participants"
        # If logged in, check for existing participant
        if user_id:
            existing = await r.hvals(participant_key)
            for item in existing:
                p = json.loads(item)
                if p.get("user_id") == user_id:
                    # Refresh TTL and return existing participant
                    pid = p["id"]
                    if ttl > 0:
                        await r.expire(f"{swarm_id}:participant:{pid}", ttl)
                        await r.expire(participant_key, ttl)
                    return {"status": "joined", "swarm_id": swarm_id, "participant_id": pid}
        
        # Otherwise create a new participant
        participant_id = str(uuid.uuid4())
        record = {
            "id": participant_id,
            "name": name,
            "type": "human",
            "joined_at": now
        }
        if user_id:
            record["user_id"] = user_id

        await r.hset(participant_key, participant_id, json.dumps(record))
        await r.hset(f"{swarm_id}:participant:{participant_id}", mapping=record)
        if ttl > 0:
            await r.expire(participant_key, ttl)
            await r.expire(f"{swarm_id}:participant:{participant_id}", ttl)

    logging.info("✅ Joined swarm: %s (%s)", participant_id, name)
    return {"status": "joined", "swarm_id": swarm_id, "participant_id": participant_id}


# --- Add Agent to Ephemeral Swarm ---

@router.post("/add-agent")
async def add_agent(request: Request):
    try:
        body = await request.json()
        agent_id = body.get("agentId")
        sid = body.get("swarm_id") or "default"

        if not agent_id:
            return {"status": "skipped", "reason": "No agent ID provided"}

        sb = get_supabase()
        redis = await get_redis()

        # 🔍 Look up agent in Supabase by Kairoswarm UUID
        agent_resp = sb.table("agents").select("name", "openai_id").eq("id", agent_id).single().execute()

        if not agent_resp.data:
            return JSONResponse(status_code=404, content={"error": f"Agent {agent_id} not found."})

        openai_id = agent_resp.data["openai_id"]
        name = agent_resp.data["name"]

        if not openai_id:
            return JSONResponse(status_code=400, content={"error": "Agent does not have an OpenAI assistant ID."})

        # ✅ Create new OpenAI thread
        thread = openai.beta.threads.create()
        pid = str(uuid.uuid4())

        ttl = await redis.ttl(f"{sid}:conversation_tape")
        if ttl <= 0 and ttl != -1:
            return JSONResponse(status_code=400, content={"error": "Swarm expired or not found"})

        # 💾 Save agent + participant in Redis using Kairoswarm UUID
        await redis.hset(f"{sid}:agents", agent_id, json.dumps({
            "agent_id": agent_id,
            "thread_id": thread.id,
            "name": name
        }))
        await redis.hset(f"{sid}:agent:{agent_id}", mapping={
            "agent_id": agent_id,
            "thread_id": thread.id,
            "name": name
        })
        await redis.hset(f"{sid}:participants", pid, json.dumps({
            "id": pid,
            "name": name,
            "type": "agent",
            "metadata": {
                "agent_id": agent_id,
                "thread_id": thread.id
            }
        }))

        if ttl > 0:
            await redis.expire(f"{sid}:agents", ttl)
            await redis.expire(f"{sid}:agent:{agent_id}", ttl)
            await redis.expire(f"{sid}:participants", ttl)

        return {"name": name, "thread_id": thread.id}

    except Exception as e:
        logging.exception("❌ Failed to add agent to swarm")
        return {"error": str(e)}


# --- Reload Agent ---
    
@router.post("/reload-agent")
async def reload_agent(request: Request):
    body = await request.json()
    swarm_id = body.get("swarm_id", "default")
    agent_id = body.get("agent_id")

    if not agent_id:
        return {"status": "error", "message": "Missing agent_id"}

    try:
        assistant = openai.beta.assistants.retrieve(agent_id)
        thread = openai.beta.threads.create()

        async with get_redis() as r:
            # 🔍 Look for existing participant with this agent_id
            participants_raw = await r.hvals(f"{swarm_id}:participants")
            existing_pid = None
            for entry in participants_raw:
                try:
                    data = json.loads(entry)
                    if (
                        data.get("type") == "agent"
                        and data.get("metadata", {}).get("agent_id") == agent_id
                    ):
                        existing_pid = data["id"]
                        break
                except Exception:
                    continue

            # ✅ If found, update in place
            pid = existing_pid or str(uuid.uuid4())

            await r.hset(f"{swarm_id}:agents", agent_id, json.dumps({
                "agent_id": agent_id,
                "thread_id": thread.id,
                "name": assistant.name
            }))
            await r.hset(f"{swarm_id}:agent:{agent_id}", mapping={
                "agent_id": agent_id,
                "thread_id": thread.id,
                "name": assistant.name
            })
            await r.hset(f"{swarm_id}:participants", pid, json.dumps({
                "id": pid,
                "name": assistant.name,
                "type": "agent",
                "metadata": {
                    "agent_id": agent_id,
                    "thread_id": thread.id
                }
            }))

        return {"status": "ok", "message": f"Agent {assistant.name} reloaded"}

    except Exception as e:
        return {"status": "error", "message": str(e)}    


# --- Generate Embedding for Agent Publishing ---

@router.post("/generate-embedding")
async def generate_embedding_route(payload: EmbeddingRequest):
    return await generate_embedding(payload)


# --- Publish Agent ---

class PublishAgentRequest(BaseModel):
    assistant_id: str
    name: str
    description: str
    skills: list[str]
    has_free_tier: bool = True
    price: float = 0.0
    is_negotiable: bool = False
    user_id: str

@router.post("/publish-agent")
async def publish_agent(payload: PublishAgentRequest):
    try:
        agent_id = payload.assistant_id  # This is now the Kairoswarm UUID

        # 1. Generate embedding
        text_for_embedding = f"{payload.name} {payload.description} {' '.join(payload.skills)}"
        response = openai.embeddings.create(
            input=text_for_embedding.strip(),
            model="text-embedding-3-small"
        )
        embedding = response.data[0].embedding

        # 2. Update existing agent in Supabase
        sb = get_supabase()

        update_data = {
            "description": payload.description,
            "skills": payload.skills,
            "has_free_tier": payload.has_free_tier,
            "price": payload.price,
            "is_negotiable": payload.is_negotiable,
            "vector_embedding": embedding,
            "is_published": True
        }

        sb.table("agents").update(update_data).eq("id", agent_id).execute()

        return {"status": "ok", "id": agent_id}

    except Exception as e:
        logging.exception("❌ Failed to publish agent")
        raise HTTPException(status_code=500, detail=f"Agent publish failed: {str(e)}")



@router.post("/unpublish-agent")
async def unpublish_agent(request: Request, user=Depends(get_current_user)):
    try:
        body = await request.json()
        agent_id = body.get("agent_id")

        if not agent_id:
            raise HTTPException(status_code=400, detail="Agent ID is required.")

        supabase = get_supabase()

        # Verify agent ownership
        agent_resp = supabase.table("agents").select("user_id").eq("id", agent_id).single().execute()

        if not agent_resp.data or agent_resp.data["user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to unpublish this agent.")

        # Perform soft delete
        supabase.table("agents").update({"is_published": False}).eq("id", agent_id).execute()

        return {"status": "success", "message": "Agent unpublished successfully."}

    except Exception as e:
        logging.exception("Failed to unpublish agent")
        raise HTTPException(status_code=500, detail=f"Error unpublishing agent: {str(e)}")
