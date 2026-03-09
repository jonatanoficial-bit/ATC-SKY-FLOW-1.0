export class SoundEngine {
  constructor(enabled = true) {
    this.enabled = enabled;
    this.context = null;
  }

  async resume() {
    if (!this.enabled) return;
    if (!this.context) {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
    }
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
  }

  setEnabled(value) {
    this.enabled = value;
  }

  play(type = 'command') {
    if (!this.enabled || !this.context) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    const freq = type === 'conflict' ? 220 : type === 'warning' ? 320 : type === 'landed' ? 540 : 430;
    oscillator.frequency.value = freq;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    const now = this.context.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (type === 'conflict' ? 0.28 : 0.16));
    oscillator.start(now);
    oscillator.stop(now + (type === 'conflict' ? 0.32 : 0.2));
  }
}
