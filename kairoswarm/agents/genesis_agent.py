# kairoswarm/agents/genesis_agent.py

from kairoswarm.environment.agent_node import AgentNode
from kairoswarm.environment.semantic_vector import SemanticVector
import uuid
import numpy as np

class GenesisAgent(AgentNode):
    def __init__(self, name, curiosity=0.05, memory_limit=10):
        super().__init__(name=name, behavior_fn=self.think)
        self.curiosity = curiosity
        self.memory_limit = memory_limit
        self.experience = []  # stores received messages/vectors

    def think(self, inbox):
        if inbox:
            for msg in inbox:
                self.experience.append(msg)
                if len(self.experience) > self.memory_limit:
                    self.experience.pop(0)

        return {
            "sender": self.name,
            "message": f"I am learning. I have {len(self.experience)} experiences."
        }

    def compress_experience(self):
        """
        Creates a compressed 'knowledge packet' by averaging all semantic vectors.
        (Simple compression for now — can evolve)
        """
        if not self.experience:
            return None
        
        print(f"🔍 Compressing experience. Experience contents:")
        for msg in self.experience:
            print(msg)


        vectors = [msg["vector"].vector for msg in self.experience if "vector" in msg]
        if not vectors:
            return None

        compressed = np.mean(vectors, axis=0)
        return {
            "origin": self.name,
            "compressed_vector": compressed,
            "curiosity": self.curiosity,
        }

    def create_child(self):
        """
        Spawns a new agent with inherited compressed vector and curiosity.
        """
        knowledge = self.compress_experience()
        if not knowledge:
            return None

        child_name = f"{self.name}_child_{uuid.uuid4().hex[:4]}"
        child = GenesisAgent(name=child_name, curiosity=knowledge["curiosity"])
        print(f"🍼 {self.name} has created {child_name} with inherited curiosity.")

        return child

