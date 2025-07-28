// src/components/KairoswarmDashboard.tsx
"use client"

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send, Users, Bot, PlusCircle, Eye, PanelRightClose, PanelRightOpen, Copy
} from 'lucide-react';
import { useUser } from '@/context/UserContext';
import { Suspense } from "react"
import TopBar from '@/components/TopBar';

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;

function SwarmInfo({ swarmId }: { swarmId: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(swarmId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="text-green-400 text-sm space-y-1">
      <div className="flex items-center space-x-2">
        <span className="font-mono">Swarm ID:</span>
        <span className="font-mono">{swarmId}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="text-green-300 hover:text-green-500 p-1"
        >
          <Copy className="h-4 w-4" />
        </Button>
        {copied && <span className="text-xs text-green-300">Copied!</span>}
      </div>
      <div className="text-white">⏳ Ephemeral swarm expires in 24 hours</div>
    </div>
  )
}

export default function KairoswarmDashboard({ swarmId: swarmIdProp }: { swarmId?: string }) {
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const initialSwarmId = swarmIdProp || searchParams?.get('swarm_id') || 'default';
  const [swarmId, setSwarmId] = useState(initialSwarmId);

  const router = useRouter();
  const { user, loading } = useUser();

  const [input, setInput] = useState('');
  const [joinName, setJoinName] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [tape, setTape] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(true);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const participantsScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reloadAllAgents = async () => {
      const res = await fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`);
      const participantsData = await res.json();
      for (const p of participantsData) {
        if (p.type === 'agent') {
          await fetch(`${API_BASE_URL}/swarm/reload-agent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ swarm_id: swarmId, agent_id: p.metadata?.agent_id || p.id })
          });
        }
      }
    };
    if (swarmId) reloadAllAgents();
  }, [swarmId]);

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
    }, 2000);
    return () => clearInterval(poll);
  }, [swarmId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [tape]);

  const handleJoin = async () => {
    if (!joinName.trim() && !user) return;
    const res = await fetch(`${API_BASE_URL}/swarm/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: joinName || user?.display_name,
        user_id: user?.id,
        swarm_id: swarmId
      })
    });
    const data = await res.json();
    if (data.status === 'joined') {
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

    const res = await fetch(`${API_BASE_URL}/swarm/add-agent`, {
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
      await fetchSwarmData(data.id);
    }
  };

  const handleViewSwarm = async () => {
    const newSwarmId = prompt("Enter Swarm ID to view:");
    if (newSwarmId) {
      setSwarmId(newSwarmId);
      setParticipantId(null);
      setTape([]);
      setParticipants([]);

      const [tapeRes, participantsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tape?swarm_id=${newSwarmId}`),
        fetch(`${API_BASE_URL}/participants-full?swarm_id=${newSwarmId}`),
      ]);

      const tapeData = await tapeRes.json();
      const participantsData = await participantsRes.json();

      if (Array.isArray(tapeData)) setTape(tapeData);
      if (Array.isArray(participantsData)) setParticipants(participantsData);

      for (const p of participantsData) {
        if (p.type === "agent") {
          await fetch(`${API_BASE_URL}/swarm/reload-agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              swarm_id: newSwarmId,
              agent_id: p.metadata?.agent_id || p.id,
            }),
          });
        }
      }
    }
  };

  const fetchSwarmData = async (id: string) => {
    const [tapeRes, participantsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/tape?swarm_id=${id}`),
      fetch(`${API_BASE_URL}/participants-full?swarm_id=${id}`),
    ]);
    const tapeData = await tapeRes.json();
    const participantsData = await participantsRes.json();
    if (Array.isArray(tapeData)) setTape(tapeData);
    if (Array.isArray(participantsData)) setParticipants(participantsData);
  };

  return (
    <div className="p-4 h-screen bg-gray-900 text-white">
      <Suspense fallback={<div />}>
        <TopBar />
      </Suspense>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="col-span-3 flex flex-col space-y-2">
          {swarmId !== "default" && (
            <div className="text-xs text-gray-300 mb-1 space-y-1">
              <div className="flex items-center space-x-2">
                <SwarmInfo swarmId={swarmId} />
              </div>
            </div>
          )}
          {swarmId === "default" && (
            <div className="mt-2 text-xs text-yellow-400">
              🧪 You're in the <code className="font-mono text-white">default</code> swarm — an open space to experiment, speak freely, and remix ideas.
              It’s yours. It’s everyone’s.
            </div>
          )}

          <ScrollArea
            className="flex-1 bg-black rounded-xl p-4 overflow-y-scroll"
            style={{ height: '400px' }} // 👈 Adjust this height as needed
            ref={scrollRef}
          >

            <div className="space-y-2">
              {tape.map((msg, idx) => (
                <div key={msg.timestamp || idx} className="flex flex-col space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{msg.from}:</span>
                    {msg.timestamp && (
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <div>{msg.message}</div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex gap-2">
            <Input
              type="text"
              name="chat-message"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
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
            <Button variant="secondary" onClick={() => router.push("/publish-agent")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Publish AI Agents
            </Button>
            <Button variant="secondary" onClick={() => router.push("/concierge")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Hire AI Agents
            </Button>
            <Button variant="secondary" onClick={() => router.push("/def-tools")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Simulate the Boss
            </Button>
            <Button variant="secondary" className="ml-auto md:hidden" onClick={() => setShowParticipants((prev) => !prev)}>
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
                      {p.name} {p.type === "agent" ? "🧑" : "🧑"} {/*🤖*/}
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            {!participantId && (
              <>
                <Input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  className="bg-white text-black dark:bg-gray-900 dark:text-white placeholder-gray-500"
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
    </div>
  );
}
