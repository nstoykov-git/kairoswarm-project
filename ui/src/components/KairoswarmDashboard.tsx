"use client";

import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Bot, PlusCircle, Eye, PanelRightClose, PanelRightOpen } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [swarmId, setSwarmId] = useState("default");
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const participantsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const poll = setInterval(async () => {
      const [tapeRes, participantsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tape?swarm_id=${swarmId}`),
        fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`),
      ]);
      const tapeData = await tapeRes.json();
      const participantsData = await participantsRes.json();
      if (Array.isArray(tapeData)) setTape(tapeData);
      if (Array.isArray(participantsData)) setParticipants(participantsData);
    }, 2000);
    return () => clearInterval(poll);
  }, [swarmId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tape]);

  const handleJoin = async () => {
    if (!joinName.trim()) return;
    const res = await fetch(`${API_BASE_URL}/swarm/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: joinName,
        swarm_id: swarmId,
      }),
    });
    const data = await res.json();
    if (data.status === "joined") {
      setParticipantId(data.participant_id);
    }
  };

  const handleSpeak = async () => {
    if (!participantId || !input.trim()) return;
    await fetch(`${API_BASE_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: participantId,
        swarm_id: swarmId,
        message: input,
      }),
    });
    setInput("");
  };

  const handleAddAgent = async () => {
    const agentId = prompt("Enter OpenAI Assistant ID:");
    if (!agentId) return;

    const res = await fetch(`${API_BASE_URL}/add-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, swarm_id: swarmId }),
    });

    const data = await res.json();
    if (data.name) {
      alert(`✅ Agent "${data.name}" added`);
    } else {
      alert("⚠️ Failed to add agent");
    }
  };

  const handleCreateSwarm = async () => {
    const name = prompt("Enter a name for your new swarm:") || "Untitled Swarm";
    const res = await fetch(`${API_BASE_URL}/swarm/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data.id) {
      setSwarmId(data.id);
      setParticipantId(null);
      setTape([]);
      setParticipants([]);
    }
  };

  const handleViewSwarm = async () => {
    const newSwarmId = prompt("Enter Swarm ID to view:");
    if (newSwarmId) {
      setSwarmId(newSwarmId);
      setParticipantId(null);
      setTape([]);
      setParticipants([]);
    }
  };

  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 h-screen bg-gray-900 text-white">
      <div className="col-span-3 flex flex-col space-y-2">
        {swarmId !== "default" && (
          <div className="text-xs text-gray-300 mb-1">
            Swarm ID: <span className="text-white font-mono">{swarmId}</span><br />
            ⏳ Ephemeral swarm expires in 24 hours
          </div>
        )}

        <ScrollArea className="flex-1 bg-black rounded-xl p-4 max-h-[65vh] overflow-y-scroll" ref={scrollRef}>
          <div className="space-y-2">
            {tape.map((msg, idx) => (
              <div key={idx}>
                <span className="font-bold text-white">{msg.from}:</span> {msg.message}
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Input
            className="text-white placeholder-gray-400"
            value={input}
            placeholder="Say something..."
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
            disabled={!participantId}
          />
          <Button onClick={handleSpeak} disabled={!participantId}>
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleAddAgent}>
            <Bot className="w-4 h-4 mr-2" />
            Add AI Agent
          </Button>
          <Button variant="secondary" onClick={handleCreateSwarm}>
            <PlusCircle className="w-4 h-4 mr-2" />
            New Swarm
          </Button>
          <Button variant="secondary" onClick={handleViewSwarm}>
            <Eye className="w-4 h-4 mr-2" />
            View Swarm
          </Button>
          <Button variant="ghost" className="ml-auto md:hidden" onClick={() => setShowParticipants((prev) => !prev)}>
            {showParticipants ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {showParticipants && (
        <div className="col-span-2 flex flex-col space-y-2">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-bold mb-2">Participants</div>
              <ScrollArea className="h-64" ref={participantsScrollRef}>
                {participants.map((p) => (
                  <div key={p.id} className="mb-1">
                    {p.name} {p.type === "agent" ? "🤖" : "🧑"}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {!participantId && (
            <>
              <Input
                className="text-white placeholder-gray-400"
                value={joinName}
                placeholder="Your Name"
                onChange={(e) => setJoinName(e.target.value)}
              />
              <Button variant="secondary" onClick={handleJoin}>
                <Users className="w-4 h-4 mr-2" />
                Join Swarm
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
