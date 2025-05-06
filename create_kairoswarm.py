# create_kairoswarm.py

import os

# ✅ Updated folders (safe to rerun)
folders = [
    "kairoswarm/agents",
    "kairoswarm/environment",
    "kairoswarm/simulations",
    "kairoswarm/logs",
    "kairoswarm/visualization",
    "kairoswarm/tests",
    "kairoswarm/notebooks"
]

# ✅ Files to create if they don't already exist
files = {
    "kairoswarm/README.md": "# Kairoswarm\n\nA biologically inspired agent-based system exploring emergent behavior, swarm intelligence, and gradient coordination.\n\nBorn from the fusion of Kai and Kairos.\n",
    "kairoswarm/requirements.txt": "# Add your dependencies here\nopenai\n",
    
    # Agent logic
    "kairoswarm/agents/__init__.py": "",
    "kairoswarm/agents/base.py": "# Agent creation logic\n",
    "kairoswarm/agents/tools.py": "# function_tool definitions go here\n",
    "kairoswarm/agents/behaviors.py": "# Role-specific behavior logic\n",

    # Environment (graph & gradient fields)
    "kairoswarm/environment/__init__.py": "",
    "kairoswarm/environment/field.py": "# GradientField and environment simulation\n",
    "kairoswarm/environment/swarm_graph.py": "# Graph structure and routing logic\n",
    "kairoswarm/environment/agent_node.py": "# Lightweight agent communication layer\n",
    "kairoswarm/environment/metrics.py": "# Swarm-level divergence & clustering metrics\n",

    # Simulations
    "kairoswarm/simulations/__init__.py": "",
    "kairoswarm/simulations/main.py": "# Entrypoint for Kairoswarm simulation\n",
    "kairoswarm/simulations/test_swarm.py": "# Test swarm dynamics and messaging\n",

    # Logs
    "kairoswarm/logs/run_log.txt": "# Swarm run logs\n",

    # Visualization stubs
    "kairoswarm/visualization/swarm_plot.py": "# Visualization utilities (e.g. network graph)\n",

    # Tests
    "kairoswarm/tests/test_graph_topology.py": "# Unit tests for SwarmGraph topology\n",

    # Notebooks
    "kairoswarm/notebooks/README.md": "Place for exploratory swarm modeling notebooks.\n"
}

# ✅ Create folders
for folder in folders:
    os.makedirs(folder, exist_ok=True)

# ✅ Create files if they don't already exist
for path, content in files.items():
    if not os.path.exists(path):
        with open(path, "w") as f:
            f.write(content)
        print(f"📄 Created: {path}")
    else:
        print(f"✅ Exists:  {path}")

print("\n🌀 Kairoswarm structure is safely updated and ready.")
