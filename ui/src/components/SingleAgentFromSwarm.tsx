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

// 🎨 Gradients for no-media fallback
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

export default function SingleAgentFromSwarm() {
  const searchParams = useSearchParams();
  const swarmIdParam = searchParams.get("swarm_id");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [swarmId, setSwarmId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // 1️⃣ Fetch agent ID from participants, then load details via /by-ids
  useEffect(() => {
    if (!swarmIdParam) return;

    const init = async () => {
      try {
        const participantsRes = await fetch(
          `${API_INTERNAL_URL}/participants-full?swarm_id=${swarmIdParam}`
        );
        const participants = await participantsRes.json();

        const agentParticipant = participants.find((p: any) => p.type === "agent");
        if (!agentParticipant) throw new Error("No agent participant found");

        const agentId = agentParticipant.metadata?.agent_id || agentParticipant.id;

        // Fetch authoritative agent data via /by-ids
        const agentRes = await fetch(`${API_INTERNAL_URL}/swarm/agents/by-ids`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [agentId] }),
        });
        const agentData = await agentRes.json();

        if (Array.isArray(agentData.agents) && agentData.agents.length > 0) {
          const a = agentData.agents[0];
          setAgent({
            id: a.id,
            name: a.name,
            video_url: a.video_url || undefined,
            media_mime_type: a.media_mime_type || undefined,
            orientation: a.orientation || "landscape",
          });
        }

        // Join swarm as Guest
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
        setParticipantId(joinData.participant_id);
        setSwarmId(swarmIdParam);
      } catch (err) {
        console.error("Failed to init SingleAgentFromSwarm", err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [swarmIdParam]);

  // Stop recording helper
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  // 🎤 Toggle recording (matches Dashboard behavior)
  const toggleRecording = async () => {
    if (!participantId || !swarmId) return;

    if (recording) {
      stopRecording();
      return;
    }

    // Unlock audio context (Safari requirement)
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
      } catch (err) {
        console.warn("[TTS] Failed to unlock audio context:", err);
      }
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus",
    });
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = async () => {
      try {
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm;codecs=opus",
        });
        const formData = new FormData();
        formData.append("audio", blob, "voice-input.webm");
        formData.append("participant_id", participantId);
        formData.append("swarm_id", swarmId);

        const res = await fetch(`${API_INTERNAL_URL}/voice`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (data.audioBase64 && audioCtxRef.current) {
          const audioBytes = Uint8Array.from(
            atob(data.audioBase64),
            (c) => c.charCodeAt(0)
          );
          const audioBuffer = await audioCtxRef.current.decodeAudioData(audioBytes.buffer);
          const source = audioCtxRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioCtxRef.current.destination);
          source.start(0);
        }
      } catch (err) {
        console.error("[Voice] Error during onstop:", err);
      } finally {
        audioChunksRef.current = [];
      }
    };

    mediaRecorderRef.current.start();
    setRecording(true);
    recordingTimeoutRef.current = setTimeout(stopRecording, MAX_RECORDING_MS);
  };

  // UI
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
    <div className="relative w-full h-screen bg-black overflow-hidden animate-fadeIn">
      {/* Background */}
      {hasMedia ? (
        agent.media_mime_type!.startsWith("video/") ? (
          <video
            src={agent.video_url}
            className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={agent.video_url}
            className="absolute w-full h-full object-cover filter blur-2xl brightness-50"
          />
        )
      ) : (
        <div
          className={`absolute w-full h-full bg-gradient-to-br ${fromColor} ${toColor} filter blur-2xl brightness-75`}
        />
      )}

      {/* Foreground */}
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
