from modal import App, asgi_app, Secret, Image
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import openai
import uuid, json, os

# --- FastAPI with CORS enabled ---
api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kairoswarm.nextminds.network"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_redis():
    url = os.environ["REDIS_URL"]
    return redis.from_url(url, decode_responses=True)

# --- Modal App definition ---
app = App(
    name="kairoswarm-serverless-api",
    image=Image.debian_slim().pip_install(
        "redis",
        "fastapi[standard]",
        "openai",
        "aiohttp"
    ),
    secrets=[Secret.from_name("upstash-redis-url"), Secret.from_name("openai-key")],
)

# OpenAI client
openai.api_key = os.environ["OPENAI_API_KEY"]
client = openai.AsyncOpenAI(api_key=openai.api_key)

@app.function()
@asgi_app()
def serve_api():
    return api

@api.post("/join")
async def join(request: Request):
    body = await request.json()
    pid = str(uuid.uuid4())
    sid = body["swarm_id"]
    async with get_redis() as r:
        await r.hset(f"{sid}:participants", pid, json.dumps({
            "id": pid,
            "name": body["name"],
            "type": body["type"],
            "metadata": body.get("metadata", {})
        }))
    return {"participant_id": pid}

@api.get("/participants-full")
async def participants_full(swarm_id: str):
    async with get_redis() as r:
        raw = await r.hvals(f"{swarm_id}:participants")
    return [json.loads(x) for x in raw]

@api.post("/add-agent")
async def add_agent(request: Request):
    body = await request.json()
    sid = body["swarm_id"]
    agent_id = body["agentId"]
    try:
        assistant = openai.beta.assistants.retrieve(agent_id)
        thread = openai.beta.threads.create()
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
        return {"name": assistant.name, "thread_id": thread.id}
    except Exception as e:
        return {"error": str(e)}

@api.post("/speak")
async def speak(request: Request):
    body = await request.json()
    sid = body["swarm_id"]
    pid = body["participant_id"]
    message = body["message"]
    async with get_redis() as r:
        part_raw = await r.hget(f"{sid}:participants", pid)
        if not part_raw:
            return {"error": "Participant not found."}
        part = json.loads(part_raw)
        entry = {"from": part["name"], "type": part["type"], "message": message}
        await r.rpush(f"{sid}:tape", json.dumps(entry))
        if part["type"] == "human":
            await fanout_to_agents(sid, message)
            return {"status": "ok", "entry": entry}
        agent_data = await r.hgetall(f"{sid}:agent:{pid}")
        if not agent_data:
            return {"error": "Agent data not found."}
        thread_id = agent_data["thread_id"]
        assistant_id = agent_data["agent_id"]
        await client.beta.threads.messages.create(thread_id=thread_id, role="user", content=message)
        run = await client.beta.threads.runs.create_and_poll(thread_id=thread_id, assistant_id=assistant_id)
        messages = (await client.beta.threads.messages.list(thread_id=thread_id)).data
        reply = next((m for m in reversed(messages) if m.role == "assistant" and m.run_id == run.id), None)
        if reply:
            response_text = reply.content[0].text.value.strip()
            agent_entry = {"from": part["name"], "type": "agent", "message": response_text}
            await r.rpush(f"{sid}:tape", json.dumps(agent_entry))
            return {"status": "ok", "entry": agent_entry}
        else:
            return {"error": "Agent replied, but no usable content."}

async def fanout_to_agents(sid, message):
    async with get_redis() as r:
        agent_ids = await r.hkeys(f"{sid}:agents")
        for aid in agent_ids:
            agent_json = await r.hget(f"{sid}:agents", aid)
            if not agent_json:
                continue
            agent_data = json.loads(agent_json)
            thread_id = agent_data["thread_id"]
            assistant_id = agent_data["agent_id"]
            await client.beta.threads.messages.create(thread_id=thread_id, role="user", content=message)
            run = await client.beta.threads.runs.create_and_poll(thread_id=thread_id, assistant_id=assistant_id)
            messages = (await client.beta.threads.messages.list(thread_id=thread_id)).data
            reply = next((m for m in reversed(messages) if m.role == "assistant" and m.run_id == run.id), None)
            if reply:
                response_text = reply.content[0].text.value.strip()
                agent_entry = {"from": agent_data.get("name", "Agent"), "type": "agent", "message": response_text}
                await r.rpush(f"{sid}:tape", json.dumps(agent_entry))

@api.get("/tape")
async def tape(swarm_id: str):
    async with get_redis() as r:
        raw = await r.lrange(f"{swarm_id}:tape", 0, -1)
    return [json.loads(x) for x in raw]

@api.post("/debug/nuke")
async def clear_all():
    async with get_redis() as r:
        keys = await r.keys("*:")
        for k in keys:
            await r.delete(k)
    return {"status": "nuked"}
