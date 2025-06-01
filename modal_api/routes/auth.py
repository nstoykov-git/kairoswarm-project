from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from modal_api.utils.services import get_supabase

router = APIRouter()

class AuthRequest(BaseModel):
    email: str
    password: str
    display_name: str

@router.post("/signup")
async def signup(auth: AuthRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({
            "email": auth.email,
            "password": auth.password
        })

        # Handle successful user creation
        if result.user:
            user_id = result.user.id
            email = result.user.email

            # Insert user into our own users table
            supabase.from_("users").insert({
                "id": user_id,
                "email": email,
                "display_name": auth.display_name
            }).execute()

            return {
                "status": "pending",
                "message": "Confirmation email sent. Please verify to complete signup.",
                "user_id": user_id,
                "email": email
            }

        raise HTTPException(status_code=400, detail="Signup failed")

    except Exception as e:
        print("Internal signup error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signup")

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
            "email": result.session.user.email,
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token
        }


    except Exception as e:
        print("Internal signin error:", e)
        raise HTTPException(status_code=500, detail="Unexpected error during signin")
