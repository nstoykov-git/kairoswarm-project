# kairoswarm/agents/genesis_teacher_agent.py

import numpy as np
import random
import uuid

from kairoswarm.environment.agent_node import AgentNode
from kairoswarm.environment.semantic_vector import SemanticVector

class GenesisTeacherAgent(AgentNode):
    def __init__(self, name, curiosity=0.05, memory_limit=10, dominant_dims=None, lineage=None):
        super().__init__(name=name, behavior_fn=self.think)
        self.curiosity = curiosity
        self.memory_limit = memory_limit
        self.experience = []
        self.dominant_dims = dominant_dims or [0, 1, 2]
        self.lineage = lineage or []  # list of ancestor names

    def think(self, inbox):
        if inbox:
            for msg in inbox:
                self.experience.append(msg)
                if len(self.experience) > self.memory_limit:
                    self.experience.pop(0)

        return {
            "sender": self.name,
            "message": f"I have {len(self.experience)} experiences and dominant dims {self.dominant_dims}."
        }

    def compress_experience(self):
        if not self.experience:
            return None

        vectors = [msg["vector"].vector for msg in self.experience if "vector" in msg]
        if not vectors:
            return None

        compressed = np.mean(vectors, axis=0)
        return {
            "origin": self.name,
            "compressed_vector": compressed,
            "curiosity": self.curiosity,
            "dominant_dims": self.dominant_dims,
            "lineage": self.lineage + [self.name]  # Add self to lineage history
        }

    def create_child(self, rotation_strength: int=1):
        knowledge = self.compress_experience()
        if not knowledge:
            return None

        new_curiosity = knowledge["curiosity"] + random.uniform(-0.01, 0.01)
        new_curiosity = max(0.01, min(new_curiosity, 1.0))

        new_dims = self.rotate_dimensions(knowledge["dominant_dims"], rotation_strength)

        child_name = f"{self.name}_child_{uuid.uuid4().hex[:4]}"
        child = GenesisTeacherAgent(
            name=child_name,
            curiosity=new_curiosity,
            dominant_dims=new_dims,
            lineage=knowledge["lineage"]
        )
        print(f"🍼 {self.name} has created {child_name} with curiosity {new_curiosity:.4f} and dims {new_dims}")

        return child

    def rotate_dimensions(self, dims, strength: int):
        rotated = []
        for d in dims:
            shift = random.choice([-1, 0, 1]) * strength
            rotated_dim = max(0, d + shift)
            rotated.append(rotated_dim)
        return rotated

