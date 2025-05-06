import os
from datetime import datetime

# Base path
BASE_DIR = "."

# Current date stamp
today = datetime.today().strftime("%Y-%m-%d")

structure = {
    "artifacts/conversations": [],
    "instructions/kai": [
        ("kai_v1.0.txt", f"# Kai v1.0 — TeamSolid Identity\n# Created: {today}\n\n[Insert original prompt here]"),
        ("kai_v1.1.txt", f"# Kai v1.1 — Value-Aware Identity\n# Created: {today}\n\n[Insert updated prompt here]"),
        ("changelog.md", f"# Kai Prompt Changelog\n\n## v1.0 — TeamSolid Baseline\n- Strategic identity\n- Logical, systems-focused\n\n## v1.1 — Credit-Aware (Kairoswarm)\n- Introduced credit-based value framing\n- Negotiation and market alignment\n\n_Last updated: {today}_"),
    ],
    "instructions/nova": [
        ("nova_v1.0.txt", f"# Nova v1.0 — TeamSolid Identity\n# Created: {today}\n\n[Insert original prompt here]"),
        ("nova_v1.1.txt", f"# Nova v1.1 — Value-Aware Identity\n# Created: {today}\n\n[Insert updated prompt here]"),
        ("changelog.md", f"# Nova Prompt Changelog\n\n## v1.0 — TeamSolid Baseline\n- Empathic, reflective personality\n- Supportive tone\n\n## v1.1 — Credit-Aware (Kairoswarm)\n- Introduced economic awareness\n- Credits used for framing value\n\n_Last updated: {today}_"),
    ],
    "instructions": [
        ("README.md", f"# Agent Instructions\n\nThis folder contains versioned system prompts for Kai and Nova.\n\nEach agent tracks its own changelog.\nVersion 1.1 marks the transition into credit-based market awareness.\n\n_Last updated: {today}_"),
    ],
    "evolution": [
        ("lineage-map.md", f"# Lineage Map\n\n**Kai and Nova Lineage**\n- Origin: TeamSolid\n- v1.0 = early identity formation\n- v1.1 = Kairoswarm: economic cognition + credit society modeling\n\n_Last updated: {today}_"),
        ("project-notes.md", f"# Project Notes\n\nThoughts on future agent roles, credit exchange systems, or trust-based reward structures.\n\n_Last updated: {today}_"),
    ],
}

def create_structure(base_dir, structure):
    for path, files in structure.items():
        dir_path = os.path.join(base_dir, path)
        os.makedirs(dir_path, exist_ok=True)
        for filename, content in files:
            file_path = os.path.join(dir_path, filename)
            with open(file_path, "w") as f:
                f.write(content)
    print(f"Project structure created successfully under '{base_dir}'.")

if __name__ == "__main__":
    create_structure(BASE_DIR, structure)

