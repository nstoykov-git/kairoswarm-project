"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Bot, Send, Users, Brain } from "lucide-react";
import { supabase } from "@/lib/supabase";


const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

export default function KairoswarmDashboard() {
  const [input, setInput] = useState("");
  const [joinName, setJoinName] = useState("");
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const [swarmId, setSwarmId] = useState("default");
  const [swarmIdInput, setSwarmIdInput] = useState("");
  const [showParticipants, setShowParticipants] = useState(false);
  const [memories, setMemories] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [swarms, setSwarms] = useState<any[]>([]);
  const [isWideScreen, setIsWideScreen] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const participantsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsWideScreen(window.innerWidth >= 768);
    }
  }, []);

  useEffect(() => {
  const fetchSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user?.email) {
      setUserEmail(session.user.email);
    }
  };

  fetchSession();
}, []);

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
  const storedEmail = localStorage.getItem("kairoswarm_user_email") || "";
  setUserEmail(storedEmail);
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

const handleCreateSwarm = async () => {
  const name = prompt("Enter swarm name:");
  if (!name || !userId) return;

  const res = await fetch(`${API_BASE_URL}/swarm/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, creator_id: userId })
  });

  const data = await res.json();
  if (data.status === "created") {
    alert(`Swarm "${name}" created!`);
    setSwarmId(data.id);
    setSwarmIdInput(data.id);
    localStorage.setItem("kairoswarm_swarm_id", data.id);
  } else {
    alert(`Failed to create swarm: ${data.message}`);
  }
};

  const handleJoin = async () => {
  if (!joinName.trim() || !userId) return;
  const finalSwarmId = swarmIdInput.trim() || "default";

  const res = await fetch(`${API_BASE_URL}/swarm/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: joinName,
      swarm_id: finalSwarmId,
      user_id: userId,
    }),
  });
  const data = await res.json();
  if (data.status === "joined") {
    setSwarmId(finalSwarmId);
    localStorage.setItem("kairoswarm_swarm_id", finalSwarmId);
    localStorage.setItem("kairoswarm_user_id", userId);
    setParticipantId(data.participant_id); // You may optionally return this from backend
    localStorage.setItem("kairoswarm_pid", data.participant_id);
  }
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
      body: JSON.stringify({ agentId, swarm_id: finalSwarmId, user_id: userId })
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

  const handleViewAgents = async () => {
    const res = await fetch(`${API_BASE_URL}/get-agents?user_id=${userId}`);
    const data = await res.json();
    if (data.agents) setAgents(data.agents);
  };

  const handleReloadAgent = async (aid: string) => {
    const res = await fetch(`${API_BASE_URL}/reload-agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ swarm_id: swarmId, agent_id: aid })
    });
    const data = await res.json();
    alert(data.status === "ok" ? "Agent reloaded!" : data.message);
  };

const handleViewSwarms = async () => {
  const res = await fetch(`${API_BASE_URL}/swarm/user-swarms?user_id=${userId}`);
  const data = await res.json();
  if (data.swarms) setSwarms(data.swarms);
};

  const handleClearSwarm = async () => {
    await fetch(`${API_BASE_URL}/debug/clear-ephemeral?swarm_id=${swarmId}`, { method: "POST" });
    setTape([]);
    setParticipants([]);
  };

return (
  <div className="flex flex-col min-h-screen bg-gray-900 text-white overflow-x-hidden">
    {/* Top Navbar */}
    <div className="flex justify-between items-center p-4 border-b border-gray-700">
      <h1
        className="text-xl font-bold cursor-pointer"
        onClick={() => (window.location.href = "/")}
      >
        Kairoswarm
      </h1>
      <div className="flex items-center space-x-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.location.href = "/auth")}
        >
          🔐 Auth
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (window.location.href = "/auth?demo=true")}
        >
          🎟️ Demo
        </Button>
        <Button
          variant="ghost"
          className="md:hidden"
          onClick={() => setShowParticipants(!showParticipants)}
        >
          <Users className="w-5 h-5" />
        </Button>
        {userEmail && (
          <>
            <p className="text-sm text-gray-400 hidden md:inline">
              Signed in as <span className="text-white">{userEmail}</span>
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem("kairoswarm_user_id");
                localStorage.removeItem("kairoswarm_user_email");
                window.location.reload();
              }}
            >
              🚪 Sign Out
            </Button>
          </>
        )}
      </div>
    </div>

    {/* Main Layout */}
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel (Participants) */}
      {(showParticipants || isWideScreen) && (
        <div className="w-full md:w-64 bg-gray-800 p-4 flex flex-col">
          <h2 className="text-lg font-semibold mb-4">Participants</h2>
          <ScrollArea
            className="flex-1 space-y-2 overflow-y-auto pr-1"
            ref={participantsScrollRef}
          >
            {participants.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center space-x-2 p-3">
                  {p.type === "human" ? (
                    <User className="text-green-400" />
                  ) : (
                    <Bot className="text-blue-400" />
                  )}
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-gray-400">
                      {p.type === "human" ? "Active" : "Agent"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>

          {/* Inputs and agent management */}
          <div className="mt-4 flex flex-col space-y-2">
            <Input
              placeholder="Join as..."
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="text-sm"
            />
            <Input
              placeholder="Swarm ID"
              value={swarmIdInput}
              onChange={(e) => setSwarmIdInput(e.target.value)}
              className="text-sm"
            />
            <Button variant="secondary" onClick={handleJoin} className="text-sm">
              Join
            </Button>

            <Button
              variant="secondary"
              className="text-sm"
              onClick={handleCreateSwarm}
            >
              ➕ Create Swarm
            </Button>

            <Input
              placeholder="Add AI (agent ID)"
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className="text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Tip: You can add your own or anyone else's agent ID.
            </p>
            <Button
              variant="secondary"
              onClick={handleAddAgent}
              className="text-sm"
            >
              Add AI
            </Button>
            <Button
              variant="secondary"
              onClick={handleViewMemories}
              className="text-sm flex items-center gap-1"
            >
              <Brain className="w-4 h-4" />
              View Memories
            </Button>
            <Button
              variant="secondary"
              onClick={handleViewAgents}
              className="text-sm"
            >
              📜 View Agents
            </Button>
            <Button
              variant="secondary"
              onClick={handleViewSwarms}
              className="text-sm"
            >
              🕸 View Swarms
            </Button>
            <Button
              variant="ghost"
              onClick={handleClearSwarm}
              className="text-xs text-red-400"
            >
              🧼 Clear Swarm
            </Button>
          </div>

          {/* Agent list */}
          <h2 className="text-lg font-semibold mt-6 mb-2">Your Agents</h2>
          <ScrollArea className="flex-1 space-y-2 overflow-y-auto pr-1 max-h-40">
            {agents.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex flex-col space-y-1 p-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-white">{a.name}</span>
                    <code className="text-xs text-gray-400">{a.model}</code>
                  </div>
                  <div className="text-xs text-gray-400 break-all">{a.id}</div>
                  <div className="flex gap-1 mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs"
                      onClick={() => setAgentId(a.id)}
                    >
                      Use
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => handleReloadAgent(a.id)}
                    >
                      ♻️ Hot-Swap
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </ScrollArea>
        </div>
      )}

      {/* Main View */}
      <div className="flex-1 flex flex-col p-4">
        <h2 className="text-lg font-semibold mb-4">Tape</h2>
        <ScrollArea
          className="flex-1 space-y-2 overflow-auto pr-2"
          ref={scrollRef}
        >
          {Array.isArray(tape) &&
            tape.map((entry, index) => {
              const from =
                typeof entry.from === "string" ? entry.from : "Unknown";
              const message =
                typeof entry.message === "string"
                  ? entry.message
                  : "[No message]";
              return (
                <div key={index} className="mb-2">
                  <span className="font-bold text-white">{from}</span>:{" "}
                  <span className="text-gray-200">{message}</span>
                </div>
              );
            })}

          {Array.isArray(memories) && memories.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">🔍 Retrieved Memories</h2>
              {memories.map((mem, index) => {
                const type =
                  typeof mem.type === "string" ? mem.type : "Memory";
                const content =
                  typeof mem.content === "string" ? mem.content : "[No content]";
                const createdAt = mem.created_at
                  ? new Date(mem.created_at).toLocaleString()
                  : "Unknown time";
                return (
                  <div
                    key={index}
                    className="text-sm text-gray-300 mb-1 border-b border-gray-600 pb-1"
                  >
                    <strong>{type}</strong>: {content}{" "}
                    <span className="text-xs text-gray-500">({createdAt})</span>
                  </div>
                );
              })}
            </div>
          )}

          {Array.isArray(swarms) && swarms.length > 0 && (
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">🕸 Your Swarms</h2>
              {swarms.map((s, i) => {
                const name =
                  typeof s.name === "string" ? s.name : "Unnamed";
                const createdAt = s.created_at
                  ? new Date(s.created_at).toLocaleString()
                  : "Unknown date";
                return (
                  <div key={i} className="text-sm text-gray-300 mb-1">
                    <strong>{name}</strong>{" "}
                    <span className="text-xs text-gray-500">
                      ({createdAt})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="mt-4 flex space-x-2">
          <Input
            placeholder="Speak to the swarm..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
          />
          <Button variant="secondary" onClick={handleSubmit}>
            <Send className="w-4 h-4 mr-1" /> Send
          </Button>
        </div>
      </div>
    </div>
  </div>
);
}
