from modal import Image, App

image = (
    Image.debian_slim()
    .add_local_dir(
        local_path="../../kairoswarm-internal",
        remote_path="/root/kairoswarm-internal",
        copy=True  # <- important
    )
    .run_commands(
        "pip install asyncpg",
        "pip install -e /root/kairoswarm-internal"
    )
)

stub = App(name="test-kairoswarm-core-import", image=image)

@stub.function()
def test_import():
    import sys
    import os

    print("✅ DEBUGGING MODULE IMPORT")
    print("sys.path:")
    for p in sys.path:
        print("  -", p)

    print("\n📁 /root contents:")
    print(os.listdir("/root"))

    print("\n📁 /root/kairoswarm-internal contents:")
    print(os.listdir("/root/kairoswarm-internal"))

    print("\n📁 /root/kairoswarm-internal/kairoswarm_core contents:")
    print(os.listdir("/root/kairoswarm-internal/kairoswarm_core"))

    print("\n✅ Now trying to import kairoswarm_core...")
    import kairoswarm_core
    print("🎉 SUCCESS: kairoswarm_core imported.")

