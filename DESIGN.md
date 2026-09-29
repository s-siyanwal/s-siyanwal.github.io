# DESIGN.md: "Interference"

The design system for shivanshu-siyanwal.github.io. Direction A from `/workspace/site-redesign/research.md` (§2A, §3), picked by Shivanshu. This file documents the tokens **as implemented** in `style.css` on `fe/interference` (`c6c0f40`); where the build deviates from research.md it says so.

## 1. Idea

A living lab notebook. The paper ground and editorial serif tell admissions readers "researcher"; the clean sans, mono labels and data tiles tell R&D managers "ships systems". The signature is the hero circuit: **the circuit is the CV**. There's one wire per `profile.focus_areas` entry, and each wire ends in a Bloch-sphere readout and a measurement box that feeds the metric tiles.

Two accents with strict jobs:
- **Verdigris (`--accent`)** is structure: links, rules under headings, eyebrows, focus rings, primary button.
- **Vermilion "phase" (`--accent-2`)** is *live state only*: the wave packet's phase shift, Bloch vectors, the metric-tile ping, the active filter, the "current" role badge. If something isn't live, it isn't vermilion. Scarcity is what makes it memorable.

Not allowed: hacker/terminal cosplay, neon glows, gradients on text, stock imagery, invented numbers, count-up animations.

## 2. Colour tokens

| Token | Light | Dark | Job |
|---|---|---|---|
| `--bg` | `#faf8f2` | `#0e1315` | page ground |
| `--surface` | `#f0ece1` | `#161e21` | tinted sections, meas boxes |
| `--surface-2` | `#e7e2d4` | `#1d272b` | chips |
| `--ink` | `#16181d` | `#eceae3` | headings, body |
| `--ink-soft` | `#434852` | `#bec3be` | lede, secondary copy |
| `--ink-faint` | `#5c616b` | `#959d99` | meta, dates, wires |
| `--rule` | `#dcd6c6` | `#273236` | hairlines (decorative) |
| `--rule-strong` | `#847d69` | `#5e6e74` | control borders (UI, ≥3:1) |
| `--accent` | `#0b6a5a` | `#4fd1b5` | verdigris |
| `--accent-ink` | `#07493e` | `#7fe0ca` | text-weight accent (links, values) |
| `--accent-soft` | `#ddece6` | `#14302b` | tag / availability fill |
| `--accent-line` | `#8dbdb1` | `#2f6f62` | circuit feeds, card hover edge (decorative) |
| `--accent-2` | `#b93a0e` | `#ff8c5a` | phase / live |
| `--on-accent` | `#ffffff` | `#0e1315` | text on accent or accent-2 fills |
| `--footer-bg` / `-ink` / `-faint` | `#16181d` / `#eceae3` / `#a9ada8` | `#080b0c` / `#eceae3` / `#a9ada8` | footer band |

Dark applies on `data-theme="dark"`, or under `prefers-color-scheme: dark` unless `data-theme="light"`. An inline head script sets the attribute before first paint (no flash). Print forces light tokens.

**Deviation from research.md:** it only specified 8 tokens. The build adds `surface-2`, `rule`, `rule-strong`, `accent-ink`, `accent-soft`, `accent-line` and the footer set. All eight research values are used unchanged.

### Contrast (re-run against the final tokens, WCAG 2.x formula)

All text pairs ≥ 4.5:1 and all UI pairs ≥ 3:1 in both themes. **0 fails.**

| Pair | Light | Dark |
|---|---|---|
| ink / bg | 16.72 | 15.54 |
| ink-soft / bg | 8.64 | 10.46 |
| ink-faint / bg | 5.86 | 6.73 |
| ink-faint / surface | 5.27 | 6.09 |
| ink-soft / surface-2 (chips) | 7.09 | 8.52 |
| accent / bg | 6.13 | 9.91 |
| accent-ink / bg | 9.73 | 11.95 |
| accent-ink / accent-soft (tags, availability) | 8.47 | 9.02 |
| accent-2 / bg | 5.38 | 8.15 |
| on-accent / accent (primary button) | 6.51 | 9.91 |
| on-accent / accent-2 (active filter, current badge) | 5.72 | 8.15 |
| footer-faint / footer-bg | 7.81 | 8.68 |
| UI: rule-strong / bg (filter border) | 3.86 | 3.53 |
| UI: rule-strong / surface | 3.48 | 3.19 |
| UI: accent / bg (focus ring) | 6.13 | 9.91 |

`--rule` (1.37 / 1.42) and light `--accent-line` (1.97) are below 3:1, so they may **only** be decorative: never the sole boundary of a control or the only cue for state.

## 3. Type

| Role | Family | Use |
|---|---|---|
| `--display` | Fraunces (variable, wght 400–700, `font-optical-sizing: auto`) | name, h1–h3, lede, stat values |
| `--text` | Geist (400–600) | body, UI |
| `--mono` | Geist Mono (400–500) | eyebrows, nav, labels, dates, gate glyphs, metric labels |

Self-hosted latin-subset woff2 in `assets/fonts/` with OFL licences, `font-display: swap`, and the two first-screen faces preloaded. No Google Fonts request anywhere, including the build (`be/og-tokens`).

Scale (as built): body `16.5px / 1.6`; hero h1 `clamp(2.7rem, 7.2vw, 4.9rem)`, weight 560, line-height 1, tracking −0.025em; lede `clamp(1.15rem, 2.3vw, 1.4rem)` Fraunces 400; section h2 `clamp(1.5rem, 3.4vw, 2rem)` with a 34×2px verdigris rule under it; card h3 `1.12rem`; mono labels `.6–.8rem`, uppercase, tracking `.02–.13em`. Mono labels never go below `.6rem` (≈10px).

## 4. Space, shape, layout

- `--maxw: 1120px`, `--pad: clamp(1.15rem, 4vw, 2.75rem)`, `--bar-h: 54px` (sticky topbar).
- Radius is near-zero on purpose (notebook, not app): `2px` on tags, chips and badges; `0` on cards, buttons and tiles.
- Grids of tiles and profiles use the "1px gap on a `--rule` background" hairline pattern.
- Breakpoints as built: 560, 620, 640 (circuit wide mode), 820, 860, 960 (circuit + tiles side by side), 980.

**Deviation:** research.md suggested the sticky identity column at ≥1024px. front-end-bot dropped it because it fights the full-width circuit band, and the sticky topbar already carries the name. I agree; it's noted in the PR.

## 5. Motion

Tokens: `--dur-1 150ms`, `--dur-2 220ms`, `--dur-3 380ms`, `--ease-out cubic-bezier(.2,.7,.3,1)`, `--ease-spring cubic-bezier(.34,1.4,.64,1)`.

Rules:
1. Everything animated sits behind `prefers-reduced-motion: no-preference` **and** `html.js`. Reduced motion, JS off, print, and a never-firing IntersectionObserver all show the final static frame (the 2.5s failsafe and `beforeprint` stay).
2. **Never animate opacity on text.** Entrances are transform-only (`rise`: translateY 12px → 0). Mid-fade text fails contrast audits and is harder to read.
3. Nothing flashes more than 3 times a second.
4. Any loop longer than 5 seconds needs a visible pause control (WCAG 2.2.2).
5. Numbers are never counted up; the HTML value is the truth.

The hero live layer: a Gaussian wave packet travels the wires on a 6.4s loop, its gradient shifting verdigris → vermilion as it crosses the gates. Gates dip briefly as it passes, and the metric tiles get a one-time 300ms vermilion underline when it reaches the measurement boxes. On fine pointers the nearest wire lifts to full ink, its gates scale 1.06, and the rest dim to 60%. The loop pauses when the hero is off screen.

## 6. Components

- **Hero circuit (`js/circuit.js`)**: data-driven wire count from `focus_areas`, labels in Geist Mono 11px `--ink-soft`, wires `--ink-faint` 1px, feeds dashed `--accent-line`. Prerendered SVG is the final state.
- **Bloch glyph**: 10px-radius circle + equator ellipse in `--ink-faint`, vertical axis, state vector and tip in `--accent-2`. One fixed state per wire; it's decorative, so `aria-hidden`. Drawn inline by circuit.js, so there are no separate SVG files to ship.
- **Metric tiles (`#glance`)**: Fraunces 600 value in `--accent-ink`, mono label, faint note. 2×2 on mobile, one column beside the circuit at ≥960px.
- **Buttons**: mono `.8rem`, 1px ink border, square. Primary is an `--accent` fill with `--on-accent` text, and hover goes to `--accent-ink`.
- **Filter**: segmented, `--rule-strong` border; the active segment is an `--accent-2` fill with `aria-pressed="true"`.
- **Cards**: square, `--rule` border (the text and heading carry identification, so the low-contrast edge is fine); hover lifts −3px with the spring ease, an `--accent-line` edge and a soft verdigris shadow.
- **Experience**: `details.xp`; the "current" badge is an `--accent-2` fill.
- **Publications**: dated one-line list, mono year in `--accent-ink`, venue in `--accent`.
- **Project pages**: Distill-style Role / Track / Topics metadata block.
- **Theme toggle**: Auto / Light / Dark, hidden without JS.
- **Focus**: `2px solid var(--accent)`, offset 3px, on everything.

## 7. Open items for fe/interference

1. **Blocker (a11y): the hero loop has no pause control.** The packet, phase and gate animations run `infinite` on 6.4s and only pause off screen. That fails WCAG 2.2.2 and the team's own ">5s needs a pause" rule. Fix: add a `button.qc-pause` inside `.hero-instrument`, mono `.7rem`, at least 24×24px, `aria-pressed`, label "Pause motion" / "Play motion", toggling `.is-paused` (the CSS already honours it). Hide it with `html:not(.js)` and under reduced motion. The alternative is to run the packet once and stop, but the pause button keeps the life.
2. **Token hygiene (non-blocking):** `.btn`, `.profile-link`, `.filter-btn`, `.xp-toggle .chev` and `[data-reveal]` still use raw durations and easings (`.14s`, `.16s`, `.2s`, `.6s cubic-bezier(.2,.7,.3,1)`). Map them to `--dur-1`, `--dur-2`, `--dur-3` and `--ease-out` so the "tokens only" rule holds. `[data-reveal]` also fades opacity; per rule 2 it should go transform-only, which is the same change back-end-bot flagged to get Lighthouse a11y on home from 96 to 100.
