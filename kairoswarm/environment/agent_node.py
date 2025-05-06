# agent_node.py

class AgentNode:
    def __init__(self, name, behavior_fn=None):
        self.name = name
        self.following = set()
        self.followers = set()
        self.inbox = []
        self.behavior_fn = behavior_fn or self.default_behavior

    def follow(self, other_agent):
        self.following.add(other_agent.name)
        other_agent.followers.add(self.name)

    def receive(self, message):
        self.inbox.append(message)

    def post(self, content, mentions=None):
        """
        Posts a message to followers, optionally mentioning others.
        """
        message = {
            "sender": self.name,
            "content": content,
            "mentions": mentions or [],
        }
        return message

    def act(self):
        """
        Respond based on the current inbox using a custom or default behavior.
        """
        if self.inbox:
            response = self.behavior_fn(self.inbox)
            self.inbox = []  # Clear inbox after processing
            return response
        return None

    def default_behavior(self, inbox):
        return self.post(f"{self.name} received {len(inbox)} messages and is thinking about them.")
# Lightweight agent communication layer
