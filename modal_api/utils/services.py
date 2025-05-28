# modal_api/utils/secrets.py
import os
import redis.asyncio as redis
from supabase import Client, create_client

# --- Redis Factory ---
def get_redis():
    url = os.environ["REDIS_URL"]
    return redis.from_url(url, decode_responses=True)

# --- Supabase Factory ---
def get_supabase() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)

