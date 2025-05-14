"use client";

import { useEffect, useState, useRef } from "react";
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
  const [swarmId, setSwarmId] = useState("default");
  const [swarmIdInput, setSwarmIdInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    setSwarmId(finalSwarmId);

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
    const finalSwarmId = swarmIdInput.trim() || "default";
    const response = await fetch("https://kairoswarm-serverless-api.modal.run/speak", {
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
    const response = await fetch("https://kairoswarm-serverless-api.modal.run/add-agent", {
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
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Join as..."
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
        />
        <Input
          placeholder="Swarm ID"
          value={swarmIdInput}
          onChange={(e) => setSwarmIdInput(e.target.value)}
        />
        <Button variant="secondary" onClick={handleJoin}>Join</Button>
        <Input
          placeholder="Add AI (agent ID)"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
        />
        <Button variant="secondary" onClick={handleAddAgent}>Add AI</Button>
        <Button variant="secondary" onClick={handleStartNewSwarm}>Start New Swarm</Button>
        <Button variant="secondary" onClick={handleClearSwarm}>Clear Swarm</Button>
      </div>
      <div className="text-sm text-gray-400 mb-2">Swarm ID: {swarmId}</div>
      <ScrollArea className="h-[60vh] border rounded p-2" ref={scrollRef}>
        {tape.map((entry, index) => (
          <div key={index} className="mb-2">
            <span className="font-bold text-white">{entry.from}</span>: <span className="text-gray-200">{entry.message}</span>
          </div>
        ))}
      </ScrollArea>
    </div>
  );
}
