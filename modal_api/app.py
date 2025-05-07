from modal import App, asgi_app, Secret, Image
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as redis
import uuid, json, os

# --- FastAPI with CORS enabled ---
api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=["https://kairoswarm-ui.vercel.app"],  # or ["*"] for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_redis():
    url = os.environ["UPSTASH_REDIS_URL"]
    return redis.from_url(url, decode_responses=True)

# --- Modal App definition ---
app = App(
    name="kairoswarm-serverless-api",
    image=Image.debian_slim().pip_install("redis", "fastapi[standard]"),
    secrets=[Secret.from_name("upstash-redis-url")],
)

# --- expose the entire FastAPI as one ASGI app ---
@app.function()
@asgi_app()
def serve_api():
    return api

# --- now define all your routes on `api` as usual: --
@api.post("/join")
async def join(request: Request):
    body = await request.json()
    pid = str(uuid.uuid4())
    async with get_redis() as r:
        await r.hset("participants", pid, json.dumps({
            "id": pid,
            "name": body["name"],
            "type": body["type"],
            "metadata": body.get("metadata", {}),
        }))
    return {"participant_id": pid}

#@api.post("/speak")
#async def speak(request: Request):
#    body = await request.json()
#    pid = body["participant_id"]
#    async with get_redis() as r:
#        part = await r.hget("participants", pid)
#        if not part:
#            return {"error": "Participant not found."}
#        p = json.loads(part)
#        entry = {"from": p["name"], "type": p["type"], "message": body["message"]}
#        await r.rpush("conversation_tape", json.dumps(entry))
#    return {"status": "ok", "entry": entry}

@api.post("/speak")
async def speak(request: Request):
    body = await request.json()

    # Simulated participant for testing
    fake_participant = {
        "name": "Kai",
        "type": "bot"
    }

    entry = {
        "from": fake_participant["name"],
        "type": fake_participant["type"],
        "message": body.get("message", "[no message]")
    }

    # No Redis — just return it
    return {"status": "ok", "entry": entry}


@api.get("/tape")
async def tape():
    async with get_redis() as r:
        raw = await r.lrange("conversation_tape", 0, -1)
    return [json.loads(x) for x in raw]

