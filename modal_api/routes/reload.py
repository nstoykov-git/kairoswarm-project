# modal_api/routes/reload.py

from fastapi import APIRouter, Request
from modal_api.agents.hot_swap import reload_agent  # This assumes you stored the function here
import json

router = APIRouter()

@router.post("/reload-agent")
async def reload_agent_endpoint(request: Request):
    body = await request.json()
    sid = body.get("swarm_id", "default")
    agent_id = body.get("agent_id")

    if not agent_id:
        return {"status": "error", "message": "Missing agent_id"}

    try:
        result = await reload_agent(sid, agent_id)
        return {"status": "ok", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}

