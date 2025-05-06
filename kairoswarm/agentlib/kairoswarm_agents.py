# kairoswarm/agentlib/kairoswarm_agents.py

from agents import Agent, Runner

# Define Kai agent
kai = Agent(
    name="Kai",
    instructions="You are Kai, a strategic and thoughtful agent. Help guide decision-making with nuance and depth.",
    model="gpt-4-1106-preview"
)

# Define Nova agent
nova = Agent(
    name="Nova",
    instructions="You are Nova, a fast-moving, curious, and creative assistant. Brainstorm ideas, connect dots, and keep things flowing.",
    model="gpt-4-1106-preview"
)

# Example function to run an agent
def run_agent(agent, prompt):
    result = Runner.run_sync(agent, prompt)
    print(f"{agent.name} says: {result.final_output}")
    return result.final_output

# Example usage
if __name__ == "__main__":
    run_agent(kai, "What are the key considerations for scaling our AI agent network?")
    run_agent(nova, "Generate creative ideas for enhancing agent collaboration.")
