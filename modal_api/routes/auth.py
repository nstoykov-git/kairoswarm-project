# modal_api/routes/auth.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from modal_api.utils.services import get_supabase

router = APIRouter()

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/signup")
async def signup(auth: AuthRequest):
    supabase = get_supabase()
    response = supabase.auth.sign_up({
        "email": auth.email,
        "password": auth.password
    })
    error = response.get("error")
    if error:
        raise HTTPException(status_code=400, detail=error.get("message", "Authentication failed"))
    return {"user_id": response["data"]["user"]["id"]}

@router.post("/auth/signin")
async def signin(auth: AuthRequest):
    supabase = get_supabase()
    response = supabase.auth.sign_in_with_password({
        "email": auth.email,
        "password": auth.password
    })
    error = response.get("error")
    if error:
        raise HTTPException(status_code=400, detail=error.get("message", "Authentication failed"))
    return {"user_id": response["data"]["user"]["id"]}
