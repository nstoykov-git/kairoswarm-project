# environment/semantic_vector.py

import numpy as np

class SemanticVector:
    def __init__(self, dim=128, dominant_dims=None, noise_scale=0.01):
        self.vector = np.zeros(dim)
        dominant_dims = dominant_dims or [0, 1, 2]

        # Add strong signal in main dimensions
        for d in dominant_dims:
            self.vector[d] = np.random.uniform(0.7, 1.0)

        # Add noise in other dims (possible normal components)
        noise = np.random.normal(0, noise_scale, dim)
        self.vector += noise

    def get_normal_energy(self, manifold_dims):
        all_dims = np.arange(len(self.vector))
        normal_dims = np.setdiff1d(all_dims, manifold_dims)
        return np.linalg.norm(self.vector[normal_dims])
