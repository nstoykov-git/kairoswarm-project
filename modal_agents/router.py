from modal import App, asgi_app
import random
import asyncio

from agents import Kai, Nova

app = App()

# Define agent list here
# Foundation model for agents: gpt-4o-mini (explicitly chosen for balanced reasoning and cost)
AGENTS = [Kai(model="gpt-4o-mini"), Nova(model="gpt-4o-mini")]

@app.function()
async def route_turn(context: str) -> str:
    """
    Determines which agent wants to speak most based on their internal urgency.
    Returns that agent's response.
    """
    scores = [(agent, agent.wants_to_speak(context)) for agent in AGENTS]
    speaker, score = max(scores, key=lambda x: x[1])
    response = await speaker.respond(context)
    return f"{speaker.name}: {response}"

# Optional: expose as ASGI app if needed for web preview
@app.asgi()
def dummy_server():
    async def app(scope, receive, send):
        if scope["type"] == "http":
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [(b"content-type", b"text/plain")],
            })
            await send({
                "type": "http.response.body",
                "body": b"Kairoswarm agent router active.",
            })
    return app

