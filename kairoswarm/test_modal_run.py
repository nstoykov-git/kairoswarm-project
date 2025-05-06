# test_modal_run.py

import modal

# ✅ Use the updated Modal API
run_agent = modal.Function.from_name("kairoswarm-sim", "run_kairoswarm_agent")

agent_name = "kai"
prompt = "What are the principles of positional awareness in distributed systems?"

if __name__ == "__main__":
    result = run_agent.remote(agent_name, prompt)
    print("\nAgent response:")
    print(result)
