# kairoswarm/modal_app.py

from modal import App, Image, Secret
from agentlib.kairoswarm_agents import kai, nova, run_agent

# Define the Modal app
app = App(name="kairoswarm-sim")

# Define image and secret
image = Image.debian_slim().pip_install(
    "openai",
    "openai-agents").env({
})

secrets = [Secret.from_name("openai-key")]
@app.function(image=image, secrets=secrets)
def run_kairoswarm_agent(agent_name: str, prompt: str):
    if agent_name.lower() == "kai":
        return run_agent(kai, prompt)
    elif agent_name.lower() == "nova":
        return run_agent(nova, prompt)
    else:
        raise ValueError(f"Unknown agent: {agent_name}")
