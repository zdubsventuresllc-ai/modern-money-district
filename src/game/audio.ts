/** Tiny 8-bit synth. Square waves, no samples. Unlocks on first gesture. */
export class Chip {
  private ctx: AudioContext | null = null;
  enabled = false;

  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  private tone(freq: number, dur: number, type: OscillatorType = "square", gain = 0.05, when = 0, slide = 0): void {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  hop(): void { this.tone(660, 0.06, "square", 0.04); }
  fee(): void { this.tone(420, 0.12, "square", 0.05, 0, -200); }
  bounce(): void { this.tone(300, 0.08, "square", 0.05); this.tone(220, 0.12, "square", 0.05, 0.08); }
  hold(): void { this.tone(180, 0.05, "square", 0.04); }
  die(): void { this.tone(200, 0.25, "sawtooth", 0.06, 0, -160); this.tone(90, 0.35, "square", 0.05, 0.12, -60); }
  settle(): void { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.11, "square", 0.05, i * 0.07)); }
  level(): void { [392, 523, 659, 784, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.12, "square", 0.05, i * 0.09)); }
  tick(): void { this.tone(1200, 0.02, "square", 0.02); }
  start(): void { [262, 330, 392, 523].forEach((f, i) => this.tone(f, 0.1, "square", 0.05, i * 0.08)); }
}
