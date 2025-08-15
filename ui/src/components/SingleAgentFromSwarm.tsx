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

export default function SingleAgentFromSwarm() {
  const searchParams = useSearchParams();
  const swarmId = searchParams.get("swarm_id");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioUnlockedRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Fetch agent & join swarm
  useEffect(() => {
    if (!swarmId) return;

    const fetchAndJoin = async () => {
      try {
        // 1️⃣ Get participants
        const participantsRes = await fetch(
          `${API_INTERNAL_URL}/participants-full?swarm_id=${swarmId}`
        );
        const participants = await participantsRes.json();
        const agentParticipant = participants.find((p: any) => p.type === "agent");
        if (!agentParticipant) throw new Error("No agent participant found");

        const metadata = agentParticipant.metadata || {};
        setAgent({
          id: agentParticipant.id,
          name: metadata.name,
          video_url: metadata.video_url || undefined,
          media_mime_type: metadata.media_mime_type || undefined,
          orientation: metadata.orientation || "landscape",
        });

        // 2️⃣ Join swarm as Guest
        const joinRes = await fetch(`${API_INTERNAL_URL}/swarm/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            swarm_id: swarmId,
            name: "Guest",
            user_id: null,
          }),
        });

        if (!joinRes.ok) throw new Error(`Join failed: ${joinRes.status}`);
        const joinData = await joinRes.json();
        setParticipantId(joinData.participant_id);
      } catch (err) {
        console.error("❌ Failed to load agent from swarm:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndJoin();
  }, [swarmId]);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  const toggleRecording = async () => {
    if (!participantId || !swarmId) return;

    if (recording) {
      stopRecording();
      return;
    }

    // Unlock audio context (Safari fix)
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
      {/* Background */}
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

      {/* Foreground */}
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
