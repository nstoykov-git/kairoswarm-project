from modal import App, fastapi_endpoint, Secret, Image
from fastapi import Request
import redis.asyncio as redis
import uuid
import json
import os

app = App(
    name="kairoswarm-serverless-api",
    image=Image.debian_slim().pip_install("redis", "fastapi[standard]"),
    secrets=[Secret.from_name("upstash-redis-url")]
)

def get_redis():
    return redis.from_url(os.environ["REDIS_URL"], decode_responses=True)

@app.function()
@fastapi_endpoint(method="POST")
async def join(request: Request):
    body = await request.json()
    participant_id = str(uuid.uuid4())

    async with get_redis() as r:
        await r.hset("participants", participant_id, json.dumps({
            "id": participant_id,
            "name": body["name"],
            "type": body["type"],
            "metadata": body.get("metadata", {})
        }))

    return {"participant_id": participant_id}

@app.function()
@fastapi_endpoint(method="POST")
async def speak(request: Request):
    body = await request.json()
    participant_id = body["participant_id"]
    message = body["message"]

    async with get_redis() as r:
        participant_data = await r.hget("participants", participant_id)
        if not participant_data:
            return {"error": "Participant not found."}

        participant = json.loads(participant_data)
        entry = {
            "from": participant["name"],
            "type": participant["type"],
            "message": message,
        }
        await r.rpush("conversation_tape", json.dumps(entry))

    return {"status": "ok", "entry": entry}

@app.function()
@fastapi_endpoint(method="GET")
async def tape():
    async with get_redis() as r:
        tape = await r.lrange("conversation_tape", 0, -1)
        return [json.loads(entry) for entry in tape]