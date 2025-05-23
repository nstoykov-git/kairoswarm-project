# modal_api/routes/users.py

from fastapi import APIRouter, Request
import asyncpg, os
from datetime import datetime

router = APIRouter()
DB_URL = os.getenv("POSTGRES_URL")

@router.post("/register-user")
async def register_user(request: Request):
    body = await request.json()
    email = body.get("email")

    if not email:
        return {"status": "error", "message": "Email is required"}

    try:
        pool = await asyncpg.create_pool(dsn=DB_URL)
        async with pool.acquire() as conn:
            result = await conn.fetchrow("""
                INSERT INTO users (email)
                VALUES ($1)
                ON CONFLICT (email) DO NOTHING
                RETURNING id
            """, email)
            if result:
                return {"status": "ok", "user_id": str(result["id"])}
            else:
                existing = await conn.fetchrow("SELECT id FROM users WHERE email = $1", email)
                return {"status": "ok", "user_id": str(existing["id"])}
    except Exception as e:
        return {"status": "error", "message": str(e)}

