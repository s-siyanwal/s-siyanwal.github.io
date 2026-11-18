/* Big Bang intro: every tunable in one place. Values are read once when the intro starts.
   Times are in milliseconds unless noted. Colours are CSS hex strings. */
export const CONFIG = {
  // --- Interaction ----------------------------------------------------------------------------------------------
  clicks: 7,                 // clicks / taps / Space presses that charge the centre before it erupts
  idleHintMs: 8000,          // no click for this long → show a gentle hint
  idleAutoMs: 12000,         // no click for this long → the bang triggers by itself, so nobody gets stuck
  skipMode: "short-bang",    // "short-bang": skipping plays a ~0.6 s bang, then the settled page; "instant": no bang
  skipBangMs: 600,           // length of the shortened bang used by skip

  // --- Timeline --------------------------------------------------------------------------------------------------
  eruptionMs: 1500,          // the bang: flash, shockwave rings, particle burst, string filaments (1.2–1.8 s)
  revealMs: 2000,            // particles converge onto the hero name and cross-fade to the real text (1.5–2.5 s)
  revealOverlap: 0.25,       // fraction of the eruption during which the reveal already starts

  // --- Once per session ------------------------------------------------------------------------------------------
  sessionKey: "intro-played", // sessionStorage flag; ?intro=1 forces the intro for review

  // --- Rendering -------------------------------------------------------------------------------------------------
  dprCap: 2,                 // device-pixel-ratio cap (desktop)
  resolution: { desktop: 1.5, mobile: 0.75 }, // canvas pixels per CSS pixel actually rendered (≤ dprCap); the vacuum
                             // and corona are soft, so phones render below native resolution to stay smooth
  particles: {               // matter + antimatter + sparks, chosen by device and adjusted by the FPS probe
    desktop: 30000,
    mobile: 6000,
    reveal: { desktop: 7000, mobile: 2600 }, // particles that form the name
    filaments: 48,           // vibrating strings in the bang
  },
  fpsProbeMs: 1000,          // measure the first second; if slower than minFps, halve particles and render at 0.75×
  minFps: 45,

  // --- Colours ---------------------------------------------------------------------------------------------------
  colors: {
    vacuum: "#03050b",       // near-black base of the quantum vacuum
    tint: "#6f8fe8",         // the site accent, blended very subtly into the vacuum
    matter: "#9fbfff",       // matter field (the accent hue, lifted for a dark ground)
    antimatter: "#ffc08a",   // antimatter field (complementary warm hue)
    spark: "#fff4e6",        // annihilation sparks and pair creation
    corona: "#dfe8ff",       // eclipse corona
  },

  // --- Sound -----------------------------------------------------------------------------------------------------
  soundDefault: false,       // muted until the visitor turns it on; the choice is kept in localStorage("intro-sound")
};
