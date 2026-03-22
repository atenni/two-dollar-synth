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

