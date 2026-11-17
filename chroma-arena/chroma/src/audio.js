// Original synthesized sound effects (Web Audio). No external audio files are
// used, so the game has no third-party sound licensing to worry about.

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.muted = false;
    try { this.muted = localStorage.getItem('chroma-muted') === '1'; } catch { /* noop */ }
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return this.ctx;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.ctx.destination);
    const length = Math.floor(this.ctx.sampleRate * 0.25);
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  setMuted(muted) {
    this.muted = muted;
    try { localStorage.setItem('chroma-muted', muted ? '1' : '0'); } catch { /* noop */ }
    if (this.master) this.master.gain.value = muted ? 0 : 0.55;
  }

  tone(frequency, duration, options = {}) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const now = ctx.currentTime + (options.delay || 0);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = options.type || 'square';
    oscillator.frequency.setValueAtTime(frequency, now);
    if (options.to) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(options.volume || 0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  noise(duration, options = {}) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = options.filter || 'bandpass';
    filter.frequency.value = options.frequency || 900;
    filter.Q.value = options.q || 0.9;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(options.volume || 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + duration);
  }

  play(name) {
    if (this.muted) return;
    switch (name) {
      case 'shoot':
        this.tone(520, 0.07, { to: 180, type: 'square', volume: 0.05 });
        this.noise(0.05, { frequency: 1600, volume: 0.05 });
        break;
      case 'shootHeavy':
        this.tone(220, 0.12, { to: 90, type: 'sawtooth', volume: 0.07 });
        this.noise(0.12, { frequency: 700, volume: 0.1 });
        break;
      case 'hit':
        this.tone(920, 0.05, { type: 'triangle', volume: 0.05 });
        break;
      case 'headshot':
        this.tone(1320, 0.06, { type: 'triangle', volume: 0.07 });
        break;
      case 'kill':
        this.tone(660, 0.09, { type: 'triangle', volume: 0.06 });
        this.tone(990, 0.12, { type: 'triangle', volume: 0.05, delay: 0.08 });
        break;
      case 'hurt':
        this.tone(120, 0.14, { to: 70, type: 'sawtooth', volume: 0.07 });
        break;
      case 'heal':
        this.tone(520, 0.12, { to: 880, type: 'sine', volume: 0.06 });
        this.tone(780, 0.16, { to: 1180, type: 'sine', volume: 0.04, delay: 0.08 });
        break;
      case 'reload':
        this.tone(300, 0.04, { type: 'square', volume: 0.03 });
        this.tone(420, 0.05, { type: 'square', volume: 0.03, delay: 0.12 });
        break;
      case 'empty':
        this.tone(180, 0.04, { type: 'square', volume: 0.04 });
        break;
      case 'melee':
        this.noise(0.12, { filter: 'highpass', frequency: 1400, volume: 0.07 });
        break;
      case 'death':
        this.tone(240, 0.3, { to: 60, type: 'sawtooth', volume: 0.06 });
        break;
      case 'click':
        this.tone(560, 0.035, { type: 'square', volume: 0.03 });
        break;
      case 'queue':
        this.tone(440, 0.08, { type: 'triangle', volume: 0.04 });
        this.tone(660, 0.1, { type: 'triangle', volume: 0.04, delay: 0.08 });
        break;
      case 'start':
        this.tone(330, 0.12, { type: 'square', volume: 0.05 });
        this.tone(495, 0.12, { type: 'square', volume: 0.05, delay: 0.1 });
        this.tone(660, 0.2, { type: 'square', volume: 0.05, delay: 0.2 });
        break;
      default:
        break;
    }
  }
}
