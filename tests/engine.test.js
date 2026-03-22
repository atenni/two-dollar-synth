import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AudioEngine } from "../src/engine.js";

// ---------------------------------------------------------------------------
// Mock Web Audio API
// ---------------------------------------------------------------------------

function makeGainNode() {
  const gain = {
    value: 1,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
  return {
    gain,
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
}

function makeOscillator() {
  return {
    type: "sine",
    frequency: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
  };
}

function makeAudioContext() {
  const gainNode = makeGainNode();
  const ctx = {
    state: "running",
    currentTime: 0,
    destination: {},
    resume: vi.fn(),
    createGain: vi.fn(() => makeGainNode()),
    createOscillator: vi.fn(() => makeOscillator()),
  };
  // First createGain call is the master gain
  ctx.createGain.mockReturnValueOnce(gainNode);
  ctx._masterGain = gainNode;
  return ctx;
}

// Patch globalThis so `new AudioContext()` works in jsdom.
// Must use a regular function (not arrow) as the constructor implementation.
let mockCtx;
beforeEach(() => {
  mockCtx = makeAudioContext();
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function () {
      return mockCtx;
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AudioEngine", () => {
  describe("resume()", () => {
    it("creates an AudioContext on first call", () => {
      const engine = new AudioEngine();
      engine.resume();
      expect(globalThis.AudioContext).toHaveBeenCalledOnce();
    });

    it("does not create a second AudioContext on subsequent calls", () => {
      const engine = new AudioEngine();
      engine.resume();
      engine.resume();
      expect(globalThis.AudioContext).toHaveBeenCalledOnce();
    });

    it("calls ctx.resume() when context is suspended", () => {
      mockCtx.state = "suspended";
      const engine = new AudioEngine();
      engine.resume();
      expect(mockCtx.resume).toHaveBeenCalled();
    });
  });

  describe("noteOn(freq)", () => {
    it("creates an oscillator and gain node, starts the oscillator", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);

      expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
      expect(mockCtx.createGain).toHaveBeenCalledTimes(2); // master + voice
    });

    it("sets oscillator frequency to the given value", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);

      const osc = mockCtx.createOscillator.mock.results[0].value;
      expect(osc.frequency.value).toBe(440);
    });

    it("uses the current waveform type", () => {
      const engine = new AudioEngine();
      engine.setWaveform("square");
      engine.noteOn(440);

      const osc = mockCtx.createOscillator.mock.results[0].value;
      expect(osc.type).toBe("square");
    });

    it("is idempotent — a second noteOn for the same freq creates no new nodes", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);
      engine.noteOn(440);

      expect(mockCtx.createOscillator).toHaveBeenCalledOnce();
    });

    it("tracks the active note", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);
      expect(engine.activeNotes.has(440)).toBe(true);
    });

    it("applies an ADSR ramp to the voice gain", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);

      const voiceGain = mockCtx.createGain.mock.results[1].value;
      expect(voiceGain.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
      expect(voiceGain.gain.linearRampToValueAtTime).toHaveBeenCalledTimes(2);
    });
  });

  describe("noteOff(freq)", () => {
    it("removes the note from activeNotes", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);
      engine.noteOff(440);
      expect(engine.activeNotes.has(440)).toBe(false);
    });

    it("schedules a release ramp on the voice gain", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);

      const voiceGain = mockCtx.createGain.mock.results[1].value;
      engine.noteOff(440);

      expect(voiceGain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(
        0,
        expect.any(Number),
      );
    });

    it("stops the oscillator after the release period", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);
      const osc = mockCtx.createOscillator.mock.results[0].value;
      engine.noteOff(440);

      expect(osc.stop).toHaveBeenCalled();
    });

    it("is a no-op for a freq that is not playing", () => {
      const engine = new AudioEngine();
      expect(() => engine.noteOff(440)).not.toThrow();
    });
  });

  describe("allNotesOff()", () => {
    it("stops all active notes", () => {
      const engine = new AudioEngine();
      // Each noteOn call needs its own oscillator mock
      mockCtx.createOscillator.mockImplementation(makeOscillator);
      mockCtx.createGain
        .mockReturnValueOnce(mockCtx._masterGain) // master
        .mockReturnValue(makeGainNode()); // voices

      engine.noteOn(261.63);
      engine.noteOn(329.63);
      engine.noteOn(392.0);

      engine.allNotesOff();
      expect(engine.activeNotes.size).toBe(0);
    });
  });

  describe("setWaveform()", () => {
    it("updates the waveform property", () => {
      const engine = new AudioEngine();
      engine.setWaveform("triangle");
      expect(engine.waveform).toBe("triangle");
    });

    it("updates the type of any currently playing oscillators", () => {
      const engine = new AudioEngine();
      engine.noteOn(440);
      const osc = mockCtx.createOscillator.mock.results[0].value;

      engine.setWaveform("square");
      expect(osc.type).toBe("square");
    });
  });

  describe("setVolume()", () => {
    it("updates the volume property", () => {
      const engine = new AudioEngine();
      engine.setVolume(0.5);
      expect(engine.volume).toBe(0.5);
    });

    it("clamps values above 1 to 1", () => {
      const engine = new AudioEngine();
      engine.setVolume(2);
      expect(engine.volume).toBe(1);
    });

    it("clamps values below 0 to 0", () => {
      const engine = new AudioEngine();
      engine.setVolume(-1);
      expect(engine.volume).toBe(0);
    });

    it("updates the master gain node when context is active", () => {
      const engine = new AudioEngine();
      engine.resume(); // creates the master gain
      engine.setVolume(0.3);
      expect(mockCtx._masterGain.gain.value).toBe(0.3);
    });
  });

  describe("setADSR()", () => {
    it("updates individual ADSR parameters", () => {
      const engine = new AudioEngine();
      engine.setADSR({ attack: 0.5, decay: 0.2, sustain: 0.8, release: 1.0 });
      expect(engine.attack).toBe(0.5);
      expect(engine.decay).toBe(0.2);
      expect(engine.sustain).toBe(0.8);
      expect(engine.release).toBe(1.0);
    });

    it("only updates the supplied parameters", () => {
      const engine = new AudioEngine();
      const originalDecay = engine.decay;
      engine.setADSR({ attack: 0.5 });
      expect(engine.decay).toBe(originalDecay);
    });
  });
});
