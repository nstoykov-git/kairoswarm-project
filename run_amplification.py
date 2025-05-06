# run_amplification.py

import sys
import os

# Add the package path (for local dev if needed)
sys.path.append(os.path.join(os.path.dirname(__file__), "kairoswarm"))

from kairoswarm.simulations.test_amplification import test_amplification

if __name__ == "__main__":
    print("🚀 Running Amplification Test...")
    test_amplification()

