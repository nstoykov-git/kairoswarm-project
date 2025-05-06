# simulations/test_swarm.py

from kairoswarm.environment.swarm_graph import SwarmGraph
from kairoswarm.environment.agent_node import AgentNode
import random

def basic_behavior(inbox):
    """
    Simple behavior function: respond to the first message received.
    """
    msg = inbox[0]["content"] if inbox else "No input."
    return {
        "sender": inbox[0]["sender"] if inbox else "Agent",
        "content": f"I received: '{msg}' and I'm thinking about it.",
        "mentions": []
    }

def build_test_swarm(size=10):
    swarm = SwarmGraph()
    agent_names = []

    for i in range(size):
        name = f"Agent_{i:02d}"
        agent = AgentNode(name, behavior_fn=basic_behavior)
        swarm.add_agent(agent)
        agent_names.append(name)

    # Randomly create unidirectional follow links
    for agent in swarm.agents.values():
        others = [n for n in agent_names if n != agent.name]
        follows = random.sample(others, k=3)
        for target in follows:
            swarm.connect(agent.name, target)

    return swarm

def run_genesis_pulse():
    print("🚀 Running Genesis Pulse...")

    swarm = build_test_swarm(size=10)

    # Inject a pulse into the first agent
    origin = swarm.agents["Agent_00"]
    message = origin.post("The world has changed. Cooperation is the new game.")
    swarm.broadcast(origin.name, message)

    # Run 3 ticks of the swarm
    for tick in range(3):
        print(f"\n🕒 Tick {tick + 1}")
        messages = swarm.step()

        if not messages:
            print("No new messages.")
        for msg in messages:
            print(f"{msg['sender']} ➜ {msg['content']}")

if __name__ == "__main__":
    run_genesis_pulse()
# Test swarm dynamics and messaging
