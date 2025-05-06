# swarm_graph.py

from kairoswarm.environment.agent_node import AgentNode

class SwarmGraph:
    def __init__(self):
        self.agents = {}

    def add_agent(self, agent: AgentNode):
        self.agents[agent.name] = agent

    def connect(self, from_name: str, to_name: str):
        a = self.agents[from_name]
        b = self.agents[to_name]
        a.follow(b)

    def broadcast(self, sender_name: str, message: dict):
        sender = self.agents[sender_name]
        for follower_name in sender.followers:
            self.agents[follower_name].receive(message)

    def step(self):
        """
        Advances one tick in swarm time. All agents post, and their messages are routed.
        """
        messages = []
        for agent in self.agents.values():
            msg = agent.act()
            if msg:
                messages.append(msg)
                self.broadcast(agent.name, msg)
        return messages
# Graph structure and routing logic
