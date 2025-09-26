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
const VAD_SILENCE_MS = 800;
const VAD_ENERGY_THRESHOLD = 0.01;

export default function SingleAgentFromSwarm() {
  const searchParams = useSearchParams();
  const swarmIdParam = searchParams.get("swarm_id");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [micUnlocked, setMicUnlocked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const endAudioSentRef = useRef(false);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!swarmIdParam) return;

    const fetchAgentFromSwarm = async () => {
      try {
        const participantsRes = await fetch(`${API_INTERNAL_URL}/participants-full?swarm_id=${swarmIdParam}`);
        const participants = await participantsRes.json();
        const agentParticipant = participants.find((p: any) => p.type === "agent");
        if (!agentParticipant) throw new Error("No agent participant found");

        const agentName = agentParticipant.name;
        if (!agentName) throw new Error("Agent name missing from participant");

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
      } catch (err) {
        console.error("Failed to fetch agent from swarm", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentFromSwarm();
  }, [swarmIdParam]);

  const handleMicUnlock = async () => {
    if (!participantId || !swarmIdParam) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      console.log("🎚️ AudioContext sample rate:", audioCtxRef.current.sampleRate);
    }

    await audioCtxRef.current.resume();

    const wsUrl = API_INTERNAL_URL!.replace(/^http/, "ws") + "/voice";
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      wsRef.current?.send(
        JSON.stringify({ swarm_id: swarmIdParam, participant_id: participantId, type: "human" })
      );

      // 🔁 Auto-intro logic: match SingleAgentIntro.tsx
      if (!sessionStorage.getItem("introSent")) {
        setTimeout(() => {
          wsRef.current?.send(JSON.stringify({ event: "__auto_intro_request__" }));
          sessionStorage.setItem("introSent", "true");
        }, 1000);
      }
    };


    wsRef.current.onmessage = async (event) => {
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
      if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
        const buf = await event.data.arrayBuffer();
        wsRef.current.send(buf);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      if (!endAudioSentRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ event: "end_audio" }));
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
    setMicUnlocked(true);
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
              isPortrait ? "h-full w-auto object-top transform scale-150" : "w-full max-w-screen-xl"
            }`}
            autoPlay
            loop
            muted
            playsInline
          />
        )}
        {!micUnlocked && (
          <div
            className="absolute bottom-24 px-6 py-4 text-center bg-white/10 text-white rounded-xl shadow-lg cursor-pointer hover:bg-white/20"
            onClick={handleMicUnlock}
          >
            <h2 className="text-xl font-semibold">🎤 Tap to start talking</h2>
            <p className="text-sm mt-1 opacity-80">We’ll auto-record when you speak.</p>
          </div>
        )}
      </div>
      <div className="absolute bottom-6 right-6 z-50">
        <button
          onClick={() =>
            window.open(`https://kairoswarm.com/?swarm_id=${swarmIdParam}`, "_blank")
          }
          className="bg-black/50 text-white px-4 py-2 rounded-full text-sm hover:bg-black/70 transition"
        >
          📜 Transcript
        </button>
      </div>
    </div>
  );
}
