# kairoswarm/environment/embedding_client.py

import openai

class EmbeddingClient:
    def __init__(self, model="text-embedding-ada-002"):
        self.model = model

    def encode(self, text):
        """Generate an embedding vector from a text string."""
        response = openai.embeddings.create(
            input=[text],
            model=self.model
        )
        return response.data[0].embedding
