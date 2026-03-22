/**
 * Audio engine — wraps the Web Audio API.
 *
 * Usage:
 *   const engine = new AudioEngine();
 *   engine.noteOn(440);   // start a 440 Hz tone
 *   engine.noteOff(440);  // stop it
 */
export class AudioEngine {
  /** @type {AudioContext|null} */
  #ctx = null;

  /** @type {GainNode|null} */
  #masterGain = null;

  /** Map<frequency, { oscillator, gainNode }> */
  #voices = new Map();

  // ADSR defaults (seconds / linear gain)
  #attack = 0.01;
  #decay = 0.1;
  #sustain = 0.7;
  #release = 0.3;

  #waveform = /** @type {OscillatorType} */ ("sawtooth");
  #volume = 0.7;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Must be called from a user-gesture handler to satisfy browser autoplay policy.
   */
  resume() {
    if (!this.#ctx) {
      this.#ctx = new AudioContext();
      this.#masterGain = this.#ctx.createGain();
      this.#masterGain.gain.value = this.#volume;
      this.#masterGain.connect(this.#ctx.destination);
    }
    if (this.#ctx.state === "suspended") {
      this.#ctx.resume();
    }
  }

  // ---------------------------------------------------------------------------
  // Note control
  // ---------------------------------------------------------------------------

  /**
   * Start a note at the given frequency (Hz). Idempotent for the same freq.
   * @param {number} freq
   */
  noteOn(freq) {
    this.resume();
    if (this.#voices.has(freq)) return;

    const ctx = this.#ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = this.#waveform;
    osc.frequency.value = freq;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + this.#attack);
    gainNode.gain.linearRampToValueAtTime(
      this.#sustain,
      now + this.#attack + this.#decay,
    );

    osc.connect(gainNode);
    gainNode.connect(this.#masterGain);
    osc.start(now);

    this.#voices.set(freq, { osc, gainNode });
  }

  /**
   * Stop the note at the given frequency, applying the release envelope.
   * @param {number} freq
   */
  noteOff(freq) {
    const voice = this.#voices.get(freq);
    if (!voice) return;

    const { osc, gainNode } = voice;
    const now = this.#ctx.currentTime;

    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.linearRampToValueAtTime(0, now + this.#release);

    osc.stop(now + this.#release);
    osc.onended = () => {
      osc.disconnect();
      gainNode.disconnect();
    };

    this.#voices.delete(freq);
  }

  /** Stop all currently playing notes immediately. */
  allNotesOff() {
    for (const freq of this.#voices.keys()) {
      this.noteOff(freq);
    }
  }

  // ---------------------------------------------------------------------------
  // Parameter setters
  // ---------------------------------------------------------------------------

  /** @param {OscillatorType} type */
  setWaveform(type) {
    this.#waveform = type;
    for (const { osc } of this.#voices.values()) {
      osc.type = type;
    }
  }

  /** @param {number} value 0–1 */
  setVolume(value) {
    this.#volume = Math.max(0, Math.min(1, value));
    if (this.#masterGain) {
      this.#masterGain.gain.value = this.#volume;
    }
  }

  /**
   * @param {{ attack?: number, decay?: number, sustain?: number, release?: number }} params
   */
  setADSR({ attack, decay, sustain, release } = {}) {
    if (attack !== undefined) this.#attack = attack;
    if (decay !== undefined) this.#decay = decay;
    if (sustain !== undefined) this.#sustain = sustain;
    if (release !== undefined) this.#release = release;
  }

  // ---------------------------------------------------------------------------
  // Inspection (used by tests)
  // ---------------------------------------------------------------------------

  get activeNotes() {
    return new Set(this.#voices.keys());
  }

  get waveform() {
    return this.#waveform;
  }
  get volume() {
    return this.#volume;
  }
  get attack() {
    return this.#attack;
  }
  get decay() {
    return this.#decay;
  }
  get sustain() {
    return this.#sustain;
  }
  get release() {
    return this.#release;
  }
}
