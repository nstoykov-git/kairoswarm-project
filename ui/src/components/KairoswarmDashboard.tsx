"use client";
// KairoswarmDashboard.tsx

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, User, Bot, PlusCircle, Users, Trash2 } from "lucide-react";

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const API_BASE = "https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run";

  useEffect(() => {
    const storedPid = localStorage.getItem("kairoswarm_pid");
    if (storedPid) setParticipantId(storedPid);

    const loadParticipants = async () => {
      const res = await fetch(`${API_BASE}/participants`);
      const data = await res.json();
      setParticipants(data);
    };

    loadParticipants();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`${API_BASE}/tape`);
      const data = await res.json();
      setTape(data);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tape]);

  const handleSubmit = async () => {
    if (!input.trim() || !participantId) {
      alert("Please join the swarm first.");
      return;
    }
    await fetch(`${API_BASE}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, message: input }),
    });
    setInput("");
  };

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    const res = await fetch(`${API_BASE}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName, type: "human" }),
    });
    const data = await res.json();
    setParticipantId(data.participant_id);
    localStorage.setItem("kairoswarm_pid", data.participant_id);
    setJoinName("");
  };

  const handleAddAgent = async () => {
    if (!agentId.trim()) return;
    const res = await fetch(`${API_BASE}/add-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    const data = await res.json();
    if (data.name) setParticipants((prev) => [...prev, { id: data.thread_id, name: data.name, type: "agent" }]);
    setAgentId("");
  };

  const handleNukeRedis = async () => {
    await fetch(`${API_BASE}/debug/nuke`, { method: "POST" });
    alert("Redis cleared.");
    localStorage.removeItem("kairoswarm_pid");
    setParticipants([]);
    setTape([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4 space-y-4">
      <div className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold">Kairoswarm Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => setShowParticipants((prev) => !prev)}>
            <Users className="w-5 h-5" />
          </Button>
          <Button variant="ghost" onClick={handleNukeRedis} title="Clear Redis">
            <Trash2 className="w-5 h-5 text-red-400" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 space-x-4 overflow-hidden relative">
        {/* Participants Panel */}
        {(showParticipants || true) && (
          <div className="basis-1/4 min-w-[220px] max-w-[300px] bg-gray-800 rounded-2xl p-4 shadow-md">
            <h2 className="text-lg font-semibold mb-4">Participants</h2>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
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
              <Input placeholder="Join as..." value={joinName} onChange={(e) => setJoinName(e.target.value)} className="text-sm" />
              <Button variant="outline" onClick={handleJoin}>
                <PlusCircle className="w-4 h-4 mr-1" /> Join
              </Button>
            </div>
            <div className="mt-2 flex space-x-2">
              <Input placeholder="Add AI (agent ID)" value={agentId} onChange={(e) => setAgentId(e.target.value)} className="text-sm" />
              <Button variant="secondary" onClick={handleAddAgent}>
                <PlusCircle className="w-4 h-4 mr-1" /> Add AI
              </Button>
            </div>
          </div>
        )}

        {/* Tape Panel */}
        <div className="flex-1 bg-gray-850 rounded-2xl p-4 shadow-inner overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Tape</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2" ref={scrollRef}>
            {tape.map((entry, idx) => (
              <div key={idx} className="flex items-start space-x-2">
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

      {/* Speak Input */}
      <div className="flex items-center space-x-2 border-t border-gray-700 pt-2">
        <Input placeholder="Speak to the swarm..." value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" />
        <Button onClick={handleSubmit}>
          <Send className="w-4 h-4 mr-1" /> Send
        </Button>
      </div>
    </div>
  );
}
