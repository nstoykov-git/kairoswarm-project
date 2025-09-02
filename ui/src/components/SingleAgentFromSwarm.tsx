"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";

interface Agent {
  id: string;
  name: string;
  video_url?: string;
  media_mime_type?: string;
  orientation: "portrait" | "landscape";
}

const API_INTERNAL_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;
const MAX_RECORDING_MS = 30000;

// 🚨 Force WebSocket path only
const USE_WS = false;

export default function SingleAgentFromSwarm() {
  const searchParams = useSearchParams();
  const swarmIdParam = searchParams.get("swarm_id");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch agent metadata & join swarm
  useEffect(() => {
    if (!swarmIdParam) return;

    const fetchAgentFromSwarm = async () => {
      try {
        // 1️⃣ Get participants so we know the agent's name
        const participantsRes = await fetch(
          `${API_INTERNAL_URL}/participants-full?swarm_id=${swarmIdParam}`
        );
        const participants = await participantsRes.json();
        const agentParticipant = participants.find((p: any) => p.type === "agent");
        if (!agentParticipant) throw new Error("No agent participant found");

        const agentName = agentParticipant.name;
        if (!agentName) throw new Error("Agent name missing from participant");

        // 2️⃣ Fetch agent details by name
        const agentRes = await fetch(`${API_INTERNAL_URL}/swarm/agents/by-names`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names: [agentName] }),
        });
        const data = await agentRes.json();
        if (!data.agents || data.agents.length === 0) throw new Error("Agent not found");

        const a = data.agents[0];
        setAgent({
          id: a.id,
          name: a.name,
          video_url: a.video_url || undefined,
          media_mime_type: a.media_mime_type || undefined,
          orientation: a.orientation || "landscape",
        });

        // 3️⃣ Join swarm
        const joinRes = await fetch(`${API_INTERNAL_URL}/swarm/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swarm_id: swarmIdParam,
            name: "Guest",
            user_id: null,
          }),
        });
        const joinData = await joinRes.json();
        console.log("✅ Joined swarm as Guest:", joinData);
        setParticipantId(joinData.participant_id);
      } catch (err) {
        console.error("Failed to fetch agent from swarm", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentFromSwarm();
  }, [swarmIdParam]);

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
    console.log("[VOICE] toggleRecording fired", { participantId, swarmIdParam });
    if (!participantId || !swarmIdParam) {
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

    // --- Force WebSocket path ---
    console.log("[VOICE MODE] FORCED WebSocket");
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      const wsUrl = API_INTERNAL_URL!.replace(/^http/, "ws") + "/voice";
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.binaryType = "arraybuffer";

      wsRef.current.onopen = () => {
        wsRef.current?.send(
          JSON.stringify({
            swarm_id: swarmIdParam,
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

      // Delay end_audio until after the final dataavailable fires
      setTimeout(() => {
        console.log("[VOICE] Sending end_audio (after final chunk)");
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ event: "end_audio" }));
        }
      }, 250); // small delay ensures the last chunk is flushed first
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
        {hasMedia && agent.media_mime_type!.startsWith("video/") && (
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
        )}
        <div className="absolute bottom-24 text-center space-y-3">
          <h1 className="text-white text-4xl font-semibold mb-2 drop-shadow-lg">
            {agent.name}
          </h1>
          <div className="flex justify-center gap-4">
            <button
              onClick={() =>
                window.open(`https://kairoswarm.com/?swarm_id=${swarmIdParam}`, "_blank")
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
