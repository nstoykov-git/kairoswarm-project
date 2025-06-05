import logging
import json
import uuid
from datetime import datetime

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

    try:
        async with get_redis() as redis:
            tape_key = f"{swarm_id}:conversation_tape"
            initial_entry = {
                "from": "system",
                "type": "system",
                "message": f"Swarm '{payload.name}' created.",
                "timestamp": datetime.utcnow().isoformat()
            }
            await redis.rpush(tape_key, json.dumps(initial_entry))

        return {"id": swarm_id, "status": "created"}

    except Exception as e:
        logging.exception("Failed to create ephemeral swarm")
        raise HTTPException(status_code=500, detail=f"Ephemeral swarm creation failed: {str(e)}")


# --- Join Ephemeral Swarm ---

@router.post("/join")
async def join_ephemeral_swarm(request: Request):
    try:
        body = await request.json()
        swarm_id = body.get("swarm_id", "default")
        name = body.get("name", "Anonymous")
        participant_id = str(uuid.uuid4())

        async with get_redis() as r:
            await r.hset(f"{swarm_id}:participants", participant_id, json.dumps({
                "id": participant_id,
                "name": name,
                "type": "human",
                "joined_at": datetime.utcnow().isoformat()
            }))
            await r.hset(f"{swarm_id}:participant:{participant_id}", mapping={
                "id": participant_id,
                "name": name,
                "type": "human",
                "joined_at": datetime.utcnow().isoformat()
            })

        logging.info("✅ Ephemeral participant joined: %s", participant_id)

        return JSONResponse({
            "status": "joined",
            "swarm_id": swarm_id,
            "participant_id": participant_id
        })

    except Exception as e:
        logging.exception("❌ Failed to join ephemeral swarm")
        return JSONResponse(
            status_code=500,
            content={"error": f"Ephemeral swarm join failed: {str(e)}"}
        )
    