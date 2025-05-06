# Makefile for Kairoswarm 🚀

# Run main simulation
run:
	python run.py

# Run amplification test
amplify:
	python run_amplification.py

# Run test swarm (can be customized later)
test:
	python -m kairoswarm.simulations.test_swarm

# Lint code (optional, if using flake8)
lint:
	flake8 kairoswarm

# Reinstall local package in editable mode
install:
	pip install -e .

# Clean pycache and logs
clean:
	find . -type d -name '__pycache__' -exec rm -r {} +
	rm -rf kairoswarm/__pycache__ kairoswarm/**/*.pyc logs/*

# View folder structure (fun!)
tree:
	tree -I '__pycache__|.git|.vscode'

.PHONY: run test lint install clean tree

