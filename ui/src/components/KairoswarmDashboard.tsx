// Dashboard.tsx (updated to support user ID and view memories)

"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot, Send, Users, Brain } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [userId, setUserId] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const [swarmId, setSwarmId] = useState("default");
  const [swarmIdInput, setSwarmIdInput] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const participantsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const existing = localStorage.getItem("kairoswarm_swarm_id") || "default";
    const uid = localStorage.getItem("kairoswarm_user_id") || "";
    localStorage.setItem("kairoswarm_swarm_id", existing);
    setSwarmId(existing);
    setSwarmIdInput(existing);
    setUserId(uid);
  }, []);

  useEffect(() => {
    const storedPid = localStorage.getItem("kairoswarm_pid");
    if (storedPid) setParticipantId(storedPid);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tape]);

  useEffect(() => {
    if (participantsScrollRef.current) participantsScrollRef.current.scrollTop = participantsScrollRef.current.scrollHeight;
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
    localStorage.setItem("kairoswarm_user_id", userId);
    localStorage.removeItem("kairoswarm_pid");
    setSwarmId(finalSwarmId);

    const response = await fetch(`${API_BASE_URL}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName, type: "human", swarm_id: finalSwarmId, user_id: userId })
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
    if (data.entry) setTape((prev) => [...prev, data.entry]);
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

  const handleViewMemories = async () => {
    if (!agentId.trim()) return;
    const response = await fetch(`${API_BASE_URL}/get-memories?agent_id=${agentId}&user_id=${userId}`);
    const data = await response.json();
    if (data.memories) setMemories(data.memories);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
  <h1 className="text-xl font-bold">Kairoswarm</h1>

  <div className="flex items-center space-x-3">
    <Button
      variant="secondary"
      size="sm"
      onClick={() => window.location.href = "/auth"}
    >
      🔐 Sign In
    </Button>

    <Button
      variant="ghost"
      className="md:hidden"
      onClick={() => setShowParticipants(!showParticipants)}
    >
      <Users className="w-5 h-5" />
    </Button>
  </div>
</div>


      <div className="flex flex-1 overflow-hidden">
        {(showParticipants || typeof window !== "undefined" && window.innerWidth >= 768) && (
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
              <Input placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="text-sm" />
              <Input placeholder="Swarm ID" value={swarmIdInput} onChange={(e) => setSwarmIdInput(e.target.value)} className="text-sm" />
              <Button variant="secondary" onClick={handleJoin} className="text-sm">Join</Button>
              <Input placeholder="Add AI (agent ID)" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="text-sm" />
              <Button variant="secondary" onClick={handleAddAgent} className="text-sm">Add AI</Button>
              <Button variant="secondary" onClick={handleViewMemories} className="text-sm flex items-center gap-1"><Brain className="w-4 h-4" />View Memories</Button>
            </div>
            <div className="text-xs text-gray-400 mt-2">Swarm ID: {swarmId}</div>
          </div>
        )}

        <div className="flex-1 flex flex-col p-4">
          <h2 className="text-lg font-semibold mb-4">Tape</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2" ref={scrollRef}>
            {tape.map((entry, index) => (
              <div key={index} className="mb-2">
                <span className="font-bold text-white">{entry.from}</span>: <span className="text-gray-200">{entry.message}</span>
              </div>
            ))}

            {memories.length > 0 && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-2">🔍 Retrieved Memories</h2>
                {memories.map((mem, index) => (
                  <div key={index} className="text-sm text-gray-300 mb-1 border-b border-gray-600 pb-1">
                    <strong>{mem.type}</strong>: {mem.content} <span className="text-xs text-gray-500">({new Date(mem.created_at).toLocaleString()})</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="mt-4 flex space-x-2">
            <Input placeholder="Speak to the swarm..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" />
            <Button variant="secondary" onClick={handleSubmit}><Send className="w-4 h-4 mr-1" /> Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
