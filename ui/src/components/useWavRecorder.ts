// src/components/useWavRecorder.ts
import { useEffect, useRef, useState } from "react";
import { encodeWAV } from "@/lib/wavEncoder";
import { VoiceActivityDetector } from "@/lib/VoiceActivityDetector";

const SAMPLE_RATE = 24000;

interface UseWavRecorderOptions {
  onWavReady: (wav: Blob) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function useWavRecorder({ onWavReady, onSpeakingChange }: UseWavRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const vadRef = useRef(new VoiceActivityDetector(0.01, 800));
  const lastSpeakingRef = useRef(false);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    if (isRecording) return;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
    const source = audioContext.createMediaStreamSource(stream);
    const processor = audioContext.createScriptProcessor(2048, 1, 1);

    audioContextRef.current = audioContext;
    mediaStreamRef.current = stream;
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const rms = Math.sqrt(input.reduce((sum, val) => sum + val * val, 0) / input.length);
      const vad = vadRef.current;
      const speakingNow = vad.update(rms);

      // 🔄 Notify UI if speaking state changes
      if (speakingNow !== lastSpeakingRef.current) {
        lastSpeakingRef.current = speakingNow;
        onSpeakingChange?.(speakingNow);
      }

      if (speakingNow) {
        audioBufferRef.current.push(new Float32Array(input));
      } else if (vad.timeSinceLastSpeech() > 800 && audioBufferRef.current.length > 0) {
        finishRecording();
      }
    };

    source.connect(processor);
    processor.connect(audioContext.destination);
    setIsRecording(true);
  };

  const stopRecording = () => {
    processorRef.current?.disconnect();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    audioContextRef.current?.close();

    processorRef.current = null;
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    audioBufferRef.current = [];

    setIsRecording(false);
  };

  const finishRecording = () => {
    const allSamples = flattenBuffers(audioBufferRef.current);
    audioBufferRef.current = [];

    const wavBlob = encodeWAV(allSamples, SAMPLE_RATE);
    onWavReady(wavBlob);
  };

  const flattenBuffers = (buffers: Float32Array[]): Float32Array => {
    const length = buffers.reduce((acc, b) => acc + b.length, 0);
    const result = new Float32Array(length);
    let offset = 0;
    for (const b of buffers) {
      result.set(b, offset);
      offset += b.length;
    }
    return result;
  };

  return { isRecording, startRecording, stopRecording };
}

