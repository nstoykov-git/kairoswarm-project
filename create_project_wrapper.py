import os
import shutil
from pathlib import Path

ROOT_NAME = "kairoswarm-project"
SWARM_FOLDER = "kairoswarm"

# Define new structure
top_level_files = {
    ".gitignore": "__pycache__/\n.env\n.vscode/\nlogs/\ndata/\n*.pyc\n",
    "README.md": "# Kairoswarm Project\n\nTop-level workspace for the Kairoswarm simulation system.\n",
    "run.py": """\
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "kairoswarm"))

from simulations.test_swarm import run_genesis_pulse

if __name__ == "__main__":
    print("Launching Kairoswarm simulation...")
    run_genesis_pulse()
"""
}

vscode_settings = {
    ".vscode/settings.json": """\
{
  "python.analysis.extraPaths": ["./kairoswarm"],
  "python.pythonPath": "python3"
}
"""
}


def create_wrapper():
    current_dir = Path.cwd()
    wrapper_dir = current_dir / ROOT_NAME
    swarm_dir = current_dir / SWARM_FOLDER

    # 1. Create the wrapper folder
    wrapper_dir.mkdir(exist_ok=True)
    print(f"📁 Created or verified: {wrapper_dir}")

    # 2. Move the kairoswarm folder into it (if not already moved)
    target_swarm_path = wrapper_dir / SWARM_FOLDER
    if not target_swarm_path.exists():
        shutil.move(str(swarm_dir), str(target_swarm_path))
        print(f"📦 Moved '{SWARM_FOLDER}/' into '{ROOT_NAME}/'")
    else:
        print(f"✅ '{SWARM_FOLDER}/' already exists in wrapper.")

    # 3. Create top-level files
    for rel_path, content in top_level_files.items():
        file_path = wrapper_dir / rel_path
        if not file_path.exists():
            with open(file_path, "w") as f:
                f.write(content)
            print(f"📄 Created: {file_path}")
        else:
            print(f"✅ Exists:  {file_path}")

    # 4. Create .vscode settings
    vscode_dir = wrapper_dir / ".vscode"
    vscode_dir.mkdir(exist_ok=True)
    for rel_path, content in vscode_settings.items():
        file_path = wrapper_dir / rel_path
        if not file_path.exists():
            with open(file_path, "w") as f:
                f.write(content)
            print(f"⚙️ Created: {file_path}")
        else:
            print(f"✅ Exists:  {file_path}")

    print("\n🚀 Kairoswarm project wrapper initialized!")


if __name__ == "__main__":
    create_wrapper()
