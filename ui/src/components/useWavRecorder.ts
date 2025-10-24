import { useRef, useEffect } from "react";

interface UseWavRecorderOptions {
  onWavReady: (blob: Blob) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

const VAD_SILENCE_MS = 800;
const VAD_ENERGY_THRESHOLD = 0.01;

export function useWavRecorder({ onWavReady, onSpeakingChange }: UseWavRecorderOptions) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimer = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);

  const vadLoopRef = useRef<number | null>(null);
  const lastSpeakingRef = useRef(false);

  const warmUpMic = async () => {
    if (mediaStreamRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎙️ Mic stream acquired:", stream);
      mediaStreamRef.current = stream;

      audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
      const source = audioCtxRef.current.createMediaStreamSource(stream);
      const analyser = audioCtxRef.current.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      analyserRef.current = analyser;

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        chunksRef.current = [];
        onWavReady(blob);
        if (onSpeakingChange) onSpeakingChange(false);
        isRecordingRef.current = false;
      };

      startVAD();
    } catch (err) {
      console.error("🎙️ Failed to get user media:", err);
    }
  };

  const startVAD = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);

    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const val = (data[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / data.length);

      if (rms > VAD_ENERGY_THRESHOLD) {
        if (!isRecordingRef.current && mediaRecorderRef.current?.state === "inactive") {
          console.log("🎤 Voice detected — starting recording");
          chunksRef.current = [];
          mediaRecorderRef.current.start(50);
          isRecordingRef.current = true;
          if (onSpeakingChange) onSpeakingChange(true);
        }
        if (silenceTimer.current) clearTimeout(silenceTimer.current);

        silenceTimer.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state === "recording") {
            console.log("🤫 Silence — stopping recording");
            mediaRecorderRef.current.requestData();
            setTimeout(() => {
              if (mediaRecorderRef.current?.state === "recording") {
                mediaRecorderRef.current.stop();
              }
            }, 150);
          }
        }, VAD_SILENCE_MS);
      }

      vadLoopRef.current = requestAnimationFrame(loop);
    };

    vadLoopRef.current = requestAnimationFrame(loop);
  };

  const stop = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (vadLoopRef.current) {
      cancelAnimationFrame(vadLoopRef.current);
      vadLoopRef.current = null;
    }
  };

  useEffect(() => {
    return () => stop();
  }, []);

  return {
    warmUpMic,
    stopRecording: stop,
  };
}
