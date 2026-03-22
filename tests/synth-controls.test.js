import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { SynthControls } from "../src/components/synth-controls.js";

describe("SynthControls element", () => {
  /** @type {SynthControls} */
  let el;

  beforeEach(() => {
    el = document.createElement("synth-controls");
    document.body.appendChild(el);
  });

  afterEach(() => {
    el.remove();
  });

  it("is defined as a custom element", () => {
    expect(customElements.get("synth-controls")).toBeDefined();
  });

  it("renders a shadow root", () => {
    expect(el.shadowRoot).not.toBeNull();
  });

  // ---- Waveform buttons ----

  it("renders one button per waveform type", () => {
    const buttons = el.shadowRoot.querySelectorAll(".waveform-btn");
    expect(buttons.length).toBe(4);
  });

  it("starts with sine waveform button pressed", () => {
    const sineBtn = el.shadowRoot.querySelector('[data-wave="sine"]');
    expect(sineBtn.getAttribute("aria-pressed")).toBe("true");
  });

  it("dispatches controls-change with waveform when a button is clicked", () => {
    let received = null;
    el.addEventListener("controls-change", (e) => {
      received = e.detail;
    });

    const sawBtn = el.shadowRoot.querySelector('[data-wave="sawtooth"]');
    sawBtn.click();

    expect(received?.waveform).toBe("sawtooth");
  });

  it("sets the clicked button as pressed and deselects others", () => {
    const sawBtn = el.shadowRoot.querySelector('[data-wave="sawtooth"]');
    const sineBtn = el.shadowRoot.querySelector('[data-wave="sine"]');
    sawBtn.click();

    expect(sawBtn.getAttribute("aria-pressed")).toBe("true");
    expect(sineBtn.getAttribute("aria-pressed")).toBe("false");
  });

  // ---- ADSR sliders ----

  it("renders 4 ADSR range inputs", () => {
    const sliders = el.shadowRoot.querySelectorAll("input[data-param]");
    expect(sliders.length).toBe(4);
  });

  it.each([
    ["attack", "atk"],
    ["decay", "dec"],
    ["sustain", "sus"],
    ["release", "rel"],
  ])(
    "dispatches controls-change with %s when its slider changes",
    (param, id) => {
      let received = null;
      el.addEventListener("controls-change", (e) => {
        received = e.detail;
      });

      const slider = el.shadowRoot.querySelector(`#${id}`);
      slider.value = "0.5";
      slider.dispatchEvent(new Event("input"));

      expect(received?.[param]).toBeCloseTo(0.5, 2);
    },
  );

  it("emits a numeric value (not a string) for ADSR params", () => {
    let received = null;
    el.addEventListener("controls-change", (e) => {
      received = e.detail;
    });

    const slider = el.shadowRoot.querySelector("#atk");
    slider.dispatchEvent(new Event("input"));

    expect(typeof received?.attack).toBe("number");
  });

  // ---- Volume slider ----

  it("dispatches controls-change with volume when volume slider changes", () => {
    let received = null;
    el.addEventListener("controls-change", (e) => {
      received = e.detail;
    });

    const vol = el.shadowRoot.querySelector("#vol");
    vol.value = "0.3";
    vol.dispatchEvent(new Event("input"));

    expect(received?.volume).toBeCloseTo(0.3, 2);
  });

  it("emits a numeric value (not a string) for volume", () => {
    let received = null;
    el.addEventListener("controls-change", (e) => {
      received = e.detail;
    });

    const vol = el.shadowRoot.querySelector("#vol");
    vol.dispatchEvent(new Event("input"));

    expect(typeof received?.volume).toBe("number");
  });
});
