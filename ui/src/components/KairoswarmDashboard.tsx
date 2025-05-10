// KairoswarmDashboard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Bot, PlusCircle, Users } from "lucide-react";

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const storedPid = localStorage.getItem("kairoswarm_pid");
    if (storedPid) {
      setParticipantId(storedPid);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch("https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run/tape");
      const data = await res.json();
      setTape(data);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tape]);

  const handleSubmit = async () => {
    if (!input.trim() || !participantId) {
      alert("Please join the swarm before sending a message.");
      return;
    }

    const response = await fetch("https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participant_id: participantId, message: input }),
    });

    setInput("");
  };

  const handleJoin = async () => {
    if (!joinName.trim()) return;

    const response = await fetch("https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName, type: "human" }),
    });

    const data = await response.json();
    if (!data.participant_id) {
      alert("Join failed.");
      return;
    }

    setParticipantId(data.participant_id);
    localStorage.setItem("kairoswarm_pid", data.participant_id);
    const newParticipant = { id: participants.length + 1, name: joinName, type: "human" };
    setParticipants((prev) => [...prev, newParticipant]);
    setJoinName("");
  };

  const handleAddAgent = async () => {
    if (!agentId.trim()) return;
    const response = await fetch("https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run/add-agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });

    const data = await response.json();
    if (data.name) {
      const newAgent = { id: participants.length + 1, name: data.name, type: "agent" };
      setParticipants((prev) => [...prev, newAgent]);
      setAgentId("");
    }
  };

  return (
    <div style={{ padding: 16, backgroundColor: "#111", color: "#fff", height: "100vh", display: "flex", flexDirection: "column" }}>
      <h1 style={{ fontSize: 20, fontWeight: "bold" }}>Kairoswarm Dashboard</h1>

      <div style={{ display: "flex", flex: 1, marginTop: 16, overflow: "hidden" }}>
        <div style={{ width: 250, paddingRight: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: "bold" }}>Participants</h2>
          <ul>
            {participants.map((p) => (
              <li key={p.id}>
                {p.type === "human" ? "🟢" : "🤖"} {p.name}
              </li>
            ))}
          </ul>
          <input placeholder="Join as..." value={joinName} onChange={(e) => setJoinName(e.target.value)} />
          <button onClick={handleJoin}>Join</button>
          <input placeholder="Add AI (agent ID)" value={agentId} onChange={(e) => setAgentId(e.target.value)} />
          <button onClick={handleAddAgent}>Add AI</button>
        </div>

        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", paddingLeft: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: "bold" }}>Tape</h2>
          <ul>
            {tape.map((entry, i) => (
              <li key={i}>
                {entry.type === "human" ? "🟢" : "🤖"} <strong>{entry.name || entry.from}:</strong> {entry.text || entry.message}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div style={{ display: "flex", marginTop: 8 }}>
        <input
          placeholder="Speak to the swarm..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1 }}
        />
        <button onClick={handleSubmit}>Send</button>
      </div>
    </div>
  );
}
