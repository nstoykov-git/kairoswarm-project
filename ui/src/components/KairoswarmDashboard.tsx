"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Users, Bot } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL || "";

export default function KairoswarmDashboard() {
  const [swarmId, setSwarmId] = useState("default");
  const [swarmName, setSwarmName] = useState("");
  const [swarmIdInput, setSwarmIdInput] = useState("default");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [tape, setTape] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const participantsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedSwarm = localStorage.getItem("kairoswarm_swarm_id");
    const storedPid = localStorage.getItem("kairoswarm_pid");
    const storedJoinName = localStorage.getItem("kairoswarm_join_name");

    if (storedSwarm) {
      setSwarmId(storedSwarm);
      setSwarmIdInput(storedSwarm);
    }
    if (storedPid) {
      setParticipantId(storedPid);
    }
    if (storedJoinName) {
      setJoinName(storedJoinName);
    }
  }, []);

  useEffect(() => {
    const poll = setInterval(async () => {
      const [tapeRes, participantsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tape?swarm_id=${swarmId}`),
        fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`)
      ]);
      const tapeData = await tapeRes.json();
      const participantsData = await participantsRes.json();
      setTape(Array.isArray(tapeData) ? tapeData : []);
      setParticipants(Array.isArray(participantsData) ? participantsData : []);
    }, 3000);
    return () => clearInterval(poll);
  }, [swarmId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tape]);

  const handleCreateSwarm = async () => {
    const name = prompt("Enter swarm name:");
    if (!name) return;

    const res = await fetch(`${API_BASE_URL}/swarm/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();

    if (data.status === "created") {
      setSwarmId(data.id);
      setSwarmIdInput(data.id);
      localStorage.setItem("kairoswarm_swarm_id", data.id);
      alert(`Swarm '${name}' created!`);
    } else {
      alert(`Error: ${data.detail || "Failed to create swarm"}`);
    }
  };

  const handleJoin = async () => {
    if (!joinName.trim()) return;

    const finalSwarmId = swarmIdInput.trim() || "default";

    const res = await fetch(`${API_BASE_URL}/swarm/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swarm_id: finalSwarmId, name: joinName }),
    });

    const data = await res.json();

    if (data.status === "joined") {
      setSwarmId(finalSwarmId);
      localStorage.setItem("kairoswarm_swarm_id", finalSwarmId);
      setParticipantId(data.participant_id);
      localStorage.setItem("kairoswarm_pid", data.participant_id);
      localStorage.setItem("kairoswarm_join_name", joinName);
      setJoinName("");
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !participantId) return;

    const res = await fetch(`${API_BASE_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: input,
        swarm_id: swarmId,
        participant_id: participantId
      })
    });

    const data = await res.json();
    setInput("");
  };

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div className="flex gap-4">
        <Input
          value={swarmIdInput}
          onChange={(e) => setSwarmIdInput(e.target.value)}
          className="w-1/2"
          placeholder="Enter swarm ID"
        />
        <Input
          value={joinName}
          onChange={(e) => setJoinName(e.target.value)}
          className="w-1/2"
          placeholder="Your name"
        />
        <Button onClick={handleJoin}>Join</Button>
        <Button onClick={handleCreateSwarm}>Create Swarm</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardPanel title="Participants" icon={<Users size={18} />} items={participants.map(p => p.name)} />
        <CardPanel title="Tape" icon={<Bot size={18} />} scrollRef={scrollRef}>
          {tape.map((entry, idx) => (
            <div key={idx} className="text-sm p-1">
              <strong>{entry.from}:</strong> {entry.message}
            </div>
          ))}
        </CardPanel>
      </div>

      <div className="flex gap-2">
        <Input
          className="flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Say something..."
        />
        <Button onClick={handleSend}>
          <Send size={18} />
        </Button>
      </div>
    </div>
  );
}

function CardPanel({ title, icon, items, children, scrollRef }: any) {
  return (
    <div className="border rounded-xl p-3 shadow bg-white text-black">
      <div className="flex items-center gap-2 font-semibold mb-2">{icon} {title}</div>
      <ScrollArea className="h-60" ref={scrollRef}>
        {children || (items?.map((item: any, i: number) => (
          <div key={i} className="text-sm p-1">{item}</div>
        )) || <div className="text-sm text-gray-400">No items yet.</div>)}
      </ScrollArea>
    </div>
  );
}
