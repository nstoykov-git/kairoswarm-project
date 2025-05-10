// KairoswarmDashboard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Send, User, Bot, PlusCircle, Users } from "lucide-react";

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [tape]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const response = await fetch("https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run/tape");
      const data = await response.json();
      setTape(data);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

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

    const data = await response.json();
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

    const newParticipant = {
      id: participants.length + 1,
      name: joinName,
      type: "human",
    };
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
      const newAgent = {
        id: participants.length + 1,
        name: data.name,
        type: "agent",
      };
      setParticipants((prev) => [...prev, newAgent]);
      setAgentId("");
    }
  };

  const handleNukeRedis = async () => {
    await fetch("https://nstoykov-git--kairoswarm-serverless-api-serve-api.modal.run/debug/nuke", {
      method: "POST"
    });
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
          <div className="text-sm text-gray-400 hidden md:block">Mode: Lecture</div>
          <Button variant="ghost" onClick={() => setShowParticipants((prev) => !prev)} className="md:hidden">
            <Users className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-1 space-x-4 overflow-hidden relative">
        <div className="basis-1/4 min-w-[220px] max-w-[300px] bg-gray-800 rounded-2xl p-4 shadow-md hidden md:block">
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

        {showParticipants && (
          <div className="absolute top-0 left-0 w-full bg-gray-800 rounded-2xl p-4 shadow-md z-10 md:hidden">
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
          </div>
        )}

        <div className="flex-1 bg-gray-850 rounded-2xl p-4 shadow-inner overflow-hidden flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Tape</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-auto pr-2 transition-none" ref={scrollRef}>
            {tape.map((entry, index) => (
              <div key={`${entry.from}-${index}`} className="flex items-start space-x-2">
                {entry.type === "human" ? <User className="text-green-400" /> : <Bot className="text-blue-400" />}
                <div>
                  <p className="font-medium text-sm">{entry.name || entry.from}</p>
                  <p className="text-sm text-gray-200">{entry.text || entry.message}</p>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </div>

      <div className="flex items-center space-x-2 border-t border-gray-700 pt-2">
        <Input
          placeholder="Speak to the swarm..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button onClick={handleSubmit}>
          <Send className="w-4 h-4 mr-1" /> Send
        </Button>
      </div>
    </div>
  );
}
