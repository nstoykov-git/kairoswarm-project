// Updated SingleAgentFromSwarm — aligned with SingleAgentIntro

"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useWavRecorder } from "@/components/useWavRecorder";

const API_INTERNAL_URL = process.env.NEXT_PUBLIC_MODAL_API_URL;
const VAD_DELAY_AFTER_SPEECH = 500;

interface Agent {
  id: string;
  name: string;
  video_url?: string;
  media_mime_type?: string;
  orientation: "portrait" | "landscape";
}

export default function SingleAgentFromSwarm() {
  const searchParams = useSearchParams();
  const swarmIdParam = searchParams.get("swarm_id");

  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [micUnlocked, setMicUnlocked] = useState(false);
  const [micActive, setMicActive] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);

  const { warmUpMic } = useWavRecorder({
    onWavReady: async (wavBlob) => {
      console.log("📼 onWavReady fired (FromSwarm)");
      if (!participantId || !swarmIdParam) return;

      const ws = new WebSocket(API_INTERNAL_URL!.replace(/^http/, "ws") + "/voice");
      ws.binaryType = "arraybuffer";

      ws.onopen = () => {
        ws.send(JSON.stringify({ swarm_id: swarmIdParam, participant_id: participantId, type: "human" }));
        ws.send(wavBlob);
        ws.send(JSON.stringify({ event: "end_audio" }));
      };

      ws.onmessage = async (event) => {
        if (typeof event.data === "string") {
          const msg = JSON.parse(event.data);
          console.log("[Agent reply]", msg);
        } else {
          const audioBytes = new Uint8Array(event.data);
          audioQueueRef.current.push(audioBytes);
          if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
          playNextInQueue(audioCtxRef.current!, audioQueueRef, isPlayingRef);
        }
      };
    },
    onSpeakingChange: (speaking) => {
      setMicActive(speaking);
    },
  });

  useEffect(() => {
    if (!swarmIdParam) return;

    const fetchAgentAndJoin = async () => {
      try {
        const participantsRes = await fetch(`${API_INTERNAL_URL}/participants-full?swarm_id=${swarmIdParam}`);
        const participants = await participantsRes.json();
        const agentParticipant = participants.find((p: any) => p.type === "agent");
        if (!agentParticipant) throw new Error("No agent participant found");

        const agentName = agentParticipant.name;
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
          body: JSON.stringify({ swarm_id: swarmIdParam, name: "Guest", user_id: null }),
        });

        const joinData = await joinRes.json();
        setParticipantId(joinData.participant_id);
      } catch (err) {
        console.error("Failed to fetch/join agent", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgentAndJoin();
  }, [swarmIdParam]);

  const handleMicUnlock = async () => {
    if (!participantId || !swarmIdParam) return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    }
    await audioCtxRef.current.resume();

    const wsUrl = API_INTERNAL_URL!.replace(/^http/, "ws") + "/voice";
    wsRef.current = new WebSocket(wsUrl);
    wsRef.current.binaryType = "arraybuffer";

    wsRef.current.onopen = () => {
      wsRef.current?.send(
        JSON.stringify({ swarm_id: swarmIdParam, participant_id: participantId, type: "human" })
      );
      warmUpMic();

      if (!sessionStorage.getItem("introSent")) {
        wsRef.current?.send(JSON.stringify({ event: "__auto_intro_request__" }));
        sessionStorage.setItem("introSent", "true");
      }
    };

    wsRef.current.onmessage = async (event) => {
      if (typeof event.data === "string") {
        const msg = JSON.parse(event.data);
      } else {
        const audioBytes = new Uint8Array(event.data);
        audioQueueRef.current.push(audioBytes);
        if (audioCtxRef.current?.state === "suspended") await audioCtxRef.current.resume();
        playNextInQueue(audioCtxRef.current!, audioQueueRef, isPlayingRef);
      }
    };

    setMicUnlocked(true);
  };

  async function playNextInQueue(
    audioCtx: AudioContext,
    audioQueueRef: React.MutableRefObject<Uint8Array[]>,
    isPlayingRef: React.MutableRefObject<boolean>
  ) {
    if (isPlayingRef.current) return;
    const nextChunk = audioQueueRef.current.shift();
    if (!nextChunk) return;

    isPlayingRef.current = true;

    try {
      const fixedBuffer = new ArrayBuffer(nextChunk.byteLength);
      new Uint8Array(fixedBuffer).set(nextChunk);
      const blob = new Blob([fixedBuffer], { type: "audio/mpeg" });
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      source.onended = () => {
        isPlayingRef.current = false;
        playNextInQueue(audioCtx, audioQueueRef, isPlayingRef);
      };
      source.start();
    } catch (err) {
      console.error("❌ Failed to decode/play audio chunk:", err);
      isPlayingRef.current = false;
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen text-white bg-black">Loading agent...</div>;
  }

  if (!agent) {
    return <div className="flex items-center justify-center h-screen text-white bg-black">Agent not found.</div>;
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
        {hasMedia && (
          agent.media_mime_type!.startsWith("video/") ? (
            <video
              src={agent.video_url}
              className={`rounded-xl shadow-2xl object-cover ${
                isPortrait ? "h-full w-auto object-top scale-150" : "w-full max-w-screen-xl"
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
                isPortrait ? "h-full w-auto object-top scale-150" : "w-full max-w-screen-xl"
              }`}
            />
          )
        )}

        {!micUnlocked && (
          <div
            onClick={handleMicUnlock}
            className="absolute bottom-24 px-6 py-4 text-center bg-white/10 text-white rounded-xl shadow-lg cursor-pointer hover:bg-white/20"
          >
            <h2 className="text-xl font-semibold">🎤 Tap to start talking</h2>
            <p className="text-sm mt-1 opacity-80">We’ll auto-record when you speak.</p>
          </div>
        )}

        {micActive && <div className="absolute bottom-36 text-green-400 text-sm">🎙️ Listening...</div>}
      </div>
    </div>
  );
}
