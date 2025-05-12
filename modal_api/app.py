from modal import App, asgi_app, Secret, Image
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import redis.asyncio as redis
import openai
import uuid, json, os

api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kairoswarm-project.vercel.app", "https://kairoswarm.nextminds.network"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_redis():
    url = os.environ["REDIS_URL"]
    return redis.from_url(url, decode_responses=True)

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
    sid = body.get("swarm_id") or "default"

    async with get_redis() as r:
        await r.hset(f"{sid}:participants", pid, json.dumps({
            "id": pid,
            "name": body.get("name", "Unknown"),
            "type": body.get("type", "human"),
            "metadata": body.get("metadata", {})
        }))
    return {"participant_id": pid}

@api.post("/add-agent")
async def add_agent(request: Request):
    body = await request.json()
    agent_id = body.get("agentId")
    sid = body.get("swarm_id") or "default"

    if not agent_id:
        return {"status": "skipped", "reason": "No agent ID provided"}

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

        return {
            "name": assistant.name,
            "thread_id": thread.id
        }

    except Exception as e:
        return {"error": str(e)}

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
