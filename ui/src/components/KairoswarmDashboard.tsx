"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot, Send, Users, RefreshCcw, Plus } from "lucide-react";

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [swarmIdInput, setSwarmIdInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const swarmId = useMemo(() => {
    const existing = localStorage.getItem("kairoswarm_swarm_id") || "default";
    localStorage.setItem("kairoswarm_swarm_id", existing);
    setSwarmIdInput(existing);
    return existing;
  }, []);

  useEffect(() => {
    const storedPid = localStorage.getItem("kairoswarm_pid");
    if (storedPid) {
      setParticipantId(storedPid);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tape]);

  useEffect(() => {
    const poll = setInterval(async () => {
      const [tapeRes, participantsRes] = await Promise.all([
        fetch(`https://kairoswarm-serverless-api.modal.run/tape?swarm_id=${swarmId}`),
        fetch(`https://kairoswarm-serverless-api.modal.run/participants-full?swarm_id=${swarmId}`)
      ]);
      const tapeData = await tapeRes.json();
      const participantsData = await participantsRes.json();
      if (Array.isArray(tapeData)) setTape(tapeData);
      if (Array.isArray(participantsData)) setParticipants(participantsData);
    }, 3000);
    return () => clearInterval(poll);
  }, [swarmId]);

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    const finalSwarmId = swarmIdInput.trim() || "default";
    localStorage.setItem("kairoswarm_swarm_id", finalSwarmId);
    localStorage.removeItem("kairoswarm_pid");

    const response = await fetch("https://kairoswarm-serverless-api.modal.run/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName, type: "human", swarm_id: finalSwarmId })
    });
    const data = await response.json();
    setParticipantId(data.participant_id);
    localStorage.setItem("kairoswarm_pid", data.participant_id);
    setJoinName("");
  };

  const handleSubmit = async () => {
    if (!input.trim() || !participantId) return;
    const response = await fetch("https://kairoswarm-serverless-api.modal.run/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, message: input, swarm_id: swarmId })
    });
    const data = await response.json();
    if (data.entry) {
      setTape((prev) => [...prev, data.entry]);
    }
    setInput("");
  };

  const handleAddAgent = async () => {
    if (!agentId.trim()) return;
    const response = await fetch("https://kairoswarm-serverless-api.modal.run/add-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, swarm_id: swarmId })
    });
    const data = await response.json();
    if (data.name) {
      setParticipants((prev) => [...prev, { id: Date.now(), name: data.name, type: "agent" }]);
      setTape((prev) => [...prev, { from: data.name, type: "agent", message: "Hello, I've joined the swarm." }]);
      setAgentId("");
    }
  };

  const handleStartNewSwarm = () => {
    const newId = uuidv4();
    localStorage.setItem("kairoswarm_swarm_id", newId);
    localStorage.removeItem("kairoswarm_pid");
    setSwarmIdInput(newId);
    window.location.reload();
  };

  const handleClearSwarm = () => {
    localStorage.setItem("kairoswarm_swarm_id", "default");
    localStorage.removeItem("kairoswarm_pid");
    setSwarmIdInput("default");
    window.location.reload();
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold">Kairoswarm Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-400">Swarm ID:</span>
            <Input
              value={swarmIdInput}
              onChange={(e) => setSwarmIdInput(e.target.value)}
              className="w-40 text-sm bg-gray-800 border-gray-600"
            />
          </div>
          <Button variant="ghost" onClick={() => setShowParticipants((prev) => !prev)} className="md:hidden">
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" size="sm" onClick={handleStartNewSwarm}>
          <Plus className="w-4 h-4 mr-1" /> Start New Swarm
        </Button>
        <Button variant="outline" size="sm" onClick={handleClearSwarm}>
          <RefreshCcw className="w-4 h-4 mr-1" /> Clear Swarm
        </Button>
      </div>

      <div className="flex flex-1 space-x-4 overflow-hidden">
        <div className="basis-1/4 min-w-[220px] max-w-[300px] bg-gray-800 rounded-2xl p-4 shadow-md">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <ScrollArea className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
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
          </ScrollArea>

          <div className="mt-4 flex space-x-2">
            <Input placeholder="Join as..." value={joinName} onChange={(e) => setJoinName(e.target.value)} className="text-sm" />
            <Button variant="secondary" onClick={handleJoin} className="text-sm">Join</Button>
          </div>
          <div className="mt-2 flex space-x-2">
            <Input placeholder="Add AI (agent ID)" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="text-sm" />
            <Button variant="secondary" onClick={handleAddAgent} className="text-sm">Add AI</Button>
          </div>
        </div>

        <div className="flex-1 bg-gray-850 rounded-2xl p-4 shadow-inner overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Tape</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2" ref={scrollRef}>
            {tape.map((entry, i) => (
              <div key={i} className="flex items-start space-x-2">
                {entry.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                <div>
                  <p className="font-medium text-sm">{entry.from}</p>
                  <p className="text-sm text-gray-200">{entry.message}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>

      <div className="flex items-center space-x-2 border-t border-gray-700 pt-2">
        <Input placeholder="Speak to the swarm..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" />
        <Button onClick={handleSubmit}><Send className="w-4 h-4 mr-1" /> Send</Button>
      </div>
    </div>
  );
}
