from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import secrets

from modal_api.utils.services import get_supabase

router = APIRouter()

class AutoRegisterRequest(BaseModel):
    email: str
    password: str | None = None
    metadata: dict | None = None  # optional agent_id, name, etc.

@router.post("/autoregister")
async def autoregister(req: AutoRegisterRequest):
    supabase = get_supabase()
    password = req.password or secrets.token_urlsafe(16)

    try:
        response = supabase.auth.sign_up({
            "email": req.email,
            "password": password
        })

        if response.error:
            raise HTTPException(status_code=400, detail=response.error.message)

        # Optional: Add metadata to user table if you track agents separately
        return {
            "user_id": response.user.id,
            "email": req.email,
            "message": "Agent registered successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

