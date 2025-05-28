import modal

app = modal.App()

@app.function(secrets=[modal.Secret.from_name("supabase-credentials")])
def some_function():
    import os
    print("SUPABASE_URL:", os.environ.get("SUPABASE_URL"))
    print("SUPABASE_SERVICE_ROLE_KEY:", os.environ.get("SUPABASE_SERVICE_ROLE_KEY"))

