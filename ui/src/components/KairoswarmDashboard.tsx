// src/components/KairoswarmDashboard.tsx
"use client"

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Send, Users, Bot, PlusCircle, Eye, Copy
} from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useUser } from '@/context/UserContext';
import { Suspense } from "react"
import TopBar from '@/components/TopBar';

const API_BASE_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;
const VAD_SILENCE_MS = 800;
const VAD_ENERGY_THRESHOLD = 0.01;

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

  const refreshParticipants = async (swarmId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`);
      const data = await res.json();
      if (Array.isArray(data)) setParticipants(data);
    } catch (err) {
      console.error("[refreshParticipants] Error:", err);
    }
  };

  const wsRef = useRef<WebSocket | null>(null);
  const [liveMessage, setLiveMessage] = useState<{ from: string, text: string, agent_id: string } | null>(null);

  // 🎤 Voice refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wsVoiceRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const endAudioSentRef = useRef(false);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const [isRecording, setIsRecording] = useState(false);

    useEffect(() => {
    if (!swarmId) {
      setSwarmId("default");
    }
  }, [swarmId]);

  useEffect(() => {
    if (swarmId) {
      fetchSwarmData(swarmId);
    }
  }, [swarmId]);

  // WS for /speak (text messages, partial/final updates)
  useEffect(() => {
    if (!participantId || !swarmId) return;

    const ws = new WebSocket(`${API_BASE_URL?.replace(/^http/, 'ws')}/speak`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({
        swarm_id: swarmId,
        participant_id: participantId,
        type: "human"
      }));
      console.log("🧠 WebSocket connected to /speak");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log("[WS] Parsed message:", msg);

        if (msg.ws_message_type === "partial") {
          setLiveMessage({
            from: msg.from,
            text: msg.message,
            agent_id: msg.agent_id
          });
        } else if (msg.ws_message_type === "final") {
          setLiveMessage(null);
          fetchSwarmData(swarmId);
        } else if (msg.ws_message_type === "error") {
          console.error("[WS] Error message:", msg.detail);
        }
      } catch (err) {
        console.error("[WS] Failed to parse message:", err, event.data);
      }
    };

    ws.onclose = () => {
      console.warn("🧠 WebSocket disconnected.");
      wsRef.current = null;
    };

    return () => {
      ws.close();
    };
  }, [participantId, swarmId]);

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
    await refreshParticipants(swarmId);

    // 🔄 Ensure all agents are reloaded into Redis
    const participantsRes = await fetch(`${API_BASE_URL}/participants-full?swarm_id=${swarmId}`);
    const participantsData = await participantsRes.json();
    for (const p of participantsData) {
      if (p.type === "agent") {
        await fetch(`${API_BASE_URL}/swarm/reload-agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swarm_id: swarmId,
            agent_id: p.metadata?.agent_id || p.id,
          }),
        });
      }
    }
  }
};

  // 🎤 Start/stop voice (toggle with VAD)
  const handleToggleVoice = async () => {
    if (!participantId || !swarmId) return;

    if (isRecording) {
      // ⏹ Stop
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (!endAudioSentRef.current && wsVoiceRef.current?.readyState === WebSocket.OPEN) {
        wsVoiceRef.current.send(JSON.stringify({ event: "end_audio" }));
        endAudioSentRef.current = true;
      }
      wsVoiceRef.current?.close();
      wsVoiceRef.current = null;
      setIsRecording(false);
      console.log("⏹ Voice stopped, back to text mode");
      return;
    }

    // 🎤 Start
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      console.log("🎚️ AudioContext sample rate:", audioCtxRef.current.sampleRate);
    }
    await audioCtxRef.current.resume();

    const wsUrl = API_BASE_URL!.replace(/^http/, "ws") + "/voice";
    wsVoiceRef.current = new WebSocket(wsUrl);
    wsVoiceRef.current.binaryType = "arraybuffer";

    wsVoiceRef.current.onopen = () => {
      wsVoiceRef.current?.send(
        JSON.stringify({ swarm_id: swarmId, participant_id: participantId, type: "human" })
      );
      console.log("🎤 Voice WebSocket opened");
    };

    wsVoiceRef.current.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
        console.log("[Agent reply]", msg);
      } else {
        const audioBytes = new Uint8Array(event.data);
        console.log("🎧 Incoming audio chunk size:", audioBytes.length);
        audioQueueRef.current.push(audioBytes);
        if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
        playNextInQueue(audioCtxRef.current!, audioQueueRef, isPlayingRef);
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const sourceNode = audioCtxRef.current.createMediaStreamSource(stream);
    const analyser = audioCtxRef.current.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect(analyser);

    const data = new Uint8Array(analyser.fftSize);

    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    mediaRecorderRef.current.ondataavailable = async (event) => {
      if (event.data.size > 0 && wsVoiceRef.current?.readyState === WebSocket.OPEN) {
        const buf = await event.data.arrayBuffer();
        wsVoiceRef.current.send(buf);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      if (!endAudioSentRef.current && wsVoiceRef.current?.readyState === WebSocket.OPEN) {
        wsVoiceRef.current.send(JSON.stringify({ event: "end_audio" }));
        endAudioSentRef.current = true;
      }
    };

    const vadLoop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const val = (data[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > VAD_ENERGY_THRESHOLD) {
        if (mediaRecorderRef.current?.state === "inactive") {
          endAudioSentRef.current = false;
          mediaRecorderRef.current.start(50);
        }
        if (silenceTimer.current) {
          clearTimeout(silenceTimer.current);
        }
        silenceTimer.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            try {
              mediaRecorderRef.current.requestData();
              setTimeout(() => {
                if (mediaRecorderRef.current?.state === "recording") {
                  mediaRecorderRef.current.stop();
                }
              }, 150);
            } catch (err) {
              console.warn("[VAD] Failed to flush recorder data:", err);
            }
          }
        }, VAD_SILENCE_MS);
      }
      requestAnimationFrame(vadLoop);
    };

    requestAnimationFrame(vadLoop);
    setIsRecording(true);
  };

  async function playNextInQueue(
    audioCtx: AudioContext,
    audioQueueRef: React.MutableRefObject<Uint8Array[]>,
    isPlayingRef: React.MutableRefObject<boolean>
  ) {
    if (isPlayingRef.current) return;

    console.log("📦 Checking queue... Length:", audioQueueRef.current.length);
    const nextChunk = audioQueueRef.current.shift();
    if (!nextChunk) return;

    isPlayingRef.current = true;

    try {
      const fixedBuffer = new ArrayBuffer(nextChunk.byteLength);
      new Uint8Array(fixedBuffer).set(new Uint8Array(nextChunk));
      const blob = new Blob([fixedBuffer], { type: "audio/mpeg" });

      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) => {
        audioCtx.decodeAudioData(arrayBuffer, resolve, reject);
      });

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        playNextInQueue(audioCtx, audioQueueRef, isPlayingRef);
      };

      source.start();
      console.log("▶️ Playing decoded MP3, duration:", audioBuffer.duration.toFixed(2), "seconds");
    } catch (err) {
      console.error("❌ Failed to decode or play MP3 chunk:", err);
      isPlayingRef.current = false;
    }
  }

  const handleSpeak = () => {
    if (!participantId || !input.trim()) return;

    const messageToSend = input;
    setInput(""); // Clear input immediately

    const msgPayload = {
      message: messageToSend
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msgPayload));
    } else {
      console.warn("[Speak] WS not ready — skipping send.");
    }

    // Optimistic render
    setTape(prev => [
      ...prev,
      {
        from: { id: participantId, type: "human" },
        message: messageToSend,
        timestamp: new Date().toISOString(),
        optimistic: true
      }
    ]);
  };

  const handleAddAgent = async () => {
    const agentId = prompt("Enter Kairoswarm Agent ID:");
    if (!agentId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/swarm/add-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, swarm_id: swarmId }),
      });

      const data = await res.json();
      if (data.name) {
        alert(`✅ Agent "${data.name}" added`);
        await refreshParticipants(swarmId);

        // ✅ Reload the newly added agent
        await fetch(`${API_BASE_URL}/swarm/reload-agent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swarm_id: swarmId,
            agent_id: agentId,
          }),
        });
      } else {
        alert("⚠️ Failed to add agent");
      }
    } catch (err) {
      console.error("[handleAddAgent] Error:", err);
      alert("⚠️ Failed to add agent");
    }
  };


  const handleCreateSwarm = async () => {
    const name = prompt("Enter a name for your new swarm:") || "Untitled Swarm";
    try {
      const res = await fetch(`${API_BASE_URL}/swarm/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.id) throw new Error("No swarm ID returned");

      setSwarmId(data.id);
      setParticipantId(null);
      await fetchSwarmData(data.id);

      // ✅ Reload agents right after swarm creation
      const participantsRes = await fetch(
        `${API_BASE_URL}/participants-full?swarm_id=${data.id}`
      );
      const participantsData = await participantsRes.json();
      for (const p of participantsData) {
        if (p.type === "agent") {
          await fetch(`${API_BASE_URL}/swarm/reload-agent`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ swarm_id: data.id, agent_id: p.metadata?.agent_id || p.id }),
          });
        }
      }
    } catch (err) {
      console.error("[handleCreateSwarm] Error:", err);
      alert("⚠️ Failed to create swarm");
    }
  };


  const handleViewSwarm = async () => {
    const newSwarmId = prompt("Enter Swarm ID to view:");
    if (!newSwarmId) return;

    setSwarmId(newSwarmId);
    setParticipantId(null);
    setTape([]);
    setParticipants([]);

    try {
      const [tapeRes, participantsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/tape?swarm_id=${newSwarmId}`),
        fetch(`${API_BASE_URL}/participants-full?swarm_id=${newSwarmId}`),
      ]);

      const tapeData = await tapeRes.json();
      const participantsData = await participantsRes.json();

      if (Array.isArray(tapeData)) {
        setTape(prev => {
          const seen = new Set();
          const merged = [...prev, ...tapeData]
            .filter(msg => {
              const key = (msg.timestamp || "") + msg.message;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            );
          return merged;
        });
      }
      if (Array.isArray(participantsData)) {
        setParticipants(participantsData);

        // ✅ Reload agents immediately after fetching participants
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
    } catch (err) {
      console.error("[handleViewSwarm] Error:", err);
      alert("⚠️ Failed to view swarm");
    }
  };

  const handleEditMemories = () => {
    const inputId = window.prompt("Enter your Agent ID to update memories:");
    if (inputId && inputId.trim().length > 0) {
      router.push(`/agents/${inputId.trim()}/edit-memories`);
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
            style={{ height: '400px' }}
            ref={scrollRef}
          >
            <div className="space-y-2">
              {tape.map((msg, idx) => (
                <div key={`${msg.timestamp}-${idx}`} className="flex flex-col space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {
                        typeof msg.from === "string"
                          ? msg.from
                          : participants.find(p => p.id === msg.from?.id)?.name || "Guest"
                      }:
                    </span>
                    {msg.timestamp && (
                      <span className="text-xs text-gray-400 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                  <div>{typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message)}</div>
                </div>
              ))}

              <AnimatePresence>
                {liveMessage && (
                  <motion.div
                    key={`live-${liveMessage.agent_id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col space-y-0.5 italic text-gray-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">
                        {participants.find(p => p.id === liveMessage.agent_id)?.name || liveMessage.from}:
                      </span>
                      <span className="text-xs font-mono">typing…</span>
                    </div>
                    <div>{liveMessage.text}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </ScrollArea>

          <div className="flex gap-2 items-center">
            <Input
              key={tape.length}
              type="text"
              name="chat-message"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              className="text-white placeholder-gray-400 flex-1"
              value={input}
              placeholder="Say something..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSpeak()}
              disabled={!participantId || isRecording}
            />

            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleVoice}
              disabled={!participantId}
              title={isRecording ? "Stop voice" : "Start voice"}
            >
              {isRecording ? "⏹" : "🎤"}
            </Button>
            <Button
              onClick={handleSpeak}
              disabled={!participantId || isRecording}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            <Button variant="secondary" onClick={() => router.push("/def-tools")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
            <Button variant="secondary" onClick={handleAddAgent}>
              <Bot className="w-4 h-4 mr-2" />
              Add Agent
            </Button>
            <Button variant="secondary" onClick={() => router.push("/publish-agent")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Publish Agents
            </Button>
            <Button variant="secondary" onClick={() => router.push("/update-memories")}>
              🧠 Update Memories
            </Button>
            <Button variant="secondary" onClick={handleCreateSwarm}>
              <PlusCircle className="w-4 h-4 mr-2" />
              New Swarm
            </Button>
            <Button variant="secondary" onClick={handleViewSwarm}>
              <Eye className="w-4 h-4 mr-2" />
              View Swarm
            </Button>
            <Button variant="secondary" onClick={() => router.push("/concierge")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Hire Agents
            </Button>
            <Button variant="secondary" onClick={() => router.push("/concierge?gift=true")}>
              🎁 Gift a Moment
            </Button>
            <Button variant="secondary" onClick={() => router.push("/portal-tools")}>
              <PlusCircle className="w-4 h-4 mr-2" />
              Create Portal
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
                      {p.name}
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
