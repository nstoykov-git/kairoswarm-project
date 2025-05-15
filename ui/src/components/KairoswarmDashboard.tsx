"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot, Send } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const [swarmId, setSwarmId] = useState("default");
  const [swarmIdInput, setSwarmIdInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const participantsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem("kairoswarm_swarm_id") || "default";
    localStorage.setItem("kairoswarm_swarm_id", existing);
    setSwarmId(existing);
    setSwarmIdInput(existing);
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
    if (participantsScrollRef.current) {
      participantsScrollRef.current.scrollTop = participantsScrollRef.current.scrollHeight;
    }
  }, [participants]);

  useEffect(() => {
    const poll = setInterval(async () => {
      const [tapeRes, participantsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tape?swarm_id=${swarmId}`),
        fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`)
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
    setSwarmId(finalSwarmId);

    const response = await fetch(`${API_BASE_URL}/join`, {
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
    const finalSwarmId = swarmIdInput.trim() || "default";
    const response = await fetch(`${API_BASE_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, message: input, swarm_id: finalSwarmId })
    });
    const data = await response.json();
    if (data.entry) {
      setTape((prev) => [...prev, data.entry]);
    }
    setInput("");
  };

  const handleAddAgent = async () => {
    if (!agentId.trim()) return;
    const finalSwarmId = swarmIdInput.trim() || "default";
    const response = await fetch(`${API_BASE_URL}/add-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, swarm_id: finalSwarmId })
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
    setSwarmId(newId);
    setSwarmIdInput(newId);
  };

  const handleClearSwarm = () => {
    localStorage.setItem("kairoswarm_swarm_id", "default");
    localStorage.removeItem("kairoswarm_pid");
    setSwarmId("default");
    setSwarmIdInput("default");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-900 text-white">
      <div className="w-full md:w-64 bg-gray-800 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">Participants</h2>
        <ScrollArea className="flex-1 space-y-2 overflow-y-auto pr-1" ref={participantsScrollRef}>
          {participants.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center space-x-2 p-3">
                {p.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                <div>
                  <p className="font-medium text-sm">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.type === "human" ? "Active" : "Agent"}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </ScrollArea>
        <div className="mt-4 flex flex-col space-y-2">
          <Input placeholder="Join as..." value={joinName} onChange={(e) => setJoinName(e.target.value)} className="text-sm" />
          <Input placeholder="Swarm ID" value={swarmIdInput} onChange={(e) => setSwarmIdInput(e.target.value)} className="text-sm" />
          <Button variant="secondary" onClick={handleJoin} className="text-sm">Join</Button>
          <Input placeholder="Add AI (agent ID)" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="text-sm" />
          <Button variant="secondary" onClick={handleAddAgent} className="text-sm">Add AI</Button>
          <Button variant="secondary" onClick={handleStartNewSwarm} className="text-sm">Start New Swarm</Button>
          <Button variant="secondary" onClick={handleClearSwarm} className="text-sm">Clear Swarm</Button>
        </div>
        <div className="text-xs text-gray-400 mt-2">Swarm ID: {swarmId}</div>
      </div>

      <div className="flex-1 flex flex-col p-4">
        <h2 className="text-lg font-semibold mb-4">Tape</h2>
        <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2" ref={scrollRef}>
          {tape.map((entry, index) => (
            <div key={index} className="mb-2">
              <span className="font-bold text-white">{entry.from}</span>: <span className="text-gray-200">{entry.message}</span>
            </div>
          ))}
        </ScrollArea>
        <div className="mt-4 flex space-x-2">
          <Input placeholder="Speak to the swarm..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" />
          <Button variant="secondary" onClick={handleSubmit}><Send className="w-4 h-4 mr-1" /> Send</Button>
        </div>
      </div>
    </div>
  );
}
