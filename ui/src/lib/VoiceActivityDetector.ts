// lib/VoiceActivityDetector.ts
export class VoiceActivityDetector {
  private threshold: number;
  private silenceMs: number;
  private speaking: boolean = false;
  private lastVoiceMs: number = Date.now();

  constructor(threshold = 0.01, silenceMs = 800) {
    this.threshold = threshold;
    this.silenceMs = silenceMs;
  }

  update(rms: number): boolean {
    const now = Date.now();

    if (rms > this.threshold) {
      this.lastVoiceMs = now;
      if (!this.speaking) {
        this.speaking = true;
        return true; // just started speaking
      }
    } else {
      if (this.speaking && now - this.lastVoiceMs > this.silenceMs) {
        this.speaking = false;
        return false; // just stopped speaking
      }
    }

    return this.speaking;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  timeSinceLastSpeech(): number {
    return Date.now() - this.lastVoiceMs;
  }
}

