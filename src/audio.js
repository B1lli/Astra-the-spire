export class Sound {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }
  unlock() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  tone(freq, duration, type = "sine", volume = 0.08, delay = 0, end = freq) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration);
  }
  click() {
    this.tone(660, 0.12, "sine", 0.035, 0, 880);
  }
  resonate() {
    [392, 494, 587, 784, 988].forEach((f, i) =>
      this.tone(f, 0.55, "sine", 0.07, i * 0.065),
    );
    this.tone(110, 0.65, "triangle", 0.12, 0, 220);
  }
  cast(kind) {
    this.tone(180, 0.45, "sine", 0.07, 0, kind === "ultimate" ? 1400 : 700);
    this.tone(360, 0.6, "triangle", 0.035, 0.08, 1200);
    if (kind === "ultimate")
      for (let i = 0; i < 5; i++)
        this.tone(220 * Math.pow(1.25, i), 1, "sine", 0.055, i * 0.08);
  }
  impact(kind) {
    this.tone(kind === "ultimate" ? 100 : 160, 0.5, "triangle", 0.16, 0, 30);
    this.tone(70, 0.6, "sine", 0.2, 0, 25);
    if (this.enabled && this.ctx) {
      const n = this.ctx.sampleRate * 0.35,
        b = this.ctx.createBuffer(1, n, this.ctx.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const source = this.ctx.createBufferSource(),
        gain = this.ctx.createGain(),
        filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 1700;
      source.buffer = b;
      gain.gain.value = 0.13;
      source.connect(filter).connect(gain).connect(this.ctx.destination);
      source.start();
    }
  }
  finish(win) {
    (win ? [392, 494, 587, 784] : [330, 294, 220]).forEach((f, i) =>
      this.tone(f, 0.85, "sine", 0.08, i * 0.16),
    );
  }
}
