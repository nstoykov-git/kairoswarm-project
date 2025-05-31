from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from modal_api.utils.services import get_supabase
from datetime import datetime
import uuid
import asyncpg
import os

router = APIRouter()

# --- Create Swarm ---

class CreateSwarmRequest(BaseModel):
    name: str
    creator_id: str

@router.post("/create")
async def create_swarm(payload: CreateSwarmRequest):
    try:
        supabase = get_supabase()
        swarm_id = str(uuid.uuid4())

        result = supabase.from_("swarms").insert({
            "id": swarm_id,
            "name": payload.name,
            "creator_id": payload.creator_id,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        if result.error:
            raise HTTPException(status_code=400, detail=result.error.message)

        return {"id": swarm_id, "status": "created"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- Get Swarms by User ---

@router.get("/user-swarms")
async def get_swarms(request: Request):
    user_id = request.query_params.get("user_id")

    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")

    try:
        pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
        async with pool.acquire() as conn:
            rows = await conn.fetch("""
                SELECT id, name, created_at
                FROM swarms
                WHERE creator_id = $1
                ORDER BY created_at DESC
            """, user_id)

            swarms = [dict(row) for row in rows]
            return {"status": "ok", "swarms": swarms}

    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- DELETE Swarm ---

@router.delete("/{swarm_id}")
async def delete_swarm(swarm_id: str):
    try:
        supabase = get_supabase()
        result = supabase.from_("swarms").delete().eq("id", swarm_id).execute()

        if result.error:
            raise HTTPException(status_code=400, detail=result.error.message)

        return {"status": "deleted", "id": swarm_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- JOIN Swarm ---

class JoinSwarmRequest(BaseModel):
    swarm_id: str
    user_id: str
    name: str

@router.post("/join")
async def join_swarm(payload: JoinSwarmRequest):
    try:
        supabase = get_supabase()
        participant_id = str(uuid.uuid4())

        result = supabase.from_("participants").insert({
            "id": participant_id,
            "swarm_id": payload.swarm_id,
            "user_id": payload.user_id,
            "name": payload.name,
            "joined_at": datetime.utcnow().isoformat()
        }).execute()

        if result.error:
            raise HTTPException(status_code=400, detail=result.error.message)

        return {
            "status": "joined",
            "swarm_id": payload.swarm_id,
            "participant_id": participant_id
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- GET Participants of a Swarm ---

@router.get("/{swarm_id}/participants")
async def get_participants(swarm_id: str):
    try:
        supabase = get_supabase()
        result = supabase.from_("participants").select("*").eq("swarm_id", swarm_id).execute()

        if result.error:
            raise HTTPException(status_code=400, detail=result.error.message)

        return {"participants": result.data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    