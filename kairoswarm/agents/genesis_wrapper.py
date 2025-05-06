# kairoswarm/agents/genesis_wrapper.py

import openai
import numpy as np

class GenesisAgentWrapper:
    def __init__(self, assistant_id, memory=None):
        self.assistant_id = assistant_id
        self.memory = memory or []
    
    def add_experience(self, message):
        """Store incoming experience."""
        self.memory.append(message)
        
    def modify_instructions(self, new_instructions):
        """Self-modify the assistant's system instructions."""
        response = openai.beta.assistants.update(
            assistant_id=self.assistant_id,
            instructions=new_instructions
        )
        print(f"🔄 Updated instructions for Assistant {self.assistant_id}.")
        return response

    def get_brainstorm(self, prompt):
        """Simple method to generate a response using the assistant."""
        thread = openai.beta.threads.create()
        openai.beta.threads.messages.create(
            thread_id=thread.id,
            role="user",
            content=prompt
        )
        run = openai.beta.threads.runs.create(
            thread_id=thread.id,
            assistant_id=self.assistant_id
        )
        return run

    def evaluate_identity_shift(self, cultural_templates, embedding_model):
        """
        Analyze memory and determine if a different role matches better.
        
        Args:
            cultural_templates (list): List of role templates with instructions.
            embedding_model (object): Embedding generator (e.g., OpenAI or local).
        """
        combined_memory = " ".join(self.memory[-10:])  # Last 10 experiences
        memory_embedding = embedding_model.encode(combined_memory)
        
        scores = []
        for template in cultural_templates:
            template_embedding = embedding_model.encode(template["instructions"])
            score = self.cosine_similarity(memory_embedding, template_embedding)
            scores.append((template["name"], score, template["instructions"]))
        
        best_match = max(scores, key=lambda x: x[1])
        
        if best_match[1] > 0.8:  # Threshold for role change
            print(f"🔍 Identity shift recommended: {best_match[0]} (score {best_match[1]:.2f})")
            self.modify_instructions(best_match[2])
        else:
            print("🧠 Current role remains best fit.")

    @staticmethod
    def cosine_similarity(vec1, vec2):
        """Compute cosine similarity between two vectors."""
        return np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
