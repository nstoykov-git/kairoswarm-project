from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
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
            supabase.from_("users").upsert({
                "id": user_id,
                "email": email,
                "display_name": auth.display_name
            }, on_conflict="id").execute()


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


# --- Session ---

@router.get("/session")
async def get_session(request: Request):
    try:
        supabase = get_supabase()
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing or invalid token")

        token = auth_header.split(" ")[1]
        user_response = supabase.auth.get_user(token)

        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired session")

        user = user_response.user
        return {
            "user_id": user.id,
            "email": user.email
        }

    except Exception as e:
        print("Session error:", e)
        raise HTTPException(status_code=500, detail="Session lookup failed")


# --- Sign Out ---

class SignOutRequest(BaseModel):
    access_token: str

@router.post("/signout")
async def signout(payload: SignOutRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_out(payload.access_token)
        return { "status": "signed_out" }
    except Exception as e:
        print("Signout error:", e)
        raise HTTPException(status_code=500, detail="Logout failed")


# --- Profile ---

@router.get("/profile")
async def get_profile(request: Request):
    # 1) grab bearer token
    auth_header = request.headers.get("Authorization") or ""
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = auth_header.split(" ", 1)[1]

    # 2) validate & decode it via Supabase
    supabase = get_supabase()
    user_resp = supabase.auth.get_user(token)
    if not user_resp or not user_resp.user:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    user = user_resp.user

    # 3) look up your own profile table for display_name
    profile_resp = (
        supabase
        .from_("users")
        .select("display_name")
        .eq("id", user.id)
        .single()
        .execute()
    )
    display_name = profile_resp.data.get("display_name") if profile_resp.data else None

    # 4) return everything in one shot
    return {
        "user_id":      user.id,
        "email":        user.email,
        "display_name": display_name,
    }
