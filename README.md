# Two dollar synth (demo app for presentation)

A super simple web based synth using the browser native [Web Audio API].

[Web Audio API]: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

- No third party libraries (use the platform!)
- Built with native [Web Components] (`HTMLElement` custom elements + Shadow
  DOM)
- Published to GitHub Pages via GitHub Actions

[Web Components]:
  https://developer.mozilla.org/en-US/docs/Web/API/Web_components

## Project overview

A polyphonic synthesizer playable in the browser via a piano-style keyboard.
Notes are generated entirely with the Web Audio API — no audio samples, no
libraries. The UI is decomposed into native Web Components (custom elements with
Shadow DOM), styled with plain CSS to be clean and tactile.

## Project goals

- Polyphonic keyboard (mouse, touch, and computer-keyboard input)
- Multiple waveform types (sine, square, sawtooth, triangle)
- ADSR envelope control (attack, decay, sustain, release)
- Master volume and per-voice gain
- Responsive layout, works on desktop and mobile

---

## Folder / file structure

```
two-dollar-synth/
├── index.html               # App shell — registers components, sets page layout
├── style.css                # Global resets and layout only (components own their own styles)
├── src/
│   ├── main.js              # Entry point — imports and registers all custom elements
│   ├── engine.js            # Web Audio API engine (AudioContext, oscillators, ADSR)
│   └── components/
│       ├── synth-keyboard.js # <synth-keyboard> — piano keys, pointer/touch/kbd events
│       └── synth-controls.js # <synth-controls> — waveform picker, ADSR sliders, volume
├── tests/
│   ├── engine.test.js       # Unit tests for the audio engine (mocked AudioContext)
│   ├── synth-keyboard.test.js # Key rendering, frequency mapping, event dispatch
│   └── synth-controls.test.js # ADSR value propagation and waveform selection
├── vitest.config.js         # Vitest configuration (jsdom environment)
├── package.json             # Dev dependencies (vitest) and test script
├── .github/
│   └── workflows/
│       └── deploy.yml       # GitHub Actions workflow — publishes to GitHub Pages
└── README.md
```

### Module responsibilities

| File                | Responsibility                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `engine.js`         | Creates and manages the `AudioContext`. Exposes `noteOn(freq)` / `noteOff(freq)` which spin up and tear down oscillator → gain (ADSR) → master gain → destination chains.                        |
| `synth-keyboard.js` | Custom element `<synth-keyboard>`. Renders a two-octave piano keyboard inside Shadow DOM. Dispatches a custom `note-on` / `note-off` event that `main.js` bridges to the audio engine.           |
| `synth-controls.js` | Custom element `<synth-controls>`. Encapsulates waveform radio buttons, ADSR range inputs, and volume knob inside Shadow DOM. Dispatches `controls-change` events with updated parameter values. |
| `main.js`           | Registers custom elements (`customElements.define`), initialises the audio engine, and wires component events to engine calls. Handles the `AudioContext` resume-on-first-gesture requirement.   |
| `deploy.yml`        | On every push to `main`, copies the repo contents to GitHub Pages using `actions/deploy-pages`. No build step required — the project is plain HTML/CSS/JS.                                       |

---
