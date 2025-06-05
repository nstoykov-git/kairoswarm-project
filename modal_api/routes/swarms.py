import logging
import json
import uuid
from datetime import datetime

import openai
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from modal_api.utils.services import get_redis

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
    try:
        body = await request.json()
        swarm_id = body.get("swarm_id", "default")
        name = body.get("name", "Anonymous")
        participant_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()

        async with get_redis() as r:
            # Match participant TTL to existing tape TTL
            ttl = await r.ttl(f"{swarm_id}:conversation_tape")
            if ttl <= 0:
                return JSONResponse(status_code=400, content={"error": "Swarm expired or not found"})

            # Add participant to participant list
            await r.hset(f"{swarm_id}:participants", participant_id, json.dumps({
                "id": participant_id,
                "name": name,
                "type": "human",
                "joined_at": now
            }))
            await r.hset(f"{swarm_id}:participant:{participant_id}", mapping={
                "id": participant_id,
                "name": name,
                "type": "human",
                "joined_at": now
            })
            await r.expire(f"{swarm_id}:participants", ttl)
            await r.expire(f"{swarm_id}:participant:{participant_id}", ttl)

        logging.info("✅ Joined swarm: %s (%s)", participant_id, name)
        return {"status": "joined", "swarm_id": swarm_id, "participant_id": participant_id}

    except Exception as e:
        logging.exception("❌ Failed to join swarm")
        return JSONResponse(status_code=500, content={"error": str(e)})


# --- Add Agent to Ephemeral Swarm ---

@router.post("/add-agent")
async def add_agent(request: Request):
    try:
        body = await request.json()
        agent_id = body.get("agentId")
        sid = body.get("swarm_id") or "default"

        if not agent_id:
            return {"status": "skipped", "reason": "No agent ID provided"}

        # Create OpenAI assistant + thread
        assistant = openai.beta.assistants.retrieve(agent_id)
        thread = openai.beta.threads.create()
        pid = str(uuid.uuid4())

        async with get_redis() as r:
            ttl = await r.ttl(f"{sid}:conversation_tape")
            if ttl <= 0:
                return JSONResponse(status_code=400, content={"error": "Swarm expired or not found"})

            # Add agent to Redis
            await r.hset(f"{sid}:agents", assistant.id, json.dumps({
                "agent_id": assistant.id,
                "thread_id": thread.id,
                "name": assistant.name
            }))
            await r.hset(f"{sid}:agent:{assistant.id}", mapping={
                "agent_id": assistant.id,
                "thread_id": thread.id,
                "name": assistant.name
            })
            await r.hset(f"{sid}:participants", pid, json.dumps({
                "id": pid,
                "name": assistant.name,
                "type": "agent",
                "metadata": {
                    "agent_id": assistant.id,
                    "thread_id": thread.id
                }
            }))

            await r.expire(f"{sid}:agents", ttl)
            await r.expire(f"{sid}:agent:{assistant.id}", ttl)
            await r.expire(f"{sid}:participants", ttl)

        return {"name": assistant.name, "thread_id": thread.id}

    except Exception as e:
        logging.exception("Failed to add agent")
        return {"error": str(e)}
