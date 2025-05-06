import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), "kairoswarm"))

#from simulations.test_swarm import run_genesis_pulse
from simulations.test_swarm import run_genesis_pulse

if __name__ == "__main__":
    print("Launching Kairoswarm simulation...")
    run_genesis_pulse()
