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
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({
            "email": auth.email,
            "password": auth.password
        })

        # Access using attributes directly
        if not result.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        return {"user_id": result.user.id}

    except Exception as e:
        print("Internal signup error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signup")

@router.post("/auth/signup")
async def signup(auth: AuthRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({
            "email": auth.email,
            "password": auth.password
        })

        # Access using attributes directly
        if not result.user:
            raise HTTPException(status_code=400, detail="Signup failed")

        return {"user_id": result.user.id}

    except Exception as e:
        print("Internal signup error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signup")
