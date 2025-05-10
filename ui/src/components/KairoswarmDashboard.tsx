// src/components/KairoswarmDashboard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, User, Bot, PlusCircle, Users } from "lucide-react";

const BASE_URL = "https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run";

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState(
    [
      { id: 1, name: "Nina", type: "human" },
      { id: 2, name: "KAI-5", type: "agent" },
    ]
  );
  const [tape, setTape] = useState(
    [
      { id: 1, type: "human", name: "Nina", text: "Hey team, ready to begin?" },
      { id: 2, type: "agent", name: "KAI-5", text: "Affirmative. Lecture mode engaged." },
    ]
  );

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // restore participantId from localStorage
  useEffect(() => {
    const pid = localStorage.getItem("kairoswarm_pid");
    if (pid) setParticipantId(pid);
  }, []);

  // auto-scroll on new tape entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tape]);

  const handleJoin = async () => {
    if (!joinName.trim()) return;

    const res = await fetch(`${BASE_URL}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: joinName, type: "human" }),
    });
    const data = await res.json();
    setParticipantId(data.participant_id);
    localStorage.setItem("kairoswarm_pid", data.participant_id);

    setParticipants(prev => [
      ...prev,
      { id: prev.length + 1, name: joinName, type: "human" },
    ]);
    setJoinName("");
  };

  const handleSubmit = async () => {
    if (!input.trim() || !participantId) {
      alert("Please join the swarm before sending a message.");
      return;
    }

    const res = await fetch(`${BASE_URL}/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        participant_id: participantId,
        message: input,
      }),
    });
    const data = await res.json();
    if (data.entry) {
      setTape(prev => [
        ...prev,
        {
          id: prev.length + 1,
          type: data.entry.type,
          name: data.entry.from,
          text: data.entry.message,
        },
      ]);
    }
    setInput("");
  };

  const handleAddAgent = async () => {
    if (!agentId.trim()) return;

    const res = await fetch(`${BASE_URL}/add-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    const data = await res.json();
    if (data.name) {
      setParticipants(prev => [
        ...prev,
        { id: prev.length + 1, name: data.name, type: "agent" },
      ]);
      setTape(prev => [
        ...prev,
        {
          id: prev.length + 1,
          type: "agent",
          name: data.name,
          text: "Hello, I've joined the swarm.",
        },
      ]);
      setAgentId("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white p-4 space-y-4">
      <header className="flex justify-between items-center border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold">Kairoswarm Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="text-sm text-gray-400 hidden md:block">Mode: Lecture</div>
          <Button variant="ghost" onClick={() => setShowParticipants(v => !v)} className="md:hidden">
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 space-x-4 overflow-hidden relative">
        {/* Sidebar (desktop) */}
        <aside className="basis-1/4 min-w-[220px] max-w-[300px] bg-gray-800 rounded-2xl p-4 shadow-md hidden md:block">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
            {participants.map(p => (
              <Card key={p.id}>
                <CardContent className="flex items-center space-x-2 p-3">
                  {p.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.type === "human" ? "Active" : "Agent"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-4 flex space-x-2">
            <Input
              placeholder="Join as..."
              value={joinName}
              onChange={e => setJoinName(e.target.value)}
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
              onChange={e => setAgentId(e.target.value)}
              className="text-sm"
            />
            <Button variant="secondary" onClick={handleAddAgent}>
              <PlusCircle className="w-4 h-4 mr-1" /> Add AI
            </Button>
          </div>
        </aside>

        {/* Participants overlay (mobile) */}
        {showParticipants && (
          <div className="absolute top-0 left-0 w-full bg-gray-800 rounded-2xl p-4 shadow-md z-10 md:hidden">
            <h2 className="text-lg font-semibold mb-4">Participants</h2>
            <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-1">
              {participants.map(p => (
                <Card key={p.id}>
                  <CardContent className="flex items-center space-x-2 p-3">
                    {p.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-gray-400">
                        {p.type === "human" ? "Active" : "Agent"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Tape panel */}
        <section className="flex-1 bg-gray-850 rounded-2xl p-4 shadow-inner overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Tape</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2" ref={scrollRef}>
            {tape.map(entry => (
              <div key={entry.id} className="flex items-start space-x-2">
                {entry.type === "human" ? (
                  <User className="text-green-400" />
                ) : (
                  <Bot className="text-blue-400" />
                )}
                <div>
                  <p className="font-medium text-sm">{entry.name}</p>
                  <p className="text-sm text-gray-200">{entry.text}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </section>
      </div>

      {/* Input bar */}
      <footer className="flex items-center space-x-2 border-t border-gray-700 pt-2">
        <Input
          placeholder="Speak to the swarm..."
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSubmit}>
          <Send className="w-4 h-4 mr-1" /> Send
        </Button>
      </footer>
    </div>
  );
}
