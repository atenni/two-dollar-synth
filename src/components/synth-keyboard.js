/**
 * <synth-keyboard> — piano keyboard web component.
 *
 * Renders two octaves of piano keys (C3–B4) inside Shadow DOM.
 * Dispatches custom events:
 *   - note-on  { detail: { freq: number } }
 *   - note-off { detail: { freq: number } }
 *
 * Input sources:
 *   - Pointer (mouse / touch) on keys
 *   - Computer keyboard (see KEY_MAP below)
 */

// ---------------------------------------------------------------------------
// Music theory helpers
// ---------------------------------------------------------------------------

/**
 * Convert a MIDI note number to its frequency in Hz.
 * Standard formula: A4 = MIDI 69 = 440 Hz
 * @param {number} midi
 * @returns {number}
 */
export function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Build the array of notes for two octaves starting at the given MIDI note.
 * Each note: { midi, name, isBlack }
 * @param {number} startMidi  default C3 = 48
 * @returns {{ midi: number, name: string, isBlack: boolean }[]}
 */
export function buildNotes(startMidi = 48) {
  const NAMES = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];
  const IS_BLACK = [
    false,
    true,
    false,
    true,
    false,
    false,
    true,
    false,
    true,
    false,
    true,
    false,
  ];
  const notes = [];
  for (let i = 0; i < 24; i++) {
    const midi = startMidi + i;
    const degree = midi % 12;
    notes.push({ midi, name: NAMES[degree], isBlack: IS_BLACK[degree] });
  }
  return notes;
}

// Computer keyboard → MIDI offset from startMidi (C3 = 0)
// Bottom row = white keys C3–E4; top row = white keys C4–E5 (overlapping middle)
export const KEY_MAP = {
  // Lower row — C3 (48) onwards
  a: 0, // C3
  w: 1, // C#3
  s: 2, // D3
  e: 3, // D#3
  d: 4, // E3
  f: 5, // F3
  t: 6, // F#3
  g: 7, // G3
  y: 8, // G#3
  h: 9, // A3
  u: 10, // A#3
  j: 11, // B3
  k: 12, // C4
  o: 13, // C#4
  l: 14, // D4
  p: 15, // D#4
  ";": 16, // E4
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
  <style>
    :host {
      display: block;
      user-select: none;
      -webkit-user-select: none;
    }

    .keyboard {
      position: relative;
      display: flex;
      height: 180px;
      border-radius: 0 0 8px 8px;
      overflow: visible;
    }

    .key {
      position: relative;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      padding-bottom: 10px;
      box-sizing: border-box;
      border: 1px solid #888;
      border-top: none;
      border-radius: 0 0 6px 6px;
      cursor: pointer;
      transition: background 60ms;
      touch-action: none;
    }

    .key.white {
      width: 44px;
      height: 180px;
      background: #f5f0e8;
      z-index: 1;
    }

    .key.white:hover,
    .key.white.active {
      background: #ffe0a0;
    }

    .key.black {
      width: 28px;
      height: 110px;
      background: #1a1a1a;
      margin-left: -14px;
      margin-right: -14px;
      z-index: 2;
      border-color: #000;
      padding-bottom: 6px;
    }

    .key.black:hover,
    .key.black.active {
      background: #4a3800;
    }

    .key-label {
      font-size: 10px;
      font-family: sans-serif;
      pointer-events: none;
      opacity: 0.5;
    }

    .key.black .key-label {
      color: #ccc;
    }

    @media (max-width: 980px) {
      .keyboard {
        height: 164px;
      }

      .key.white {
        width: 40px;
        height: 164px;
      }

      .key.black {
        width: 24px;
        height: 100px;
        margin-left: -12px;
        margin-right: -12px;
      }
    }

    @media (max-width: 760px) {
      .keyboard {
        height: 148px;
      }

      .key.white {
        width: 36px;
        height: 148px;
      }

      .key.black {
        width: 22px;
        height: 92px;
        margin-left: -11px;
        margin-right: -11px;
      }

      .key-label {
        font-size: 9px;
      }
    }

    @media (max-width: 480px) {
      .keyboard {
        height: 128px;
      }

      .key.white {
        width: 30px;
        height: 128px;
      }

      .key.black {
        width: 18px;
        height: 80px;
        margin-left: -9px;
        margin-right: -9px;
      }

      .key-label {
        font-size: 8px;
      }
    }
  </style>
  <div class="keyboard" part="keyboard"></div>
`;

export class SynthKeyboard extends HTMLElement {
  /** @type {number} */ #startMidi = 48;
  /** @type {Map<number, HTMLElement>} */ #keyEls = new Map();
  /** @type {Set<string>} */ #heldKeys = new Set();

  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this.#render();
    this.#bindKeyboard();
  }

  disconnectedCallback() {
    document.removeEventListener("keydown", this.#onKeyDown);
    document.removeEventListener("keyup", this.#onKeyUp);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  #render() {
    const container = this.shadowRoot.querySelector(".keyboard");
    const notes = buildNotes(this.#startMidi);

    for (const note of notes) {
      const el = document.createElement("div");
      el.className = `key ${note.isBlack ? "black" : "white"}`;
      el.dataset.midi = String(note.midi);

      const label = document.createElement("span");
      label.className = "key-label";
      label.textContent = note.name;
      el.appendChild(label);

      this.#bindPointer(el, note.midi);
      this.#keyEls.set(note.midi, el);
      container.appendChild(el);
    }
  }

  // ---------------------------------------------------------------------------
  // Pointer events
  // ---------------------------------------------------------------------------

  #bindPointer(el, midi) {
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      this.#triggerOn(midi, el);
    });
    el.addEventListener("pointerup", () => this.#triggerOff(midi, el));
    el.addEventListener("pointercancel", () => this.#triggerOff(midi, el));
    el.addEventListener("pointerleave", () => this.#triggerOff(midi, el));
  }

  // ---------------------------------------------------------------------------
  // Computer keyboard events
  // ---------------------------------------------------------------------------

  #onKeyDown = (e) => {
    if (e.repeat) return;
    const offset = KEY_MAP[e.key];
    if (offset === undefined) return;
    const midi = this.#startMidi + offset;
    const el = this.#keyEls.get(midi);
    this.#heldKeys.add(e.key);
    this.#triggerOn(midi, el);
  };

  #onKeyUp = (e) => {
    const offset = KEY_MAP[e.key];
    if (offset === undefined) return;
    const midi = this.#startMidi + offset;
    const el = this.#keyEls.get(midi);
    this.#heldKeys.delete(e.key);
    this.#triggerOff(midi, el);
  };

  #bindKeyboard() {
    document.addEventListener("keydown", this.#onKeyDown);
    document.addEventListener("keyup", this.#onKeyUp);
  }

  // ---------------------------------------------------------------------------
  // Event dispatch
  // ---------------------------------------------------------------------------

  #triggerOn(midi, el) {
    el?.classList.add("active");
    this.dispatchEvent(
      new CustomEvent("note-on", {
        bubbles: true,
        composed: true,
        detail: { freq: midiToFreq(midi) },
      }),
    );
  }

  #triggerOff(midi, el) {
    el?.classList.remove("active");
    this.dispatchEvent(
      new CustomEvent("note-off", {
        bubbles: true,
        composed: true,
        detail: { freq: midiToFreq(midi) },
      }),
    );
  }
}

customElements.define("synth-keyboard", SynthKeyboard);
