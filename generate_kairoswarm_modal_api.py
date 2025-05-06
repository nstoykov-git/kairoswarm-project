import os

folders = [
    "kairoswarm-project/modal_api",
    "kairoswarm-project/modal_api/endpoints",
    "kairoswarm-project/modal_api/utils"
]

files = [
    "kairoswarm-project/modal_api/__init__.py",
    "kairoswarm-project/modal_api/endpoints/join.py",
    "kairoswarm-project/modal_api/endpoints/speak.py",
    "kairoswarm-project/modal_api/endpoints/tape.py",
    "kairoswarm-project/modal_api/utils/redis_client.py",
    "kairoswarm-project/modal_api/app.py"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)

for file in files:
    with open(file, "w") as f:
        f.write(f"# {file.split('/')[-1]} placeholder\n")

print("✅ modal_api folder structure created inside kairoswarm-project.")

