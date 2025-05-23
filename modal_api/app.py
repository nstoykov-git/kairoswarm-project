from modal import App, asgi_app, Secret, Image
from fastapi import FastAPI, Request
from modal_api.routes.memory import router as memory_router
from modal_api.routes.reload import router as reload_router
from modal_api.routes.users import router as users_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
import openai
import uuid, json, os
import asyncpg
from memory_core.memory_store import MemoryStore

api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kairoswarm-project.vercel.app", "https://kairoswarm.nextminds.network"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
api.include_router(memory_router)
api.include_router(reload_router)
api.include_router(users_router)

def get_redis():
    url = os.environ["REDIS_URL"]
    return redis.from_url(url, decode_responses=True)

app = App(
    name="kairoswarm-serverless-api",
    image=Image.debian_slim()
    .env({"PYTHONPATH": "/root/kairoswarm-internal"})  # Python path for memory_core
    .pip_install(
        "redis",
        "fastapi[standard]",
        "openai",
        "aiohttp",
        "asyncpg"
    ),
    secrets=[
        Secret.from_name("upstash-redis-url"),
        Secret.from_name("openai-key"),
        Secret.from_name("supabase-url")
        ]
)

openai.api_key = os.environ["OPENAI_API_KEY"]
client = openai.AsyncOpenAI(api_key=openai.api_key)

@app.function()
@asgi_app()
def serve_api():
    return api

# Replace the current /join route in app.py with this version

@api.post("/join")
async def join(request: Request):
    body = await request.json()
    pid = str(uuid.uuid4())
    sid = body.get("swarm_id") or "default"
    user_id = body.get("user_id") or "default"

    async with get_redis() as r:
        await r.hset(f"{sid}:participants", pid, json.dumps({
            "id": pid,
            "name": body.get("name", "Unknown"),
            "type": body.get("type", "human"),
            "metadata": {}
        }))

    try:
        # Save swarm to Supabase if user_id is valid (skip if "default")
        if user_id != "default":
            pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
            async with pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO swarms (id, user_id, name)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (id) DO NOTHING
                """, sid, user_id, f"Swarm {sid[:8]}")
    except Exception as e:
        return {"status": "error", "message": str(e)}

    return {"participant_id": pid}

@api.post("/add-agent")
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

        # ⬇️ Save to Supabase
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
    
@api.post("/log-memory")
async def log_memory(request: Request):
    store = MemoryStore()
    await store.init()

    body = await request.json()
    agent_id = body.get("agent_id")
    type = body.get("type", "experience")
    content = body.get("content")
    user_id = body.get("user_id", "default")

    if not agent_id or not content:
        return {"status": "error", "message": "Missing agent_id or content"}

    try:
        await store.log_memory(agent_id, type, content, user_id)
        return {"status": "ok", "message": "Memory logged"}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
# Replace the current /join route in app.py with this version

@api.post("/join")
async def join(request: Request):
    body = await request.json()
    pid = str(uuid.uuid4())
    sid = body.get("swarm_id") or "default"
    user_id = body.get("user_id") or "default"

    async with get_redis() as r:
        await r.hset(f"{sid}:participants", pid, json.dumps({
            "id": pid,
            "name": body.get("name", "Unknown"),
            "type": body.get("type", "human"),
            "metadata": {}
        }))

    try:
        # Save swarm to Supabase if user_id is valid (skip if "default")
        if user_id != "default":
            pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
            async with pool.acquire() as conn:
                await conn.execute("""
                    INSERT INTO swarms (id, user_id, name)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (id) DO NOTHING
                """, sid, user_id, f"Swarm {sid[:8]}")
    except Exception as e:
        return {"status": "error", "message": str(e)}

    return {"participant_id": pid}


# Update /log-memory to persist memory for agent and user

@api.post("/log-memory")
async def log_memory(request: Request):
    from memory_core.memory_store import MemoryStore
    from openai import AsyncOpenAI
    store = MemoryStore()
    await store.init()

    body = await request.json()
    agent_id = body.get("agent_id")
    type = body.get("type", "experience")
    content = body.get("content")
    user_id = body.get("user_id", "default")

    if not agent_id or not content:
        return {"status": "error", "message": "Missing agent_id or content"}

    try:
        # Generate embedding
        client = AsyncOpenAI()
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=content
        )
        embedding = response.data[0].embedding

        # Log to memory store with embedding
        await store.log_memory(agent_id, type, content, user_id, embedding)
        return {"status": "ok", "message": "Memory logged with embedding"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@api.get("/get-memories")
async def get_memories(request: Request):
    from memory_core.memory_store import MemoryStore
    from openai import AsyncOpenAI
    store = MemoryStore()
    await store.init()

    agent_id = request.query_params.get("agent_id")
    user_id = request.query_params.get("user_id", "default")
    query = request.query_params.get("query")

    if not agent_id:
        return {"status": "error", "message": "Missing agent_id"}

    try:
        if query:
            # Embed the query
            client = AsyncOpenAI()
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=query
            )
            query_embedding = response.data[0].embedding
            # Run semantic match from Supabase
            pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
            async with pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT id, type, content, created_at
                    FROM memories
                    WHERE agent_id = $1 AND user_id = $2
                    ORDER BY embedding <#> $3
                    LIMIT 10
                """, agent_id, user_id, query_embedding)
                memories = [dict(row) for row in rows]
        else:
            memories = await store.get_memories(agent_id, user_id)

        return {"status": "ok", "memories": memories}
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
@api.get("/get-agents")
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

@api.get("/get-swarms")
async def get_swarms(request: Request):
    user_id = request.query_params.get("user_id", "default")

    try:
        pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, created_at
                FROM swarms
                WHERE user_id = $1
                ORDER BY created_at DESC
            """, user_id)
            swarms = [dict(row) for row in rows]
            return {"status": "ok", "swarms": swarms}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@api.post("/speak")
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
        entry = {
            "from": part["name"],
            "type": part["type"],
            "message": message
        }

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

        agent_data = await r.hgetall(f"{sid}:agent:{pid}")
        if not agent_data:
            return {"status": "ok", "entry": entry}  # Skip agent processing

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
            return {"status": "ok", "entry": entry}  # fallback

@api.get("/participants-full")
async def participants_full(request: Request):
    sid = request.query_params.get("swarm_id") or "default"

    async with get_redis() as r:
        raw = await r.hvals(f"{sid}:participants")
        try:
            return [json.loads(x) for x in raw if isinstance(x, str) and x.strip().startswith("{")]
        except Exception as e:
            return JSONResponse(status_code=500, content={"error": f"Malformed data in Redis: {str(e)}"})

@api.get("/tape")
async def tape(request: Request):
    sid = request.query_params.get("swarm_id") or "default"

    async with get_redis() as r:
        raw = await r.lrange(f"{sid}:conversation_tape", 0, -1)
    return [json.loads(x) for x in raw]

@api.post("/debug/clear-ephemeral")
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


@api.post("/debug/clear-default")
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
