import { useRef, useEffect } from "react";

interface UseWavRecorderOptions {
  onWavReady: (blob: Blob) => void;
  onSpeakingChange?: (speaking: boolean) => void;
}

export function useWavRecorder({ onWavReady, onSpeakingChange }: UseWavRecorderOptions) {
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const lastSpeakingRef = useRef(false);

  // 🔥 Call this early to prompt permission and warm up mic
  const warmUpMic = async () => {
    if (mediaStreamRef.current) return; // Already warmed up
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎙️ Mic stream acquired:", stream);
      mediaStreamRef.current = stream;
      prepareRecorder();
    } catch (err) {
      console.error("🎙️ Failed to get user media:", err);
    }
  };

  // 🎛️ Call to prepare the recorder after warmup
  const prepareRecorder = () => {
    if (!mediaStreamRef.current) {
      console.warn("🎙️ Tried to prepare before warm-up.");
      return;
    }

    const recorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: "audio/webm",
      audioBitsPerSecond: 128000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      chunksRef.current = [];
      onWavReady(blob);
    };

    mediaRecorderRef.current = recorder;
  };

  // 🟢 Call this to actually begin recording
  const startRecording = () => {
    if (mediaRecorderRef.current && !isRecordingRef.current) {
      chunksRef.current = [];
      mediaRecorderRef.current.start();
      isRecordingRef.current = true;
      if (onSpeakingChange) onSpeakingChange(true);
    }
  };

  // 🔴 Call this to manually stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
      if (onSpeakingChange) onSpeakingChange(false);
    }
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return {
    warmUpMic,
    prepareRecorder,
    startRecording,
    stopRecording,
  };
}
