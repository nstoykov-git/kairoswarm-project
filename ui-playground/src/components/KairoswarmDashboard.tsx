// Kairoswarm UI Scaffold (React + Tailwind + ShadCN/UI)
import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, User, Bot, PlusCircle } from "lucide-react";

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [participants, setParticipants] = useState([
    { id: 1, name: "Nina", type: "human" },
    { id: 2, name: "KAI-5", type: "agent" },
  ]);
  const [tape, setTape] = useState([
    { id: 1, type: "human", name: "Nina", text: "Hey team, ready to begin?" },
    { id: 2, type: "agent", name: "KAI-5", text: "Affirmative. Lecture mode engaged." },
  ]);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tape]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    const newHumanEntry = {
      id: tape.length + 1,
      type: "human",
      name: "You",
      text: input,
    };

    setTape((prev) => [...prev, newHumanEntry]);
    setInput("");

    // Simulate agent response via GPT-4o-mini (mocked logic for now)
    setTimeout(() => {
      const agentReply = {
        id: tape.length + 2,
        type: "agent",
        name: "KAI-5",
        text: generateAgentReply(input),
      };
      setTape((prev) => [...prev, agentReply]);
    }, 800);
  };

  const generateAgentReply = (inputText) => {
    if (inputText.toLowerCase().includes("gravity")) {
      return "Gravity is the curvature of spacetime caused by mass. Would you like a diagram?";
    } else if (inputText.toLowerCase().includes("ready")) {
      return "I'm ready when you are. Initializing lecture state.";
    } else {
      return "Could you clarify that? I'm still updating my context.";
    }
  };

  const handleJoin = () => {
    if (!joinName.trim()) return;
    const newParticipant = {
      id: participants.length + 1,
      name: joinName,
      type: "human",
    };
    setParticipants([...participants, newParticipant]);
    setJoinName("");
  };

  const handleAddAgent = async () => {
    if (!agentId.trim()) return;
    const response = await fetch("/api/add-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    const data = await response.json();
    if (data.name) {
      const newAgent = {
        id: participants.length + 1,
        name: data.name,
        type: "agent",
      };
      setParticipants([...participants, newAgent]);
      setTape((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          type: "agent",
          name: data.name,
          text: "Hello, I've joined the swarm."
        }
      ]);
      setAgentId("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4 space-y-4">
      {/* Top Bar */}
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold">Kairoswarm Dashboard</h1>
        <div className="text-sm text-gray-400">Mode: Lecture</div>
      </div>

      <div className="flex flex-1 space-x-4 overflow-hidden">
        {/* Participants Panel */}
        <div className="w-1/4 bg-gray-800 rounded-2xl p-4 shadow-md">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-3">
            {participants.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center space-x-2 p-3">
                  {p.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.type === "human" ? "Active" : "Agent"}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex space-x-2">
            <Input
              placeholder="Join as..."
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="text-sm"
            />
            <Button variant="outline" onClick={handleJoin}>
              <PlusCircle className="w-4 h-4 mr-1" /> Join
            </Button>
          </div>
          <div className="mt-2 flex space-x-2">
            <Input
              placeholder="Add AI (agent ID)"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="text-sm"
            />
            <Button variant="secondary" onClick={handleAddAgent}>
              <PlusCircle className="w-4 h-4 mr-1" /> Add AI
            </Button>
          </div>
        </div>

        {/* Tape Panel */}
        <div className="flex-1 bg-gray-850 rounded-2xl p-4 shadow-inner overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Tape</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2" ref={scrollRef}>
            {tape.map((entry) => (
              <div key={entry.id} className="flex items-start space-x-2">
                {entry.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                <div>
                  <p className="font-medium text-sm">{entry.name}</p>
                  <p className="text-sm text-gray-200">{entry.text}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>

      {/* Speak Input */}
      <div className="flex items-center space-x-2 border-t border-gray-700 pt-2">
        <Input
          placeholder="Speak to the swarm..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSubmit}>
          <Send className="w-4 h-4 mr-1" /> Send
        </Button>
      </div>
    </div>
  );
}

