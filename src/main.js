import { AudioEngine } from "./engine.js";
import "./components/synth-keyboard.js";
import "./components/synth-controls.js";

const engine = new AudioEngine();
const keyboard = document.querySelector("synth-keyboard");
const controls = document.querySelector("synth-controls");

// Resume AudioContext on first user gesture (browser autoplay policy)
const resume = () => {
  engine.resume();
  document.removeEventListener("pointerdown", resume);
  document.removeEventListener("keydown", resume);
};
document.addEventListener("pointerdown", resume, { once: true });
document.addEventListener("keydown", resume, { once: true });

// Bridge keyboard events → audio engine
keyboard.addEventListener("note-on", (e) => engine.noteOn(e.detail.freq));
keyboard.addEventListener("note-off", (e) => engine.noteOff(e.detail.freq));

// Bridge controls events → audio engine
controls.addEventListener("controls-change", (e) => {
  const { waveform, attack, decay, sustain, release, volume } = e.detail;
  if (waveform !== undefined) engine.setWaveform(waveform);
  if (volume !== undefined) engine.setVolume(volume);
  if (
    attack !== undefined ||
    decay !== undefined ||
    sustain !== undefined ||
    release !== undefined
  ) {
    engine.setADSR({ attack, decay, sustain, release });
  }
});
