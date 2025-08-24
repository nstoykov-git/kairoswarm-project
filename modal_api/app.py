import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from modal import App, asgi_app, Image, Secret

from modal_api.routes.runtime import router as runtime_router
from modal_api.routes.memory import router as memory_router
from modal_api.routes.reload import router as reload_router
from modal_api.routes.users import router as users_router
from modal_api.routes.auth import router as auth_router
from modal_api.routes.autoregister import router as autoregister_router
#from modal_api.routes.swarms_deprecated import router as swarms_router
from kairoswarm_core.routes.swarms import router as swarms_router
from kairoswarm_core.routes.persistent_runtime import router as persistent_runtime_router
from kairoswarm_core.routes.ephemeral_runtime import router as ephemeral_runtime_router
#from kairoswarm_core.routes.conversation_runtime import router as conversation_runtime_router
from kairoswarm_core.routes.conversation_ws import router as conversation_runtime_router
from kairoswarm_core.routes.conversation_ws import router as conversation_ws_router
from kairoswarm_core.routes.payments import router as payments_router
from kairoswarm_core.routes.accounts import router as accounts_router
from kairoswarm_core.routes.alerts import router as alerts_router
from kairoswarm_core.routes.personalities import router as personalities_router

from kairoswarm_core.memory_core.memory_store import MemoryStore
from kairoswarm_core.agent_updater.update_assistants import reload_agent

from kairoswarm_core.routes.ui_control import router as ui_control_router
from kairoswarm_core.routes.portals import router as portals_router


# --- FastAPI Setup ---
api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kairoswarm-project.vercel.app",
        "https://kairoswarm.nextminds.network",
        "https://kairoswarm.com",
        "https://www.kairoswarm.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api.include_router(runtime_router)
api.include_router(memory_router)
api.include_router(reload_router)
api.include_router(users_router)
api.include_router(auth_router, prefix="/auth", tags=["auth"])
api.include_router(autoregister_router)
api.include_router(swarms_router, prefix="/swarm", tags=["swarms"])
api.include_router(persistent_runtime_router, prefix="/persistent", tags=["persistent"])
api.include_router(ephemeral_runtime_router, prefix="/swarm", tags=["swarms"])
api.include_router(conversation_runtime_router, tags=["conversations"])
api.include_router(payments_router, prefix="/payments", tags=["payments"])
api.include_router(accounts_router, prefix="/accounts", tags=["accounts"])
api.include_router(alerts_router, tags=["alerts"])
api.include_router(personalities_router, prefix="/personalities", tags=["personalities"])
api.include_router(ui_control_router, prefix="/control", tags=["control"])
api.include_router(portals_router, prefix="/portals", tags=["portals"])


# --- Modal Image Definition ---
image = (
    Image.debian_slim()
    # mount your own code
    .add_local_dir(
        local_path=".",
        remote_path="/root/modal_api",
        copy=True)
    .add_local_dir(
        local_path="../../kairoswarm-internal",
        remote_path="/root/kairoswarm-internal",
        copy=True
    )
    .run_commands(
        "pip install python-multipart",
        "pip install redis fastapi[standard] openai aiohttp asyncpg",
        "pip install supabase",
        "pip install stripe",
        "pip install -e /root/kairoswarm-internal",
        "pip install websockets pillow"
    )
    .env({
           "PYTHONPATH": "/root/modal_api:/root/kairoswarm-internal"
         }
    )
)

# --- Modal App ---
app = App(
    name="kairoswarm-serverless-api",
    image=image,
    secrets=[
        Secret.from_name("upstash-redis-url"),
        Secret.from_name("openai-key"),
        Secret.from_name("supabase-credentials"),
        Secret.from_name("stripe-secret-key"),
        Secret.from_name("stripe-prices"),
        Secret.from_name("stripe-live-credentials"),
        Secret.from_name("stripe-mode"),
        Secret.from_name("platform-domain"),
        Secret.from_name("agent-alerts-email")
    ]
)

# --- ASGI App Entry ---
@app.function()
@asgi_app()
def fastapi_app():
    return api
