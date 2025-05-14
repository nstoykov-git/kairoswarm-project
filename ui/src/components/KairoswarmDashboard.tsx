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

      {/* ... rest of layout and render logic remains the same ... */}
    </div>
  );
}
