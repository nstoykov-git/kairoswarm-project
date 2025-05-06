# kairoswarm/simulations/test_genesis_agent.py

from kairoswarm.agents import GenesisAgent
from kairoswarm.environment.semantic_vector import SemanticVector

def run_genesis_experiment():
    print("🌱 Launching Genesis Experiment...")

    parent = GenesisAgent(name="Kai", curiosity=0.05)

    print(f"🧠 {parent.name} is gathering experiences...")
    for i in range(10):
        vec = SemanticVector(dominant_dims=[0, 1, 2], noise_scale=0.02 * i)
        msg = {"vector": vec}
        parent.receive(msg)

    # << THIS is where we need to add parent.act() >>
    parent.act()   # <-- NEW! process inbox into experience

    child = parent.create_child()

    if child:
        print(f"👶 {child.name} has been born!")
        print(f"Child curiosity: {child.curiosity}")
    else:
        print("⚠️ No child could be created yet (not enough experience).")

if __name__ == "__main__":
    run_genesis_experiment()
