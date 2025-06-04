from fastapi import APIRouter, Request
from kairoswarm_core.memory_core.memory_store import MemoryStore
from openai import AsyncOpenAI
from typing import Optional
import os

router = APIRouter()

@router.post("/log-memory")
async def log_memory(request: Request):
    body = await request.json()
    user_id = body.get("user_id", "00000000-0000-0000-0000-000000000000")
    agent_id = body.get("agent_id")
    content = body.get("message")  # "message" for backward compatibility
    type = body.get("type", "experience")
    tags = body.get("tags")
    relevance = body.get("relevance", 1.0)
    expires_at = body.get("expires_at")

    if not agent_id or not content:
        return {"status": "error", "message": "Missing 'agent_id' or 'message'"}

    try:
        client = AsyncOpenAI()
        embedding_response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=content
        )
        embedding = embedding_response.data[0].embedding

        store = MemoryStore()
        await store.init()

        await store.log_memory(
            agent_id=agent_id,
            type=type,
            content=content,
            user_id=user_id,
            embedding=embedding,
            tags=tags,
            relevance=relevance,
            expires_at=expires_at
        )

        return {"status": "ok", "message": "Memory logged"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/get-memories")
async def get_memories(request: Request):
    agent_id = request.query_params.get("agent_id")
    user_id = request.query_params.get("user_id", "00000000-0000-0000-0000-000000000000")
    query = request.query_params.get("query")
    type = request.query_params.get("type")
    tags = request.query_params.get("tags")  # comma-separated
    limit = int(request.query_params.get("limit", 10))

    if not agent_id:
        return {"status": "error", "message": "Missing 'agent_id'"}

    try:
        store = MemoryStore()
        await store.init()

        if query:
            client = AsyncOpenAI()
            embedding_response = await client.embeddings.create(
                model="text-embedding-3-small",
                input=query
            )
            query_embedding = embedding_response.data[0].embedding

            memories = await store.search_memories(
                agent_id=agent_id,
                user_id=user_id,
                embedding=query_embedding,
                limit=limit
            )
        else:
            parsed_tags = tags.split(",") if tags else None
            memories = await store.get_memories(
                agent_id=agent_id,
                user_id=user_id,
                type=type,
                tags=parsed_tags,
                limit=limit
            )

        return {"status": "ok", "memories": memories}
    except Exception as e:
        return {"status": "error", "message": str(e)}
