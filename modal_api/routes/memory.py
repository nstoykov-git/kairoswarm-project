# modal_api/routes/memory.py

from fastapi import APIRouter, Request
from kairoswarm_core.memory_core.memory_store import MemoryStore
from openai import AsyncOpenAI
import asyncpg
import os

router = APIRouter()

@router.post("/log-memory")
async def log_memory(request: Request):
    store = MemoryStore()
    await store.init()

    body = await request.json()
    user_id = body.get("user_id", "default")
    agent_id = body.get("agent_id")
    message = body.get("message")
    type = body.get("type", "experience")

    if not agent_id or not message:
        return {"status": "error", "message": "Missing agent_id or message"}

    try:
        client = AsyncOpenAI()
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=message
        )
        embedding = response.data[0].embedding
        await store.log_memory(agent_id, type, message, user_id, embedding)
        return {"status": "ok", "message": "Memory logged with embedding"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@router.get("/get-memories")
async def get_memories(request: Request):
    store = MemoryStore()
    await store.init()

    agent_id = request.query_params.get("agent_id")
    user_id = request.query_params.get("user_id", "default")
    query = request.query_params.get("query")

    if not agent_id:
        return {"status": "error", "message": "Missing agent_id"}

    try:
        if query:
            client = AsyncOpenAI()
            response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=query
            )
            query_embedding = response.data[0].embedding

            pool = await asyncpg.create_pool(dsn=os.getenv("POSTGRES_URL"))
            async with pool.acquire() as conn:
                rows = await conn.fetch("""
                    SELECT id, type, content, created_at
                    FROM memories
                    WHERE agent_id = $1 AND user_id = $2
                    ORDER BY embedding <#> $3
                    LIMIT 10
                """, agent_id, user_id, query_embedding)
                memories = [dict(row) for row in rows]
        else:
            memories = await store.get_memories(agent_id, user_id)

        return {"status": "ok", "memories": memories}
    except Exception as e:
        return {"status": "error", "message": str(e)}
