# modal_api/utils/secrets.py
import os
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Request
import logging
import openai
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

# --- Embedding Factory ---
class EmbeddingRequest(BaseModel):
    text: str

async def generate_embedding(payload: EmbeddingRequest):
    try:
        if not payload.text.strip():
            raise HTTPException(status_code=400, detail="Input text cannot be empty.")

        response = openai.embeddings.create(
            input=payload.text.strip(),
            model="text-embedding-3-small"
        )

        embedding = response.data[0].embedding
        return {"embedding": embedding}

    except Exception as e:
        logging.exception("❌ Failed to generate embedding")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")
