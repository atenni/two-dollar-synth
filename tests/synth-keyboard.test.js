import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  midiToFreq,
  buildNotes,
  KEY_MAP,
  SynthKeyboard,
} from "../src/components/synth-keyboard.js";

// ---------------------------------------------------------------------------
// Pure function tests (no DOM needed)
// ---------------------------------------------------------------------------

describe("midiToFreq()", () => {
  it("returns 440 Hz for MIDI 69 (A4)", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 2);
  });

  it("returns 261.63 Hz for MIDI 60 (C4)", () => {
    expect(midiToFreq(60)).toBeCloseTo(261.63, 1);
  });

  it("doubles frequency every 12 semitones", () => {
    expect(midiToFreq(81)).toBeCloseTo(midiToFreq(69) * 2, 2);
  });
});

describe("buildNotes()", () => {
  it("returns 24 notes for two octaves", () => {
    expect(buildNotes().length).toBe(24);
  });

  it("starts on C3 (MIDI 48) by default", () => {
    expect(buildNotes()[0].midi).toBe(48);
    expect(buildNotes()[0].name).toBe("C");
    expect(buildNotes()[0].isBlack).toBe(false);
  });

  it("marks sharps/flats as black keys", () => {
    const notes = buildNotes();
    const cSharp = notes.find((n) => n.name === "C#");
    expect(cSharp.isBlack).toBe(true);
  });

  it("marks natural notes as white keys", () => {
    const notes = buildNotes();
    const e = notes.find((n) => n.name === "E");
    expect(e.isBlack).toBe(false);
  });

  it("respects a custom startMidi", () => {
    expect(buildNotes(60)[0].midi).toBe(60);
  });
});

describe("KEY_MAP", () => {
  it('maps "a" to offset 0 (root note)', () => {
    expect(KEY_MAP["a"]).toBe(0);
  });

  it('maps "w" to offset 1 (first black key)', () => {
    expect(KEY_MAP["w"]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Custom element tests (jsdom)
// ---------------------------------------------------------------------------

describe("SynthKeyboard element", () => {
  /** @type {SynthKeyboard} */
  let el;

  beforeEach(() => {
    el = document.createElement("synth-keyboard");
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it("is defined as a custom element", () => {
    expect(customElements.get("synth-keyboard")).toBeDefined();
  });

  it("renders a shadow root", () => {
    expect(el.shadowRoot).not.toBeNull();
  });

  it("renders 24 key elements", () => {
    const keys = el.shadowRoot.querySelectorAll(".key");
    expect(keys.length).toBe(24);
  });

  it("dispatches a note-on event when a key receives pointerdown", () => {
    const key = el.shadowRoot.querySelector(".key");
    let received = null;
    el.addEventListener("note-on", (e) => {
      received = e.detail;
    });

    key.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(received).not.toBeNull();
    expect(typeof received.freq).toBe("number");
    expect(received.freq).toBeGreaterThan(0);
  });

  it("dispatches a note-off event when a key receives pointerup", () => {
    const key = el.shadowRoot.querySelector(".key");
    let received = null;
    el.addEventListener("note-off", (e) => {
      received = e.detail;
    });

    // Press then release
    key.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    key.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(received).not.toBeNull();
  });

  it("dispatches note-on for the correct frequency on keydown", () => {
    // 'a' → offset 0 → MIDI 48 → midiToFreq(48)
    const expectedFreq = midiToFreq(48);
    let received = null;
    el.addEventListener("note-on", (e) => {
      received = e.detail;
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    expect(received?.freq).toBeCloseTo(expectedFreq, 2);
  });

  it("dispatches note-off for the correct frequency on keyup", () => {
    const expectedFreq = midiToFreq(48);
    let received = null;
    el.addEventListener("note-off", (e) => {
      received = e.detail;
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", bubbles: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keyup", { key: "a", bubbles: true }),
    );
    expect(received?.freq).toBeCloseTo(expectedFreq, 2);
  });

  it("ignores repeated keydown events", () => {
    let callCount = 0;
    el.addEventListener("note-on", () => {
      callCount++;
    });

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", repeat: false, bubbles: true }),
    );
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "a", repeat: true, bubbles: true }),
    );
    expect(callCount).toBe(1);
  });

  it("adds .active class to the pressed key", () => {
    const key = el.shadowRoot.querySelector(".key");
    key.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    expect(key.classList.contains("active")).toBe(true);
  });

  it("removes .active class when key is released", () => {
    const key = el.shadowRoot.querySelector(".key");
    key.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    key.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
    expect(key.classList.contains("active")).toBe(false);
  });
});
