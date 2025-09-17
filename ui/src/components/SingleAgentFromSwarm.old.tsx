"use client";

import { useEffect, useState, useRef } from "react";

interface Agent {
  id: string;
  name: string;
  video_url?: string;
  media_mime_type?: string;
  orientation: "portrait" | "landscape";
}

const API_INTERNAL_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;
const MAX_RECORDING_MS = 30000;

// Gradients to choose from
const GRADIENTS = [
  ["from-pink-800", "to-purple-900"],
  ["from-indigo-900", "to-blue-800"],
  ["from-teal-900", "to-emerald-800"],
  ["from-amber-900", "to-red-800"],
  ["from-sky-900", "to-cyan-800"],
  ["from-fuchsia-900", "to-rose-800"],
];

function gradientForName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

export default function SingleAgentIntro({ agentName }: { agentName: string }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [swarmId, setSwarmId] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // 1️⃣ Fetch agent metadata by name
  useEffect(() => {
    if (!agentName) return;
    const fetchAgent = async () => {
      try {
        const res = await fetch(`${API_INTERNAL_URL}/swarm/agents/by-names`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [agentName] }),
        });
        const data = await res.json();
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          const a = data.agents[0];
          setAgent({
            id: a.id,
            name: a.name,
            video_url: a.video_url || undefined,
            media_mime_type: a.media_mime_type || undefined,
            orientation: a.orientation || "landscape",
          });
        }
      } catch (err) {
        console.error("Failed to fetch agent", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, [agentName]);

  // 2️⃣ Initiate new swarm with this agent + join as Guest
  useEffect(() => {
    if (!agent) return;
    const initAndJoin = async () => {
      try {
        const res = await fetch(`${API_INTERNAL_URL}/swarm/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_ids: [agent.id] }),
        });
        const data = await res.json();
        if (!data.swarm_id) throw new Error("No swarm_id returned");
        setSwarmId(data.swarm_id);

        const joinRes = await fetch(`${API_INTERNAL_URL}/swarm/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swarm_id: data.swarm_id,
            name: "Guest",
            user_id: null,
          }),
        });
        const joinData = await joinRes.json();
        console.log("✅ Joined swarm as Guest:", joinData);
        setParticipantId(joinData.participant_id);
      } catch (err) {
        console.error("Failed to auto-initiate or join swarm", err);
      }
    };
    initAndJoin();
  }, [agent]);

  const stopRecording = () => {
    console.log("[VOICE] stopRecording called");
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);

    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const toggleRecording = async () => {
    console.log("[VOICE] toggleRecording fired", { participantId, swarmId });
    if (!participantId || !swarmId) {
      console.warn("[Voice] Missing participantId or swarmId");
      return;
    }

    if (recording) {
      stopRecording();
      return;
    }

    // Unlock audio context (Safari)
    if (!audioUnlockedRef.current) {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const buffer = audioCtxRef.current.createBuffer(1, 1, 22050);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start(0);
        await audioCtxRef.current.resume();
        audioUnlockedRef.current = true;
        console.debug("[TTS] Audio context unlocked");
      } catch (err) {
        console.warn("[TTS] Failed to unlock audio context:", err);
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });

    // --- WS path ---
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const wsUrl = API_INTERNAL_URL!.replace(/^http/, "ws") + "/voice";
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.binaryType = "arraybuffer";

      wsRef.current.onopen = () => {
        wsRef.current?.send(
          JSON.stringify({
            swarm_id: swarmId,
            participant_id: participantId,
            type: "human",
          })
        );
        console.debug("[WS] Connected to /voice");
      };

      wsRef.current.onmessage = async (event) => {
        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data);
          console.log("[Agent reply]", msg);
        } else {
          const audioBytes = new Uint8Array(event.data);
          const audioBuffer = await audioCtxRef.current!.decodeAudioData(
            audioBytes.buffer
          );
          const source = audioCtxRef.current!.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtxRef.current!.destination);
          source.start(0);
        }
      };
    }

    // 🔊 Handle chunks
    mediaRecorderRef.current.ondataavailable = async (event) => {
      if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        const buf = await event.data.arrayBuffer();
        console.log(`[VOICE] Sending chunk of size: ${buf.byteLength}`);
        wsRef.current.send(buf);
      }
    };

    // 🛑 Ensure end_audio comes last
    mediaRecorderRef.current.onstop = () => {
      console.log("[VOICE] MediaRecorder fully stopped (waiting for last chunk...)");
      setTimeout(() => {
        console.log("[VOICE] Sending end_audio (after final chunk)");
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ event: "end_audio" }));
        }
      }, 250);
    };

    mediaRecorderRef.current.start(250); // stream every 250ms
    setRecording(true);
    recordingTimeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <span className="text-xl animate-pulse">Loading agent...</span>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <span className="text-lg">Agent not found.</span>
      </div>
    );
  }

  const isPortrait = agent.orientation === "portrait";
  const hasMedia = agent.video_url && agent.media_mime_type;
  const [fromColor, toColor] = gradientForName(agent.name);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {hasMedia && agent.media_mime_type!.startsWith("video/") && (
        <video
          src={agent.video_url}
          className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
          autoPlay
          loop
          muted
          playsInline
        />
      )}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {hasMedia ? (
          agent.media_mime_type!.startsWith("video/") ? (
            <video
              src={agent.video_url}
              className={`rounded-xl shadow-2xl object-cover ${
                isPortrait
                  ? "h-full w-auto object-top transform scale-150"
                  : "w-full max-w-screen-xl"
              }`}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={agent.video_url}
              className={`rounded-xl shadow-2xl object-cover ${
                isPortrait
                  ? "h-full w-auto object-top transform scale-150"
                  : "w-full max-w-screen-xl"
              }`}
            />
          )
        ) : (
          <div
            className={`rounded-xl shadow-2xl flex items-center justify-center bg-gradient-to-br ${fromColor} ${toColor} text-white text-3xl font-semibold ${
              isPortrait
                ? "h-full w-auto px-12 py-24"
                : "w-full max-w-screen-xl h-96"
            }`}
          >
            {agent.name}
          </div>
        )}

        <div className="absolute bottom-24 text-center space-y-3">
          <h1 className="text-white text-4xl font-semibold mb-2 drop-shadow-lg">
            {agent.name}
          </h1>
          <div className="flex justify-center gap-4">
            <button
              onClick={() =>
                window.open(`https://kairoswarm.com/?swarm_id=${swarmId}`, "_blank")
              }
              className="text-white text-lg underline hover:opacity-80"
            >
              View Transcript
            </button>
            <button
              onClick={toggleRecording}
              className={`rounded-full p-4 ${
                recording ? "bg-red-600" : "bg-green-600"
              } text-white shadow-lg`}
            >
              {recording ? "⏹ Stop" : "🎤 Talk"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
