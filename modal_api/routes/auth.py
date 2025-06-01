from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from modal_api.utils.services import get_supabase

router = APIRouter()

class SignUpRequest(BaseModel):
    email: str
    password: str
    display_name: str

@router.post("/signup")
async def signup(payload: SignUpRequest):
    supabase = get_supabase()
    try:
        # 1. Sign up with Supabase Auth
        auth_response = supabase.auth.sign_up({
            "email": payload.email,
            "password": payload.password
        })

        user = auth_response.user
        if not user:
            raise HTTPException(status_code=400, detail="Signup failed: no user returned")

        # 2. Insert into `users` table with display name
        result = supabase.from_("users").insert({
            "id": user.id,
            "email": payload.email,
            "display_name": payload.display_name
        }).execute()

        return {"status": "success", "user_id": user.id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

class AuthRequest(BaseModel):
    email: str
    password: str

@router.post("/signin")
async def signin(auth: AuthRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({
            "email": auth.email,
            "password": auth.password
        })

        if not result or not result.session or not result.session.user:
            raise HTTPException(status_code=401, detail="Invalid credentials")

        return {
            "user_id": result.session.user.id,
            "email": result.session.user.email
        }

    except Exception as e:
        print("Internal signin error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signin")
