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
from modal_api.routes.swarms import router as swarms_router
from kairoswarm_core.routes.persistent_runtime import router as persistent_runtime_router
from kairoswarm_core.routes.ephemeral_runtime import router as ephemeral_runtime_router
from kairoswarm_core.routes.payments import router as payments_router
from kairoswarm_core.routes.personalities import router as personalities_router

from kairoswarm_core.memory_core.memory_store import MemoryStore
from kairoswarm_core.agent_updater.update_assistants import reload_agent


# --- FastAPI Setup ---
api = FastAPI()
api.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kairoswarm-project.vercel.app",
        "https://kairoswarm.nextminds.network",
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
api.include_router(payments_router, prefix="/payments", tags=["payments"])
api.include_router(personalities_router, prefix="/personalities", tags=["personalities"])


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
        "pip install redis fastapi[standard] openai aiohttp asyncpg",
        "pip install supabase",
        "pip install stripe",
        "pip install -e /root/kairoswarm-internal"
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
        Secret.from_name("stripe-secret-key"),\
        Secret.from_name("stripe-prices")
    ]
)

# --- ASGI App Entry ---
@app.function()
@asgi_app()
def fastapi_app():
    return api
