# test_package_install.py

from modal import App, Image, Secret
from modal.mount import Mount
import modal

app = App(
    name="test-kairoswarm-core-import",
    secrets=[
        Secret.from_name("supabase-url"),
        Secret.from_name("openai-key"),
        Secret.from_name("upstash-redis-url")
    ],
)

image = (
    Image.debian_slim()
    .pip_install(extra_options=["-e", "/root/kairoswarm-internal"])
    .env({"PYTHONPATH": "/root/kairoswarm-internal"})
    .add_local_dir(
        local_path="../../kairoswarm-internal",
        remote_path="/root/kairoswarm-internal"
    )
)

@app.function(image=image)
def test_import():
    import kairoswarm_core
    print("✅ kairoswarm_core successfully imported!")

