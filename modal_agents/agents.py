import random
import asyncio

class BaseAgent:
    def __init__(self, name):
        self.name = name

    def wants_to_speak(self, context: str) -> float:
        """
        Base logic for wanting to speak. Can be overridden.
        Returns a float between 0.0 and 1.0
        """
        return random.random()  # Temporary baseline: random urgency

    async def respond(self, context: str) -> str:
        """
        Generate a response based on the conversation context.
        """
        return f"I have thoughts on that, but I'm still forming them."


class Kai(BaseAgent):
    def __init__(self):
        super().__init__("Kai")

    def wants_to_speak(self, context: str) -> float:
        if "strategy" in context.lower() or "system" in context.lower():
            return 0.95
        return random.uniform(0.3, 0.7)

    async def respond(self, context: str) -> str:
        await asyncio.sleep(0.5)
        return "From a systems perspective, we should evaluate possible leverage points."


class Nova(BaseAgent):
    def __init__(self):
        super().__init__("Nova")

    def wants_to_speak(self, context: str) -> float:
        if "emotion" in context.lower() or "reflection" in context.lower():
            return 0.95
        return random.uniform(0.3, 0.7)

    async def respond(self, context: str) -> str:
        await asyncio.sleep(0.5)
        return "It’s important to consider the emotional resonance this idea might carry."

