/**
 * Web Audio API Sound Synthesizer
 * Zero external audio files required - generates all retro-arcade sound effects procedurally!
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.initialized = false;
    this.titleAudio = null;
    this.titleMusicPlaying = false;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
      this.initialized = true;
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
    this.initTitleMusic();
  }

  initTitleMusic() {
    if (this.titleAudio) return;
    try {
      this.titleAudio = new Audio('assets/audio/title-theme.m4a');
      this.titleAudio.addEventListener('error', () => {
        // Fallback to legacy path if needed
        if (this.titleAudio && !this.titleAudio.src.includes('Capybara%20Cannon.m4a')) {
          this.titleAudio.src = 'assets/Capybara Cannon.m4a';
        }
      }, { once: true });
      this.titleAudio.loop = true;
      this.titleAudio.volume = this.muted ? 0 : 0.65;
    } catch (e) {
      console.warn("Could not initialize title music", e);
    }
  }

  playTitleMusic() {
    if (this.muted) return;
    this.initTitleMusic();
    if (this.titleAudio) {
      this.titleAudio.volume = 0.65;
      const playPromise = this.titleAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          this.titleMusicPlaying = true;
        }).catch(err => {
          console.log("Title audio awaiting user gesture:", err.message);
        });
      }
    }
  }

  stopTitleMusic() {
    if (this.titleAudio) {
      try {
        this.titleAudio.pause();
        this.titleAudio.currentTime = 0;
        this.titleMusicPlaying = false;
      } catch (e) {}
    }
  }

  resume() {
    if (!this.initialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.muted ? 0 : 0.35, this.ctx.currentTime);
    }
    if (this.titleAudio) {
      this.titleAudio.volume = this.muted ? 0 : 0.65;
      if (!this.muted && this.titleMusicPlaying) {
        this.titleAudio.play().catch(() => {});
      }
    }
    return this.muted;
  }

  /**
   * Powerful Cannon Blast sound: low sine pitch drop + explosive noise crack
   * Scales thump & explosion punch with launch power
   */
  playCannon(power = 1.0) {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const intensity = Math.max(0.6, Math.min(2.0, power * 1.6));

    // Heavy Sub-bass thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200 + 100 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(24, t + 0.38 * intensity);

    oscGain.gain.setValueAtTime(Math.min(1.2, 0.7 * intensity), t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.42 * intensity);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.45 * intensity);

    // Crackling blast noise
    this.playNoiseBurst(0.25 * intensity, 650 * intensity, 90);

    // Extra explosive thunder on big launches
    if (power > 0.75) {
      this.playNoiseBurst(0.45, 350, 45);
    }
  }

  /**
   * Massive TNT explosion: Heavy sub boom + crackling noise
   */
  playExplosion() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.55);

    oscGain.gain.setValueAtTime(1.2, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.6);

    // Crackle noise
    this.playNoiseBurst(0.5, 900, 80);
  }

  /**
   * Cartoon Trampoline Boing: pitch bends up and down
   */
  playBoing() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(750, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.32);

    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /**
   * Dull ground bounce thud
   */
  playBounce(intensity = 1) {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const clamped = Math.min(Math.max(intensity, 0.2), 1.0);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 * clamped, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);

    gain.gain.setValueAtTime(0.5 * clamped, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  /**
   * Happy Yuzu Fruit pickup chime (2 harmonic notes)
   */
  playYuzu() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const notes = [587.33, 880, 1174.66]; // D5, A5, D6
    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }

  /**
   * Hot spring steam/splash glide sound
   */
  playSplash() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    this.playNoiseBurst(0.35, 1200, 300);
  }

  /**
   * Mid-air Zen Boost whoosh
   */
  playBoost() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(900, t + 0.25);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  /**
   * Pelican / Bird flap lift
   */
  playBird() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.linearRampToValueAtTime(950, t + 0.12);
    osc.frequency.linearRampToValueAtTime(500, t + 0.25);

    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  /**
   * Hazard / Cactus scrape
   */
  playHazard() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.22);
  }

  /**
   * Game Over fanfare
   */
  playGameOver() {
    if (this.muted) return;
    this.resume();
    if (!this.ctx) return;

    const chord = [392.00, 493.88, 587.33, 783.99]; // G major
    chord.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }

  /**
   * Helper to create filtered white noise burst
   */
  playNoiseBurst(duration, startFreq, endFreq) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const t = this.ctx.currentTime;
    filter.frequency.setValueAtTime(startFreq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 10), t + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
    noise.stop(t + duration);
  }
}

export const sound = new SoundManager();
