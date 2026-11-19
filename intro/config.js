/* Intro (lab home): every timing and colour in one place. Read once when the intro starts.
   One idea: a point of light spreads as a wave, a measurement collapses it into detector hits, and the hits become
   the name. About 4.5 s, no input needed. Times are in milliseconds from the start of the piece. */
export const CONFIG = {
  // --- Timeline -------------------------------------------------------------------------------------------------
  t: {
    point: [150, 600],       // 1. black; a single, very small point of light fades in at the centre
    pointOut: [700, 1300],   //    ...and gives way to the wave it emits
    wave: [600, 2200],       // 2. hairline wavefronts spread from the centre and come to rest
    split: [700, 2100],      //    the one source opens into two close ones, so the rings start to interfere
    bendOff: [1800, 2200],   //    the cursor's gentle pull on the wavefronts fades out before the measurement
    collapse: [2200, 3000],  // 3. measurement: the lines resolve into sharp points where the wavefronts cross
    glide: 3000,             // 4. the points glide on curved paths into the letters of the name
    bgOut: [3900, 4500],     //    the black dissolves into the page underneath
    nameIn: [3950, 4500],    //    the real hero text sharpens in under the landing points
    dotsOut: [4050, 4500],   //    the points hand over to the text
    end: 4500,
  },
  taglineMs: 800,            // the tagline fades in last, after the overlay has gone
  replayInMs: 450,           // "Replay intro": the black fades in over the page first (never a hard cut)
  fastForwardMs: 400,        // a click, key, scroll or "Skip" runs the rest of the piece smoothly in this time

  // Custom cubic-bezier curves (x1, y1, x2, y2). Every motion uses one of these; nothing starts or stops abruptly.
  ease: {
    out: [0.16, 1, 0.3, 1],      // wave spreading: quick start, very long settle
    inOut: [0.65, 0, 0.35, 1],   // fades, the source split and the collapse
    glide: [0.6, 0, 0.15, 1],    // points leaving their fringe and landing on a letter
  },

  // --- Wave (step 2) --------------------------------------------------------------------------------------------
  wave: {
    reach: 0.92,             // final front radius, as a fraction of half the screen height (landscape)
    rings: { desktop: 16, mobile: 13 }, // wavefronts per source (ring spacing = front radius / rings)
    sep: 5.5,                // distance between the two sources, in ring spacings
    decay: 0.075,            // older (inner) wavefronts fade by this much per ring
    hairline: 0.9,           // line width in CSS pixels
    alpha: 0.5,              // line opacity
    accentAlpha: 0.38,       // the one accent hairline: the central fringe on the symmetry axis
    bend: 16,                // how far the cursor pulls the wavefronts (CSS px); 0 turns it off
    bendRadius: 170,         // reach of that pull (CSS px)
  },

  // --- Measurement and name (steps 3 and 4) ---------------------------------------------------------------------
  hits: { desktop: 520, mobile: 320, size: 1.9, landSize: 1.5 }, // max detector hits; dot diameters in CSS px
  swell: 0.28,               // the single soft luminance swell at the collapse (0 = none)
  glide: { dur: 900, stagger: 320, curve: 0.22, trail: 0.045 },   // per-point glide, left-to-right stagger, path
                                                                 // curvature, and motion-blur trail length
  point: { size: 1.8, halo: 22, haloAlpha: 0.22 },               // the first point of light (CSS px)
  nameBlur: 6,               // the hero text sharpens from this blur (CSS px) to crisp

  // --- Colour ---------------------------------------------------------------------------------------------------
  // Monochrome plus one accent. Dark theme: true black. Light theme: the same piece inverted, ink on paper
  // (bg matches the lab's --bg so the hand-off is seamless). intro.css uses the same two backgrounds for the cover.
  colors: {
    dark: { bg: "#000000", ink: "#ffffff", accent: "#aecbff", tint: 0.025 }, // tint: faint accent glow at the centre
    light: { bg: "#f2efe8", ink: "#15192b", accent: "#2342b8", tint: 0 },
  },
  lightMode: "invert",       // "invert" (ink on paper) or "skip" (no intro in the light theme)

  // --- Session, rendering, sound --------------------------------------------------------------------------------
  sessionKey: "intro-played", // sessionStorage flag; ?intro=1 forces the intro, ?intro=0 skips it
  dprCap: 2,                 // device-pixel-ratio cap; hairlines need real resolution
  fpsProbeMs: 1000,          // measure the first second of the wave; below minFps, render at a lower resolution
  minFps: 45,
  sound: { default: false, freq: 110, gain: 0.14, attack: 0.3, release: 2.6 }, // one low, soft tone at the collapse;
                                                                               // off unless the visitor turns it on
};
