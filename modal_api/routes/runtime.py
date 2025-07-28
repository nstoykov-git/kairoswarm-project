from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from fastapi import Body
import openai
import uuid
import json
import os
from datetime import datetime
from openai import AsyncOpenAI
from modal_api.utils.services import get_redis

from kairoswarm_core.memory_core.memory_store import MemoryStore

router = APIRouter()

# --- OpenAI Init ---
openai.api_key = os.environ["OPENAI_API_KEY"]
client = AsyncOpenAI(api_key=openai.api_key)

router = APIRouter()

@router.post("/add-agent")
async def add_agent(request: Request):
    body = await request.json()
    agent_id = body.get("agentId")
    sid = body.get("swarm_id") or "default"
    user_id = body.get("user_id") or "default"

    if not agent_id:
        return {"status": "skipped", "reason": "No agent ID provided"}

    try:
        assistant = openai.beta.assistants.retrieve(agent_id)
        thread = openai.beta.threads.create()
        pid = str(uuid.uuid4())

        async with get_redis() as r:
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

        return {
            "name": assistant.name,
            "thread_id": thread.id
        }

    except Exception as e:
        return {"error": str(e)}
    

@router.get("/get-agents")
async def get_agents():
    pass  # Ephemeral only — agents stored in memory

@router.post("/speak")
async def speak(request: Request):
    body = await request.json()
    pid = body.get("participant_id")
    message = body.get("message")
    sid = body.get("swarm_id") or "default"

    if not pid or not message:
        return {"status": "skipped", "reason": "Missing participant_id or message"}

    async with get_redis() as r:
        part_raw = await r.hget(f"{sid}:participants", pid)
        if not part_raw:
            return {"error": "Participant not found."}

        part = json.loads(part_raw)
        user_name = part.get("name", "User")
        entry = {"from": user_name, "type": part["type"], "message": message}
        await r.rpush(f"{sid}:conversation_tape", json.dumps(entry))

        # Broadcast message to all agents (regardless of who spoke)
        agent_ids = await r.hkeys(f"{sid}:agents")
        for aid in agent_ids:
            agent_json = await r.hget(f"{sid}:agents", aid)
            if not agent_json:
                continue
            agent_data = json.loads(agent_json)

            thread_id = agent_data["thread_id"]
            assistant_id = agent_data["agent_id"]

            message_with_name = f"{user_name}: {message}"

            await client.beta.threads.messages.create(
                thread_id=thread_id,
                role="user",
                content=message_with_name
            )

            run = await client.beta.threads.runs.create_and_poll(
                thread_id=thread_id,
                assistant_id=assistant_id
            )

            messages = (await client.beta.threads.messages.list(thread_id=thread_id)).data
            reply = next(
                (m for m in reversed(messages)
                 if m.role == "assistant" and m.run_id == run.id),
                None
            )

            if reply:
                response_text = reply.content[0].text.value.strip()
                agent_entry = {
                    "from": agent_data.get("name", "Agent"),
                    "type": "agent",
                    "message": response_text
                }
                await r.rpush(f"{sid}:conversation_tape", json.dumps(agent_entry))

        return {"status": "ok", "entry": entry}

@router.get("/participants-full")
async def participants_full(request: Request):
    sid = request.query_params.get("swarm_id") or "default"
    async with get_redis() as r:
        raw = await r.hvals(f"{sid}:participants")
        try:
            return [json.loads(x) for x in raw if isinstance(x, str) and x.strip().startswith("{")]
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Malformed data in Redis: {str(e)}"})

@router.get("/tape")
async def tape(request: Request):
    sid = request.query_params.get("swarm_id") or "default"
    async with get_redis() as r:
        raw = await r.lrange(f"{sid}:conversation_tape", 0, -1)
    return [json.loads(x) for x in raw]

@router.post("/create-ephemeral")
async def create_ephemeral_swarm(payload: dict = Body(...)):
    name = payload.get("name") or "Anonymous Swarm"
    swarm_id = str(uuid.uuid4())

    try:
        async with get_redis() as r:
            # Initialize conversation tape
            tape_key = f"{swarm_id}:conversation_tape"
            entry = {
                "from": "system",
                "type": "system",
                "message": f"Ephemeral swarm '{name}' created.",
                "timestamp": datetime.utcnow().isoformat()
            }
            await r.rpush(tape_key, json.dumps(entry))
            await r.expire(tape_key, 86400)  # 24 hours
            await r.expire(f"{swarm_id}:participants", 86400)
            await r.expire(f"{swarm_id}:agents", 86400)

        return {
            "swarm_id": swarm_id,
            "status": "ephemeral_created"
        }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/debug/clear-ephemeral")
async def clear_ephemeral(request: Request):
    sid = request.query_params.get("swarm_id")
    
    if not sid or sid == "default":
        return {"status": "skipped", "reason": "No valid ephemeral swarm_id provided."}

    async with get_redis() as r:
        await r.delete(f"{sid}:conversation_tape")
        await r.delete(f"{sid}:participants")
        await r.delete(f"{sid}:agents")
        agent_ids = await r.hkeys(f"{sid}:agents")
        for aid in agent_ids:
            await r.delete(f"{sid}:agent:{aid}")

    return {"status": f"{sid} swarm cleared"}


@router.post("/debug/clear-default")
async def clear_default():
    sid = "default"
    async with get_redis() as r:
        await r.delete(f"{sid}:conversation_tape")
        await r.delete(f"{sid}:participants")
        await r.delete(f"{sid}:agents")
        agent_ids = await r.hkeys(f"{sid}:agents")
        for aid in agent_ids:
            await r.delete(f"{sid}:agent:{aid}")
    return {"status": f"{sid} swarm cleared"}

