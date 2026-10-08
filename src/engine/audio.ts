/**
 * Zero-asset Web Audio synth: a piano-ish voice (two detuned oscillators,
 * plucked envelope, gentle lowpass) through a small generated reverb.
 * The AudioContext is created lazily and only starts after a user gesture.
 */
export class AudioKit {
  private actx: AudioContext | null = null;
  private master: GainNode | null = null;
  private convolver: ConvolverNode | null = null;

  ensure(): void {
    if (!this.actx) {
      const Ctor = window.AudioContext;
      if (!Ctor) return;
      const actx = new Ctor();
      const master = actx.createGain();
      master.gain.value = 0.55;
      master.connect(actx.destination);
      const convolver = actx.createConvolver();
      convolver.buffer = this.makeImpulse(actx, 1.5);
      const wet = actx.createGain();
      wet.gain.value = 0.2;
      convolver.connect(wet);
      wet.connect(actx.destination);
      this.actx = actx;
      this.master = master;
      this.convolver = convolver;
    }
    if (this.actx.state === 'suspended') void this.actx.resume();
  }

  get running(): boolean {
    return this.actx !== null && this.actx.state === 'running';
  }

  /** Monotonic seconds: sample-accurate when audio runs, wall clock otherwise. */
  time(): number {
    return this.running && this.actx ? this.actx.currentTime : performance.now() / 1000;
  }

  playNote(midi: number, when = 0, dur = 0.5, velocity = 0.85): void {
    if (!this.running || !this.actx || !this.master || !this.convolver) return;
    const actx = this.actx;
    const t = Math.max(actx.currentTime, when);
    const freq = 440 * Math.pow(2, (midi - 69) / 12);

    const gain = actx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(velocity, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);

    const filter = actx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 3600;
    filter.Q.value = 0.6;
    gain.connect(filter);
    filter.connect(this.master);
    filter.connect(this.convolver);

    const osc1 = actx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = freq;
    const osc2 = actx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;
    const osc2Gain = actx.createGain();
    osc2Gain.gain.value = 0.22;
    osc1.connect(gain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(gain);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + dur + 0.4);
    osc2.stop(t + dur + 0.4);
  }

  /** Plays a chord/harmonic so the reward moments feel bigger. */
  playChord(midis: number[], when = 0, dur = 0.8): void {
    for (const m of midis) this.playNote(m, when, dur, 0.5);
  }

  private makeImpulse(actx: AudioContext, seconds: number): AudioBuffer {
    const len = Math.floor(actx.sampleRate * seconds);
    const buffer = actx.createBuffer(2, len, actx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 2.6);
        data[i] = (Math.random() * 2 - 1) * decay * 0.6;
      }
    }
    return buffer;
  }
}
