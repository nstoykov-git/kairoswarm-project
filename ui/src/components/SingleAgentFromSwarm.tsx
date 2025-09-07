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
  const audioCtx = new AudioContext({ sampleRate: 24000 });
  const wsRef = useRef<WebSocket | null>(null);
  const endAudioSentRef = useRef(false);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const dumpedOnceRef = useRef(false);


  // Fetch agent metadata & join swarm
  useEffect(() => {
    if (!swarmIdParam) return;

    const fetchAgentFromSwarm = async () => {
      try {
        const participantsRes = await fetch(
          `${API_INTERNAL_URL}/participants-full?swarm_id=${swarmIdParam}`
        );
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

  // Unlock mic + audio context on first gesture
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
    };

    wsRef.current.onmessage = async (event) => {
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

  function saveAsWav(pcmData: Int16Array, sampleRate = 24000) {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const wavHeader = new ArrayBuffer(44);
    const view = new DataView(wavHeader);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + pcmData.length * 2, true); // File size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // fmt sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true); // AudioFormat = PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // data sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, pcmData.length * 2, true);

    // Combine header + data
    const wavBytes = new Uint8Array(44 + pcmData.length * 2);
    wavBytes.set(new Uint8Array(wavHeader), 0);
    for (let i = 0; i < pcmData.length; i++) {
      wavBytes[44 + i * 2] = pcmData[i] & 0xff;
      wavBytes[44 + i * 2 + 1] = (pcmData[i] >> 8) & 0xff;
    }

    const blob = new Blob([wavBytes], { type: "audio/wav" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `elevenlabs_output_${Date.now()}.wav`;
    a.click();
  }


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
      // 🔄 Convert Uint8Array → Int16Array
      const buffer = new ArrayBuffer(nextChunk.length);
      const view = new DataView(buffer);
      nextChunk.forEach((b, i) => view.setUint8(i, b));

      const int16Array = new Int16Array(buffer);
      const float32 = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32[i] = int16Array[i] / 32768;
      }

      // 🧪 Debug logs
      console.log("🔬 First 10 PCM16 values:", int16Array.slice(0, 10));
      console.log("🔬 First 10 Float32 values:", float32.slice(0, 10));
      console.log("🎚️ AudioContext sample rate:", audioCtx.sampleRate);

      // 💾 Save this chunk as .wav for debugging
      if (!dumpedOnceRef.current) {
        dumpedOnceRef.current = true;
        saveAsWav(int16Array, 24000);
      }


      // 🎧 Create audio buffer (24kHz mono)
      const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      source.onended = () => {
        isPlayingRef.current = false;
        playNextInQueue(audioCtx, audioQueueRef, isPlayingRef); // 🔁 Play next
      };

      source.start();
      console.log("▶️ Playing chunk, duration:", audioBuffer.duration.toFixed(2), "seconds");
    } catch (err) {
      console.error("❌ Error playing PCM chunk:", err);
      isPlayingRef.current = false;
    }
  }


  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-black text-white"><span className="text-xl animate-pulse">Loading agent...</span></div>;
  }

  if (!agent) {
    return <div className="flex items-center justify-center h-screen bg-black text-white"><span className="text-lg">Agent not found.</span></div>;
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
    </div>
  );
}
