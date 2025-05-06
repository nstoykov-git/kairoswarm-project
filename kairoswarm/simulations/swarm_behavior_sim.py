import numpy as np
import matplotlib.pyplot as plt

# Parameters
NUM_AGENTS = 50
FIELD_SIZE = (100, 100)
STEPS = 100

def generate_gradient_field(shape):
    """Simulates a morphogen-like gradient across a 2D field."""
    x = np.linspace(0, 1, shape[1])
    y = np.linspace(0, 1, shape[0])
    xv, yv = np.meshgrid(x, y)
    return np.sin(2 * np.pi * xv) * np.cos(2 * np.pi * yv)

# Agent definition
class Agent:
    def __init__(self, idx, x, y):
        self.id = idx
        self.pos = np.array([x, y], dtype=float)
        self.path = [self.pos.copy()]

    def sense(self, field):
        x, y = int(self.pos[0]), int(self.pos[1])
        if 0 <= x < field.shape[1] and 0 <= y < field.shape[0]:
            return field[y, x]
        return 0.0

    def move(self, field):
        # Sample neighbors to detect gradient direction
        delta = 1.0
        directions = [np.array([1,0]), np.array([-1,0]), np.array([0,1]), np.array([0,-1])]
        best_dir = np.array([0.0, 0.0])
        best_val = self.sense(field)

        for d in directions:
            new_pos = self.pos + d * delta
            val = Agent(0, *new_pos).sense(field)
            if val > best_val:
                best_val = val
                best_dir = d

        # Move in direction of increasing gradient (simple chemotaxis)
        self.pos += best_dir
        self.pos = np.clip(self.pos, 0, FIELD_SIZE[0]-1)
        self.path.append(self.pos.copy())

# Initialize
field = generate_gradient_field(FIELD_SIZE)
agents = [Agent(i, np.random.randint(0, FIELD_SIZE[0]), np.random.randint(0, FIELD_SIZE[1])) for i in range(NUM_AGENTS)]

# Simulate
for step in range(STEPS):
    for agent in agents:
        agent.move(field)

# Plot
plt.figure(figsize=(8, 8))
plt.imshow(field, cmap='viridis', origin='lower')
for agent in agents:
    path = np.array(agent.path)
    plt.plot(path[:, 0], path[:, 1], alpha=0.6)
plt.title("Agent Swarm Following Gradient")
plt.xlabel("X")
plt.ylabel("Y")
plt.show()