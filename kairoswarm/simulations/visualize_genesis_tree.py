# kairoswarm/simulations/visualize_genesis_tree.py

import networkx as nx
import matplotlib.pyplot as plt

# Manually paste the lineage data for now
# (Later we'll automate it)

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

def build_tree(lineages):
    G = nx.DiGraph()

    for child, ancestors in lineages.items():
        if ancestors:
            parent = ancestors[-1]  # Immediate parent
            G.add_edge(parent, child)
        else:
            G.add_node(child)

    return G

def draw_tree(G):
    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(G, k=0.7, seed=42)  # Nice layout

    nx.draw(G, pos, with_labels=True, arrows=True, node_color="#88c9bf", node_size=1800, font_size=8, font_weight='bold')
    plt.title("🌳 Genesis Family Tree", fontsize=16)
    plt.show()

if __name__ == "__main__":
    G = build_tree(lineages)
    draw_tree(G)

