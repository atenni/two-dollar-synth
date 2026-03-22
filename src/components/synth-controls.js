/**
 * <synth-controls> — waveform selector + ADSR sliders + volume knob.
 *
 * Dispatches a single custom event whenever any control changes:
 *   controls-change { detail: { waveform?, attack?, decay?, sustain?, release?, volume? } }
 */

const WAVEFORMS = ["sine", "triangle", "sawtooth", "square"];

const TEMPLATE = document.createElement("template");
TEMPLATE.innerHTML = `
  <style>
    :host {
      display: block;
      font-family: system-ui, sans-serif;
      color: #e8e0d0;
    }

    .controls {
      display: flex;
      flex-wrap: wrap;
      gap: 24px;
      align-items: flex-start;
    }

    /* ---- Waveform selector ---- */
    .waveform-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .waveform-group legend {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.6;
      margin-bottom: 4px;
    }

    .waveform-options {
      display: flex;
      gap: 6px;
    }

    .waveform-btn {
      padding: 6px 12px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      color: inherit;
      font-size: 12px;
      cursor: pointer;
      transition: background 100ms, border-color 100ms;
    }

    .waveform-btn:hover {
      background: rgba(255,255,255,0.12);
    }

    .waveform-btn[aria-pressed="true"] {
      background: rgba(255,180,0,0.25);
      border-color: rgba(255,180,0,0.7);
      color: #ffcc55;
    }

    /* ---- Sliders ---- */
    .slider-group {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .slider-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .slider-item label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.6;
    }

    .slider-item input[type=range] {
      writing-mode: vertical-lr;
      direction: rtl;
      appearance: slider-vertical;
      -webkit-appearance: slider-vertical;
      width: 24px;
      height: 80px;
      cursor: pointer;
      accent-color: #ffcc55;
    }

    .slider-item .value {
      font-size: 10px;
      opacity: 0.5;
      min-width: 3ch;
      text-align: center;
    }

    /* ---- Volume ---- */
    .volume-group {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .volume-group label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0.6;
    }

    .volume-group input[type=range] {
      width: 100px;
      accent-color: #ffcc55;
      cursor: pointer;
    }
  </style>

  <div class="controls" part="controls">

    <fieldset class="waveform-group" style="border:none;padding:0;margin:0">
      <legend>Waveform</legend>
      <div class="waveform-options" role="group" aria-label="Waveform">
        <button class="waveform-btn" data-wave="sine"     aria-pressed="true">Sine</button>
        <button class="waveform-btn" data-wave="triangle" aria-pressed="false">Triangle</button>
        <button class="waveform-btn" data-wave="sawtooth" aria-pressed="false">Saw</button>
        <button class="waveform-btn" data-wave="square"   aria-pressed="false">Square</button>
      </div>
    </fieldset>

    <div class="slider-group">
      <div class="slider-item">
        <label for="atk">A</label>
        <input id="atk"  type="range" min="0.001" max="2"   step="0.001" value="0.01"  data-param="attack">
        <span  class="value">0.01</span>
      </div>
      <div class="slider-item">
        <label for="dec">D</label>
        <input id="dec"  type="range" min="0.001" max="2"   step="0.001" value="0.1"   data-param="decay">
        <span  class="value">0.10</span>
      </div>
      <div class="slider-item">
        <label for="sus">S</label>
        <input id="sus"  type="range" min="0"     max="1"   step="0.01"  value="0.7"   data-param="sustain">
        <span  class="value">0.70</span>
      </div>
      <div class="slider-item">
        <label for="rel">R</label>
        <input id="rel"  type="range" min="0.001" max="4"   step="0.001" value="0.3"   data-param="release">
        <span  class="value">0.30</span>
      </div>
    </div>

    <div class="volume-group">
      <label for="vol">Volume</label>
      <input id="vol" type="range" min="0" max="1" step="0.01" value="0.7">
    </div>

  </div>
`;

export class SynthControls extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: "open" });
    this.shadowRoot.appendChild(TEMPLATE.content.cloneNode(true));
    this.#bindWaveform();
    this.#bindSliders();
    this.#bindVolume();
  }

  // ---------------------------------------------------------------------------
  // Waveform buttons
  // ---------------------------------------------------------------------------

  #bindWaveform() {
    const buttons = this.shadowRoot.querySelectorAll(".waveform-btn");
    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        buttons.forEach((b) => b.setAttribute("aria-pressed", "false"));
        btn.setAttribute("aria-pressed", "true");
        this.#emit({ waveform: btn.dataset.wave });
      });
    });
  }

  // ---------------------------------------------------------------------------
  // ADSR sliders
  // ---------------------------------------------------------------------------

  #bindSliders() {
    const sliders = this.shadowRoot.querySelectorAll("input[data-param]");
    sliders.forEach((slider) => {
      const valueEl = slider.nextElementSibling;

      const update = () => {
        const v = parseFloat(slider.value);
        if (valueEl) valueEl.textContent = v.toFixed(2);
        this.#emit({ [slider.dataset.param]: v });
      };

      slider.addEventListener("input", update);
    });
  }

  // ---------------------------------------------------------------------------
  // Volume slider
  // ---------------------------------------------------------------------------

  #bindVolume() {
    const vol = this.shadowRoot.querySelector("#vol");
    vol.addEventListener("input", () => {
      this.#emit({ volume: parseFloat(vol.value) });
    });
  }

  // ---------------------------------------------------------------------------
  // Event dispatch
  // ---------------------------------------------------------------------------

  #emit(detail) {
    this.dispatchEvent(
      new CustomEvent("controls-change", {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }
}

customElements.define("synth-controls", SynthControls);
