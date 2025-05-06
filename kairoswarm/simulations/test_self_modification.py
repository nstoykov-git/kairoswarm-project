# kairoswarm/simulations/test_self_modification.py

from kairoswarm.agents.genesis_wrapper import GenesisAgentWrapper
from kairoswarm.environment.embedding_client import EmbeddingClient

# Mock cultural templates
cultural_templates = [
    {
        "name": "Travel Concierge",
        "instructions": "You are a travel assistant who helps book flights, hotels, and adventures."
    },
    {
        "name": "Health Navigator",
        "instructions": "You are a health agent who finds clinics, schedules appointments, and supports wellness."
    }
]

# Assume you have already created an Assistant manually on OpenAI
# and you know its Assistant ID
agent = GenesisAgentWrapper(assistant_id="asst_PXPchDdPn8dwQLAvhiAuzBQB")

# Fake experience feed
agent.add_experience("I need to find a hotel in Miami for next weekend.")
agent.add_experience("What's the best way to get a flight to New York?")
agent.add_experience("Any good restaurants near the airport?")
agent.add_experience("Can you recommend activities for a trip to Hawaii?")
agent.add_experience("Book me a hotel with a pool, please!")

# Embedder
embedder = EmbeddingClient()

# Run the evaluation
agent.evaluate_identity_shift(cultural_templates, embedder)

