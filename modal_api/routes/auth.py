from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from modal_api.utils.services import get_supabase

router = APIRouter()

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/auth/signup")
async def signup(auth: AuthRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({
            "email": auth.email,
            "password": auth.password
        })

        if not result.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        return {
            "user_id": result.user.id,
            "email": result.user.email
        }

    except Exception as e:
        print("Internal signup error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signup")

@router.post("/auth/signin")
async def signin(auth: AuthRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({
            "email": auth.email,
            "password": auth.password
        })

        if not result.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "user_id": result.user.id,
            "email": result.user.email
        }

    except Exception as e:
        print("Internal signin error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signin")
