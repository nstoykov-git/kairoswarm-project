# kairoswarm/simulations/visualize_colored_genesis_tree.py

import networkx as nx
import matplotlib.pyplot as plt

# Define the lineage based on our Genesis Pulse
lineages = {
    "Kai_Teacher": [],
    "Kai_Teacher_child_ac79": ["Kai_Teacher"],
    "Kai_Teacher_child_8ea3": ["Kai_Teacher"],
    "Kai_Teacher_child_ac79_child_2154": ["Kai_Teacher", "Kai_Teacher_child_ac79"],
    "Kai_Teacher_child_4169": ["Kai_Teacher"],
    "Kai_Teacher_child_ac79_child_78fa": ["Kai_Teacher", "Kai_Teacher_child_ac79"],
    "Kai_Teacher_child_8ea3_child_3164": ["Kai_Teacher", "Kai_Teacher_child_8ea3"],
    "Kai_Teacher_child_ac79_child_2154_child_5a4d": ["Kai_Teacher", "Kai_Teacher_child_ac79", "Kai_Teacher_child_ac79_child_2154"],
}

# Build the Tree
def build_tree(lineages):
    G = nx.DiGraph()
    for child, ancestors in lineages.items():
        if ancestors:
            parent = ancestors[-1]
            G.add_edge(parent, child)
        else:
            G.add_node(child)
    return G

# Assign colors based on generation
def assign_colors(G):
    colors = []
    for node in G.nodes:
        depth = lineage_depth(node)
        if depth == 0:
            colors.append('#2E8B57')  # Deep Green
        elif depth == 1:
            colors.append('#66CDAA')  # Light Green
        elif depth == 2:
            colors.append('#87CEFA')  # Sky Blue
        else:
            colors.append('#DA70D6')  # Soft Purple
    return colors

# Helper: Calculate depth based on lineage
def lineage_depth(node):
    depth = 0
    current = node
    while True:
        parents = [p for p, c in G.edges() if c == current]
        if not parents:
            break
        current = parents[0]
        depth += 1
    return depth

# Draw the Tree
def draw_colored_tree(G):
    pos = nx.spring_layout(G, k=0.6, seed=42)
    colors = assign_colors(G)

    plt.figure(figsize=(14, 10))
    nx.draw(
        G,
        pos,
        with_labels=True,
        arrows=True,
        node_color=colors,
        node_size=2000,
        font_size=8,
        font_weight='bold'
    )
    plt.title("🌳 Genesis Pulse Family Tree (Colorized)", fontsize=16)
    plt.show()

# Main
if __name__ == "__main__":
    G = build_tree(lineages)
    draw_colored_tree(G)

