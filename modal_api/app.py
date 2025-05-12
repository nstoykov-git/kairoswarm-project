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
    sid = body.get("swarm_id")
    if not sid:
        return JSONResponse(status_code=400, content={"error": "Missing swarm_id"})

    async with get_redis() as r:
        await r.hset(f"{sid}:participants", pid, json.dumps({
            "id": pid,
            "name": body["name"],
            "type": body["type"],
            "metadata": body.get("metadata", {})
        }))
    return {"participant_id": pid}

@api.get("/participants-full")
async def participants_full(request: Request):
    sid = request.query_params.get("swarm_id")
    if not sid:
        return JSONResponse(status_code=400, content={"error": "Missing swarm_id"})

    async with get_redis() as r:
        raw = await r.hvals(f"{sid}:participants")
        return [json.loads(x) for x in raw]

@api.get("/tape")
async def tape(request: Request):
    sid = request.query_params.get("swarm_id")
    if not sid:
        return JSONResponse(status_code=400, content={"error": "Missing swarm_id"})

    async with get_redis() as r:
        raw = await r.lrange(f"{sid}:conversation_tape", 0, -1)
    return [json.loads(x) for x in raw]
