from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
import redis.asyncio as redis
import openai
import uuid
import json
import os
import asyncpg
from openai import AsyncOpenAI
from modal_api.utils.services import get_redis

from kairoswarm_core.memory_core.memory_store import MemoryStore

router = APIRouter()

# --- OpenAI Init ---
openai.api_key = os.environ["OPENAI_API_KEY"]
client = AsyncOpenAI(api_key=openai.api_key)

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

        pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO agents (id, user_id, swarm_id, name, model)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO NOTHING
            """, assistant.id, user_id, sid, assistant.name, assistant.model)

        return {
            "name": assistant.name,
            "thread_id": thread.id
        }

    except Exception as e:
        return {"error": str(e)}

@router.get("/get-agents")
async def get_agents(request: Request):
    user_id = request.query_params.get("user_id", "default")

    try:
        pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, model, swarm_id, created_at
                FROM agents
                WHERE user_id = $1
                ORDER BY created_at DESC
            """, user_id)
            agents = [dict(row) for row in rows]
            return {"status": "ok", "agents": agents}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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
        entry = {"from": part["name"], "type": part["type"], "message": message}
        await r.rpush(f"{sid}:conversation_tape", json.dumps(entry))

        if part["type"] == "human":
            agent_ids = await r.hkeys(f"{sid}:agents")
            for aid in agent_ids:
                agent_json = await r.hget(f"{sid}:agents", aid)
                if not agent_json:
                    continue
                agent_data = json.loads(agent_json)

                thread_id = agent_data["thread_id"]
                assistant_id = agent_data["agent_id"]

                await client.beta.threads.messages.create(
                    thread_id=thread_id,
                    role="user",
                    content=message
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

        # Agent initiator flow
        agent_data = await r.hgetall(f"{sid}:agent:{pid}")
        if not agent_data:
            return {"status": "ok", "entry": entry}

        thread_id = agent_data["thread_id"]
        assistant_id = agent_data["agent_id"]

        await client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=message
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
                "from": part["name"],
                "type": "agent",
                "message": response_text
            }
            await r.rpush(f"{sid}:conversation_tape", json.dumps(agent_entry))
            return {"status": "ok", "entry": agent_entry}
        else:
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

@router.post("/debug/clear-ephemeral")
async def clear_ephemeral(request: Request):
    sid = request.query_params.get("swarm_id") or "default"
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

