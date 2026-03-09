export class SoundEngine {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.audioContext = null;
  }

  async resume() {
    if (!this.enabled) return;
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.audioContext && this.audioContext.state === 'running') {
      this.audioContext.suspend();
    }
  }

  async tone({ frequency = 440, duration = 0.08, type = 'sine', gainValue = 0.03 }) {
    if (!this.enabled) return;
    await this.resume();
    if (!this.audioContext) return;

    const context = this.audioContext;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.value = gainValue;

    oscillator.connect(gain);
    gain.connect(context.destination);

    const now = context.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  }

  play(eventType) {
    const presets = {
      'flight-spawn': { frequency: 520, duration: 0.05, type: 'triangle', gainValue: 0.018 },
      command: { frequency: 640, duration: 0.06, type: 'sine', gainValue: 0.02 },
      conflict: { frequency: 220, duration: 0.16, type: 'sawtooth', gainValue: 0.03 },
      landed: { frequency: 760, duration: 0.12, type: 'triangle', gainValue: 0.025 },
      warning: { frequency: 310, duration: 0.1, type: 'square', gainValue: 0.018 }
    };

    const preset = presets[eventType];
    if (preset) {
      this.tone(preset);
    }
  }
}