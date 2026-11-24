import { SoundscapeState } from '../types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Soundscape nodes
  private rainGain: GainNode | null = null;
  private brownGain: GainNode | null = null;
  private fireGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

  // Active sources & intervals
  private rainSource: AudioBufferSourceNode | null = null;
  private brownSource: AudioBufferSourceNode | null = null;
  private fireSource: AudioBufferSourceNode | null = null;
  private fireCrackleInterval: number | null = null;
  private rainDropsInterval: number | null = null;

  private isRunning: boolean = false;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- PROCEDURAL NOISE BUFFERS ---
  private createPinkNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  private createBrownNoiseBuffer(ctx: AudioContext, seconds = 5): AudioBuffer {
    const bufferSize = ctx.sampleRate * seconds;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain compensation
    }
    return buffer;
  }

  // --- SOUNDSCAPE CONTROL ---
  public startSoundscapes(state: SoundscapeState) {
    const ctx = this.getContext();
    this.isMuted = state.isMuted;

    if (this.isRunning) {
      this.updateVolumes(state);
      return;
    }

    this.masterGain = ctx.createGain();
    this.masterGain.gain.setValueAtTime(state.isMuted ? 0 : 1, ctx.currentTime);
    this.masterGain.connect(ctx.destination);

    // 1. Soft Rain generator
    const rainBuffer = this.createPinkNoiseBuffer(ctx, 4);
    this.rainSource = ctx.createBufferSource();
    this.rainSource.buffer = rainBuffer;
    this.rainSource.loop = true;

    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'lowpass';
    rainFilter.frequency.setValueAtTime(1000, ctx.currentTime);

    this.rainGain = ctx.createGain();
    this.rainGain.gain.setValueAtTime(state.rainVolume, ctx.currentTime);

    this.rainSource.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);
    this.rainSource.start();

    // Random gentle rain micro-droplets
    this.rainDropsInterval = window.setInterval(() => {
      if (this.isMuted || !this.rainGain || state.rainVolume <= 0.01) return;
      try {
        const dropOsc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        const freq = 1200 + Math.random() * 1800;
        dropOsc.type = 'sine';
        dropOsc.frequency.setValueAtTime(freq, ctx.currentTime);
        dropOsc.frequency.exponentialRampToValueAtTime(freq * 0.4, ctx.currentTime + 0.06);

        dropGain.gain.setValueAtTime(0.005 * state.rainVolume, ctx.currentTime);
        dropGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.06);

        dropOsc.connect(dropGain);
        dropGain.connect(this.masterGain!);
        dropOsc.start();
        dropOsc.stop(ctx.currentTime + 0.07);
      } catch {
        // ignore occasional cleanup
      }
    }, 180);

    // 2. Deep Brown Noise generator
    const brownBuffer = this.createBrownNoiseBuffer(ctx, 4);
    this.brownSource = ctx.createBufferSource();
    this.brownSource.buffer = brownBuffer;
    this.brownSource.loop = true;

    const brownFilter = ctx.createBiquadFilter();
    brownFilter.type = 'lowpass';
    brownFilter.frequency.setValueAtTime(200, ctx.currentTime);

    this.brownGain = ctx.createGain();
    this.brownGain.gain.setValueAtTime(state.brownNoiseVolume, ctx.currentTime);

    this.brownSource.connect(brownFilter);
    brownFilter.connect(this.brownGain);
    this.brownGain.connect(this.masterGain);
    this.brownSource.start();

    // 3. Cozy Fireplace (warm low rumble + random crackle impulses)
    const fireRumbleBuffer = this.createBrownNoiseBuffer(ctx, 4);
    this.fireSource = ctx.createBufferSource();
    this.fireSource.buffer = fireRumbleBuffer;
    this.fireSource.loop = true;

    const fireRumbleFilter = ctx.createBiquadFilter();
    fireRumbleFilter.type = 'bandpass';
    fireRumbleFilter.frequency.setValueAtTime(140, ctx.currentTime);
    fireRumbleFilter.Q.setValueAtTime(1.5, ctx.currentTime);

    this.fireGain = ctx.createGain();
    this.fireGain.gain.setValueAtTime(state.fireVolume * 0.6, ctx.currentTime);

    this.fireSource.connect(fireRumbleFilter);
    fireRumbleFilter.connect(this.fireGain);
    this.fireGain.connect(this.masterGain);
    this.fireSource.start();

    // Periodic organic crackles
    this.fireCrackleInterval = window.setInterval(() => {
      if (this.isMuted || !this.fireGain || state.fireVolume <= 0.01) return;
      if (Math.random() > 0.45) {
        try {
          const crackleBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.02), ctx.sampleRate);
          const crackleData = crackleBuffer.getChannelData(0);
          for (let i = 0; i < crackleData.length; i++) {
            crackleData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.004));
          }
          const crackleSource = ctx.createBufferSource();
          crackleSource.buffer = crackleBuffer;

          const crackleFilter = ctx.createBiquadFilter();
          crackleFilter.type = 'bandpass';
          crackleFilter.frequency.setValueAtTime(2200 + Math.random() * 1600, ctx.currentTime);
          crackleFilter.Q.setValueAtTime(3.0, ctx.currentTime);

          const crackleGain = ctx.createGain();
          const amp = (0.04 + Math.random() * 0.08) * state.fireVolume;
          crackleGain.gain.setValueAtTime(amp, ctx.currentTime);

          crackleSource.connect(crackleFilter);
          crackleFilter.connect(crackleGain);
          crackleGain.connect(this.masterGain!);

          crackleSource.start();
        } catch {
          // ignore
        }
      }
    }, 70);

    this.isRunning = true;
  }

  public updateVolumes(state: SoundscapeState) {
    const ctx = this.getContext();
    this.isMuted = state.isMuted;

    if (!this.isRunning) {
      if (!state.isMuted && (state.rainVolume > 0 || state.brownNoiseVolume > 0 || state.fireVolume > 0)) {
        this.startSoundscapes(state);
      }
      return;
    }

    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(state.isMuted ? 0 : 1, ctx.currentTime, 0.05);
    }
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(state.rainVolume, ctx.currentTime, 0.05);
    }
    if (this.brownGain) {
      this.brownGain.gain.setTargetAtTime(state.brownNoiseVolume, ctx.currentTime, 0.05);
    }
    if (this.fireGain) {
      this.fireGain.gain.setTargetAtTime(state.fireVolume * 0.6, ctx.currentTime, 0.05);
    }
  }

  public stopSoundscapes() {
    if (!this.isRunning) return;

    if (this.fireCrackleInterval) {
      clearInterval(this.fireCrackleInterval);
      this.fireCrackleInterval = null;
    }
    if (this.rainDropsInterval) {
      clearInterval(this.rainDropsInterval);
      this.rainDropsInterval = null;
    }

    try {
      this.rainSource?.stop();
      this.brownSource?.stop();
      this.fireSource?.stop();
    } catch {
      // ignore
    }

    this.rainSource = null;
    this.brownSource = null;
    this.fireSource = null;
    this.isRunning = false;
  }

  // --- SINGING BOWL / CELEBRATION CHIME ---
  public playSingingBowl(muted = false) {
    if (muted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Harmonic frequencies for Tibetan singing bowl (432Hz fundamental + organic partials)
      const partials = [
        { freq: 432, gain: 0.35, decay: 4.8 },
        { freq: 432 * 2.76, gain: 0.22, decay: 3.5 },
        { freq: 432 * 5.40, gain: 0.12, decay: 2.2 },
        { freq: 432 * 8.93, gain: 0.06, decay: 1.4 },
      ];

      const bowlMaster = ctx.createGain();
      bowlMaster.gain.setValueAtTime(0.8, now);
      bowlMaster.connect(ctx.destination);

      partials.forEach(({ freq, gain, decay }) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        // Gentle strike attack (0.04s) and organic natural exponential decay
        oscGain.gain.setValueAtTime(0.0001, now);
        oscGain.gain.exponentialRampToValueAtTime(gain, now + 0.04);
        oscGain.gain.exponentialRampToValueAtTime(0.00001, now + decay);

        // Subtle shimmer / tremolo LFO
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(4.2, now); // 4.2 Hz gentle beating
        lfoGain.gain.setValueAtTime(0.015, now);

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + decay);

        osc.connect(oscGain);
        oscGain.connect(bowlMaster);

        osc.start(now);
        osc.stop(now + decay);
      });
    } catch (e) {
      console.warn('Web Audio chime could not play:', e);
    }
  }
}

export const soundEngine = new SoundEngine();
