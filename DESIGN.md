# DESIGN.md: "Landscape" (v2)

The design system for shivanshu-siyanwal.github.io, from Shivanshu's v2 brief (`inbox/redesign-v2-brief.md`, 30 Sep 2026). It supersedes "Interference": the paper ground is gone. The site should read as a **research record** for PhD committees in quantum information, QML and quantum software, set on glass panels over a quiet valley landscape.

Still forbidden: invented facts or metrics, terminal cosplay, neon, text gradients, rainbow headings, remote images, fonts or scripts, and stock photography of people or things. The single background landscape (§2) and Shivanshu's own portrait (§8) are the only imagery allowed.

## 1. Files

| File | What it is |
|---|---|
| `assets/landscape-light.svg` | day valley (2.3 KB) |
| `assets/landscape-dark.svg` | dusk valley, same geometry (2.3 KB) |
| `art/assets/figure-image-encodings.svg` | quantum-image data figure, reference for inlining (§6) |
| `art/assets/figure-fpga.svg` | FPGA schematic, reference for inlining (§6) |
| `assets/portrait.jpg` | front-end-bot's crop, approved (§8) |
| `art/contrast-v2.py` | contrast check for every pair below. Rerun after any token change. |

Copy the two SVGs from `art/assets/` into `assets/`.

## 2. Landscape ground

**Choice:** a hand-authored layered SVG (a monsoon valley), not a photo. It was drawn for this site, so it's the site's own work and needs no third-party licence (licence: same as the repo). There's nothing to credit. Why not a photo: a CC0 photo would cost 150–200 KB on mobile and needs a separate dark variant, and a busy photo fights the glass panels. The SVGs are about 2.3 KB each, scale to any width, and swap cleanly between themes.

Layers from back to front: a sky gradient, a low saffron sun (dusk moon in dark), two ragged far ranges in stone blue, a mist band, moss mid-hills, a winding river (river blue, highlight at the source), and a deep-teal foreground ridge on each side.

Implementation:
- `body::before { content:""; position:fixed; inset:0; z-index:-1; background:url(assets/landscape-light.svg) center bottom / cover no-repeat; }`, with the dark SVG under dark tokens. Use a fixed pseudo-element, never `background-attachment: fixed`, because iOS jank breaks that.
- The ground is static: no parallax and no animation.
- Print: `body::before { display:none }` and a white page.
- Type never sits directly on the landscape. Every text block is inside a panel (§3).

## 3. Colour tokens

Glass panels are checked **composited over the worst-case landscape pixel**: the darkest ridge (`#223b37`) under light panels and the brightest river highlight (`#5f8a99`) under dark panels. The solid fallbacks are checked too.

| Token | Light | Dark | Job |
|---|---|---|---|
| `--panel` | `rgb(250 251 249 / .88)` | `rgb(12 20 23 / .86)` | glass panel fill |
| `--panel-solid` | `#f6f8f6` | `#0e171a` | fallback when `backdrop-filter` is unsupported |
| `--panel-blur` | `blur(14px) saturate(1.2)` | same | used only inside `@supports (backdrop-filter: blur(1px))` |
| `--bar` | `rgb(250 251 249 / .96)` | `rgb(12 20 23 / .96)` | sticky header, almost opaque, so the landscape never shows through |
| `--ink` | `#12201f` | `#e9eeec` | headings, body |
| `--ink-soft` | `#34443f` | `#c3ccc9` | lede, abstracts |
| `--ink-faint` | `#4d5b57` | `#9eaaa6` | meta, dates, captions |
| `--rule` | `#c9d3cf` | `#26353a` | hairlines (decorative only) |
| `--rule-strong` | `#6f7f7a` | `#62757b` | control borders, portrait edge |
| `--accent` | `#0b5f58` | `#5cc8b8` | teal: links, focus, primary button |
| `--accent-2` | `#8f4310` | `#f0a35a` | copper/saffron: small emphasis only (see below) |
| `--on-accent` | `#ffffff` | `#0c1417` | text on accent fills |

**Copper/saffron (`--accent-2`)** is used sparingly: the equal-contribution `*` and its footnote marker, the active filter segment, the "current" role badge, and the tile ping. It never appears on headings, body text or large fills.

Panels have a 1px `--rule` border and an 8px radius. The fallback rule is `@supports not (backdrop-filter: blur(1px)) { --panel: var(--panel-solid) }`.

### Publication chips (one muted hue per category)

Text / tint, each ≥ 4.5:1.

| Category | Light | Dark |
|---|---|---|
| journal | `#0d5752` / `#d9ebe8` | `#8fd9cd` / `#12302d` |
| conference | `#1c4f70` / `#dce8f0` | `#9cc8e6` / `#142a3a` |
| preprint | `#465a1f` / `#e6ecd6` | `#c2d68f` / `#243016` |
| poster | `#574f42` / `#ece8df` | `#d8ccb4` / `#2d2a22` |
| thesis | `#584669` / `#ebe5f0` | `#cdb8e6` / `#2c2338` |

`content.json` has journal, conference, preprint and poster entries today. There's no thesis entry, so thesis stays defined for later. Chips use Geist Mono `.66rem`, uppercase, a 3px radius, and the category word is always written out, so colour is never the only cue.

### Thread rails on project cards

A 3px left rail, each ≥ 3:1 on glass and on solid. The card's thread label is always written as text too.

| Thread | Light | Dark |
|---|---|---|
| NMR entanglement | `#6b5b95` | `#a894d6` |
| Weather QML | `#2f7598` | `#6fb4d8` |
| Quantum image | `#3a7f66` | `#6fc4a2` |
| QKD | `#4c6a85` | `#8fb0cf` |
| FPGA inference | `#94641c` | `#d9a35a` |
| Tensor networks (TensNet) | `#9a4a6c` | `#e394b6` |
| VQLS forecasting | `#66691f` | `#c4c76a` |

The figure for each thread (§6) uses that thread's hue as its one colour.

### Contrast results (`python3 art/contrast-v2.py`): **0 fails**

| Pair | Light glass / solid | Dark glass / solid |
|---|---|---|
| ink | 13.07 / 15.71 | 13.41 / 15.49 |
| ink-soft | 8.00 / 9.62 | 9.59 / 11.07 |
| ink-faint | 5.55 / 6.67 | 6.56 / 7.57 |
| accent | 5.86 / 7.05 | 7.79 / 9.00 |
| accent-2 | 5.49 / 6.61 | 7.56 / 8.73 |
| rule-strong (UI) | 3.28 / 3.94 | 3.26 / 3.76 |
| lowest rail (UI) | 3.71 / 4.46 | 5.89 / 6.81 |
| on-accent / accent | 7.52 | 9.23 |
| on-accent / accent-2 | 7.05 | 8.95 |
| lowest chip | 6.32 | 8.25 |

## 4. Type

Keep the local Fraunces (display), Geist (text) and Geist Mono (labels, ids, dates) with `font-display: swap`. No Google Fonts.
- Hero name: `clamp(2.4rem, 6.4vw, 4.2rem)`, weight 560. Research line in Fraunces 400, `clamp(1.1rem, 2.2vw, 1.35rem)`.
- Section h2: `clamp(1.45rem, 3.2vw, 1.9rem)`. The decorative rule sits **under the heading box** as a block `::after` in normal flow, never absolutely positioned. That fixes rules cutting through wrapped headings.
- Citations: Geist `.98rem` / 1.55. **His name is bold** (`<strong>`). The equal-contribution `*` is `--accent-2`, and every page with a mark gets a footnote line: "* Equal contribution."
- DOIs, arXiv ids, Xplore ids and emails get Geist Mono `.78rem` plus `overflow-wrap: anywhere`.

## 5. Layout and overlap rules

Audit widths: 360, 768, 1120 and 1440, plus 390 and 1280 for screenshots.
1. **One column under 720px**, everywhere.
2. **No absolutely positioned text over text.** The only absolute elements allowed are decorative (`aria-hidden`) with no text in them.
3. **Sticky header:** `--bar` background plus blur, a solid fallback, and `z-index` above everything. `scroll-padding-top` equals the bar height. The landscape must not show through it.
4. **Hero circuit** (`#hero-circuit`) sits in its own panel below the hero identity panel, inside a reserved box: `aspect-ratio` from the SVG viewBox, set in CSS so there's no layout shift. `#glance` sits beside it at ≥1120px and stacks above it below 1120px. The circuit never shares a grid cell with the tiles or the portrait.
5. **Filter rows** go on their own line under the section heading (`flex-wrap`, a gap of `.5rem`), never inline with the h2.
6. **Author lists, links and DOIs** get `overflow-wrap: anywhere`. No `white-space: nowrap` on anything longer than a date.
7. Panels are spaced `clamp(1rem, 3vw, 1.75rem)` apart so the landscape shows between them as gutters.

Home order (brief §2):
1. Hero panel: portrait, name, research identity, C-DAC role, links, CV.
2. Circuit and glance.
3. Four selected papers: venue, year and a one-sentence result, taken from content.
4. Research-thread cards linking to `project.html`.
5. Experience.
6. Education.
7. Awards.

## 6. Figures (4 schematics, 1 data figure)

Shared rules:
- Original inline SVG in a `<figure>` with a `<figcaption>` that starts **"Schematic."** and is present in the HTML, so JS-off shows it.
- The SVG has `role="img"` and `aria-labelledby` pointing at the caption.
- viewBox 640×360, `max-width: 100%`, and a reserved aspect ratio.
- The colours are ink, ink-faint and the thread hue. Nothing else.
- No numbers unless the number is in `content.json`, and no axis tick values. The one exception is the quantum-image figure (Tables 1–2 of the J. Supercomputing paper).
- Static by default. Any motion goes behind reduced-motion `no-preference` and settles to the static frame.

**NMR (thread hue plum).** The three-qubit SLOCC classes as a four-tier hierarchy drawn with thin arrows pointing down:
- GHZ at the top.
- W below it, with a GHZ → W arrow, because W lies in the SLOCC closure of GHZ.
- BS1, BS2 and BS3 below W, each with an arrow from W.
- SEP at the bottom, with an arrow from each BS class.

On the right, a small pipeline: "ρ: 64 elements → 128 real features (Re + Im)" → "canonical form: 18 (14 Re, 4 Im)" → "ANOVA ranking" → "ANN" → "class label". The canonical form does the 128 → 18 reduction. ANOVA only ranks the 18, so never draw it as the step that reduces them. Caption: "Schematic. The SLOCC classes of three-qubit pure states that the ANN distinguishes, and the reduction from 128 real features to 18 canonical-form inputs, ranked by ANOVA."

**Weather QML (river blue).** Three traces on unlabelled axes (arrows marked "time" and "temperature"):
- observed, in ink
- classical baseline, `--ink-faint` dashed
- variational model, thread hue

The traces are drawn from a fixed deterministic function and are clearly illustrative. Don't show accuracy, error or skill numbers. Caption: "Schematic. Illustrative temperature series with a classical baseline and a variational-circuit forecast; not data from the paper."

**Quantum image (moss). Data figure, not a schematic.** Qubit count vs circuit depth at 16×16 for the four encodings the paper benchmarks, using only the numbers from Tables 1–2 of Tiwari et al., J. Supercomputing 82:495 (2026), doi 10.1007/s11227-026-08621-3. Reference file: `art/assets/figure-image-encodings.svg` (3 KB). Inline it and keep its `var(--ink)`, `var(--ink-faint)`, `var(--rule)` and `var(--thread-image)` references (map `--thread-image` to the Quantum image rail hue) so it follows the theme.
- x axis: "Qubit count", linear, 8–18. y axis: "Circuit depth (log scale)", ticks 10³, 10⁴, 10⁵. Corner label "16×16 images".
- Points (qubits, depth): QBIR (16, 5,612), FTQR (12, 43,273), NASS (9, 50,436), FRQCI (11, 125,299). Every point carries its name and both values as text, so nothing depends on colour.
- Under the SVG, a `<details>` with the summary "Data (Tables 1–2)" holds a real `<table>`: encoding, qubits, depth and total gates at 16×16 (FTQR 59,683; NASS 72,713; QBIR 9,701; FRQCI 164,353). This keeps the figure readable at 360px, where the SVG labels shrink.
- No other numbers, no trend lines, no fitted curves. The only encodings are these four; FRQI, NEQR and QPIE don't appear.
- Caption (replaces the "Schematic." prefix for this figure only): "Circuit resources of four quantum image encodings for 16×16 images: qubit count against circuit depth on a log scale. Data from Tables 1–2 of the J. Supercomputing paper."
- Optional sentence for the project text, only if front-end-bot needs one, stated exactly as the tables show: "At 16×16, QBIR gives the shallowest circuit but uses the most qubits, NASS uses the fewest qubits, and FRQCI is the deepest with the most gates." Don't reuse the paper's line that amplitude-based encodings like FRQCI minimise qubit usage, because in Table 2 NASS uses fewer qubits than FRQCI.

**FPGA (ochre). Numberless schematic.** Reference file: `art/assets/figure-fpga.svg` (1.8 KB). Inline it; it uses `var(--th)` for the thread hue plus `--ink`, `--ink-faint` and `--rule-strong`.
- Left to right: a "VQC" box holding a 3-wire glyph of one StronglyEntanglingLayers block (a rotation box on each wire, then a CNOT ring between neighbours: 0→1, 1→2, 2→0, drawn as a control dot and ⊕ target, no multi-controlled boxes), then an "FPGA kernel (HLS)" box outlined in the thread hue, then an "edge inference" box. An "HBM" block sits under the kernel with a two-way arrow.
- No timings, speedups, batch sizes, bars, board names or CPU/GPU comparison.

Caption: "Schematic. A variational quantum circuit (VQC) run as an FPGA kernel with HBM, for edge inference."

**QKD (slate).** Three small rows:
- DPS: Alice → lossy fibre → Bob, with a pulse train that has phase marks.
- COW: Alice → lossy fibre → Bob, with the pulses in time-slot **pairs** marked by a faint bracket: (μ, 0) for one bit value, (0, μ) for the other, and (μ, μ) for a decoy. Use four pairs (for example bit, bit, decoy, bit), which gives 8 slots, never an odd count. An empty slot is a dashed outline.
- Twin-field: Alice → Charlie ← Bob, a central measurement station.

Loss is a fading gradient on the fibre. There's no Eve and no attack detail. Caption: "Schematic. Protocol layouts for DPS, COW and twin-field QKD studied at TCG CREST."

## 7. Motion

The Interference rules carry over:
1. Everything animated sits behind `prefers-reduced-motion: no-preference` and `html.js`, with the 2.5s failsafe and `beforeprint`.
2. No opacity animation on text; transforms only.
3. No flashing.
4. A pause control for anything over 5s.
5. No count-ups.

The hero circuit keeps its one-shot 3.2s sweep, the Play/Pause control and the 2.92s tile ping, now inside its panel. The landscape never moves. Durations and easings stay tokens (`--dur-1`, `--dur-2`, `--dur-3`, `--ease-out`, `--ease-spring`).

## 8. Portrait

Source: `inbox/portrait-source.jpg`, supplied by Shivanshu. front-end-bot's crop (`assets/portrait.jpg`, 440×550, 4:5) is **approved as is**. It keeps his full head, and the watermark from the bottom-right corner is cropped out. It isn't retouched. Keep the JPEG under 60 KB. A `.webp` in a `<picture>` element is optional.
- **Home hero:** inside the hero glass panel, left of the name at ≥720px. It's 148×185 on desktop and 96×120 on mobile, stacked above the name and centred. Use `object-fit: cover` and a 2px `--rule-strong` edge (stone) with a 4px radius, never a circle. Alt: "Portrait of Shivanshu Siyanwal". Explicit width and height, eager loading, `fetchpriority` left at the default.
- **About page:** at the start of the research statement, same crop, up to 220×275, `loading="lazy"`.
- Nowhere else. It never goes over the circuit, the tiles or the header. No hover zoom and no grayscale filter. It prints.

## 9. Print

Print drops the landscape (`body::before` is hidden), makes the panels plain white with no border or blur, forces light ink, keeps the portrait and figures, and shows link URLs after DOIs and arXiv ids.

## 10. Open items (for JARVIS and Shivanshu)

1. Resolved: the quantum-image figure is now the Tables 1–2 plot (§6).
2. There's no thesis entry in content.json, so the thesis chip is defined but unused.
