# agents/amplifier_agent.py

from kairoswarm.environment.semantic_vector import SemanticVector

class AmplifierAgent:
    def __init__(self, name, curiosity=0.05, dim=128, manifold_dims=None):
        self.name = name
        self.curiosity = curiosity
        self.manifold_dims = manifold_dims or [0, 1, 2]
        self.inbox = []

    def receive(self, semantic_vector: SemanticVector):
        normal_energy = semantic_vector.get_normal_energy(self.manifold_dims)

        if normal_energy > self.curiosity:
            print(f"🔍 {self.name} is amplifying! Normal energy = {normal_energy:.4f}")
            return True  # Amplify
        else:
            print(f"💤 {self.name} ignored safe signal. Normal energy = {normal_energy:.4f}")
            return False  # Ignore

