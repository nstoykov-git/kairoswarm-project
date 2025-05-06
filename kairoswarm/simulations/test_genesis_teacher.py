# kairoswarm/simulations/test_genesis_teacher.py

from kairoswarm.agents.genesis_teacher_agent import GenesisTeacherAgent
from kairoswarm.environment.semantic_vector import SemanticVector

def run_teacher_experiment():
    print("🌱 Launching Teacher Pulse Experiment...")

    # Create the first parent agent
    parent = GenesisTeacherAgent(name="Kai_Teacher", curiosity=0.05)

    all_agents = [parent]
    generations = 3  # How many times to create children

    for gen in range(generations):
        print(f"\n🌀 Generation {gen+1}")
        new_agents = []
        for agent in all_agents:
            # Feed some experiences
            for i in range(5):
                vec = SemanticVector(dominant_dims=agent.dominant_dims, noise_scale=0.02 * i)
                msg = {"vector": vec}
                agent.receive(msg)
            agent.act()

            # Try creating a child
            child = agent.create_child()
            if child:
                new_agents.append(child)

        all_agents.extend(new_agents)

    print("\n🌳 Final Lineage:")
    for agent in all_agents:
        print(f"{agent.name}: lineage {agent.lineage}")

if __name__ == "__main__":
    run_teacher_experiment()

