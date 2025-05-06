from agents.amplifier_agent import AmplifierAgent
from environment.semantic_vector import SemanticVector

def test_amplification():
    agent = AmplifierAgent("Agent_Amplify", curiosity=0.05)

    for i in range(10):
        vec = SemanticVector(dominant_dims=[0,1,2], noise_scale=0.01 + 0.01 * i)
        agent.receive(vec)

if __name__ == "__main__":
    test_amplification()
