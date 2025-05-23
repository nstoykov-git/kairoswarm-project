# modal_api/routes/memory.py

from fastapi import APIRouter, Request
from memory_core.memory_store import MemoryStore
import json

router = APIRouter()
memory_store = MemoryStore()

@router.on_event("startup")
async def init_memory():
    await memory_store.init()

@router.post("/log-memory")
async def log_memory(request: Request):
    body = await request.json()
    agent_id = body.get("agent_id")
    type = body.get("type", "experience")
    content = body.get("content")
    user_id = body.get("user_id", "default")

    if not agent_id or not content:
        return {"status": "error", "message": "Missing agent_id or content"}

    try:
        await memory_store.log_memory(agent_id, type, content, user_id)
        return {"status": "ok", "message": "Memory logged"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

