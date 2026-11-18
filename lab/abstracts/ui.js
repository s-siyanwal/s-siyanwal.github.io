/* Small helpers shared by the interactive abstracts. Every abstract renders an SVG or canvas figure plus plain
   HTML controls (real buttons and range inputs, so keyboard and screen readers work), and a polite live region
   that says in words what the figure now shows. */
export const NS = "http://www.w3.org/2000/svg";
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function shell(host, { title, lede, note }) {
  host.innerHTML = `<div class="ab">
    <div class="ab-fig"></div>
    <div class="ab-side">
      <p class="ab-title">${esc(title)}</p>
      ${lede ? `<p class="ab-lede">${lede}</p>` : ""}
      <div class="ab-controls"></div>
      <p class="ab-live" aria-live="polite"></p>
    </div>
    ${note ? `<p class="ab-note">${note}</p>` : ""}
  </div>`;
  return { fig: host.querySelector(".ab-fig"), controls: host.querySelector(".ab-controls"), live: host.querySelector(".ab-live") };
}

export function svg(w, h, label, { interactive = false } = {}) {
  const s = document.createElementNS(NS, "svg");
  s.setAttribute("viewBox", `0 0 ${w} ${h}`);
  s.setAttribute("role", interactive ? "group" : "img");
  s.setAttribute("aria-label", label);
  return s;
}

export function el(parent, tag, attrs = {}, text) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  parent.append(n);
  return n;
}

export function slider(parent, { label, min, max, step, value, fmt = (v) => v, onInput }) {
  const id = `sl-${Math.random().toString(36).slice(2, 8)}`;
  const wrap = document.createElement("div");
  wrap.className = "ab-slider";
  wrap.innerHTML = `<label for="${id}">${esc(label)} <output for="${id}"></output></label><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}"/>`;
  parent.append(wrap);
  const input = wrap.querySelector("input"), out = wrap.querySelector("output");
  const upd = () => { out.textContent = fmt(+input.value); onInput(+input.value); };
  input.addEventListener("input", upd);
  out.textContent = fmt(+input.value);
  return { input, set(v) { input.value = v; upd(); } };
}

export function buttons(parent, items, { group = "", pressed = null } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "ab-buttons";
  if (group) { wrap.setAttribute("role", "group"); wrap.setAttribute("aria-label", group); }
  const btns = items.map(([label, fn, key]) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "ab-btn"; b.textContent = label;
    if (key != null) b.dataset.key = key;
    b.addEventListener("click", () => { if (pressed) btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); fn(b); });
    wrap.append(b);
    return b;
  });
  if (pressed) btns.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.key === pressed)));
  parent.append(wrap);
  return btns;
}

/* A step-through control: Previous / Next / Play, with "Step k of n". Play pauses off-screen via pause(). */
export function stepper(parent, n, onStep, { reduce = false, interval = 2600 } = {}) {
  const wrap = document.createElement("div");
  wrap.className = "ab-stepper";
  wrap.innerHTML = `<button type="button" class="ab-btn" data-a="prev">← Previous</button>
    <span class="ab-step" aria-live="off"></span>
    <button type="button" class="ab-btn" data-a="next">Next →</button>
    <button type="button" class="ab-btn" data-a="play" aria-pressed="false">Play</button>`;
  parent.append(wrap);
  let k = 0, timer = null, playing = false;
  const label = wrap.querySelector(".ab-step"), play = wrap.querySelector('[data-a="play"]');
  const go = (i) => { k = (i + n) % n; label.textContent = `Step ${k + 1} of ${n}`; onStep(k); };
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { stop(); if (playing) timer = setInterval(() => go(k + 1), interval); };
  wrap.querySelector('[data-a="prev"]').onclick = () => { playing = false; play.setAttribute("aria-pressed", "false"); play.textContent = "Play"; stop(); go(k - 1); };
  wrap.querySelector('[data-a="next"]').onclick = () => { playing = false; play.setAttribute("aria-pressed", "false"); play.textContent = "Play"; stop(); go(k + 1); };
  play.onclick = () => { playing = !playing; play.setAttribute("aria-pressed", String(playing)); play.textContent = playing ? "Pause" : "Play"; start(); };
  if (reduce) play.hidden = true;
  go(0);
  return { pause: stop, resume: start, go };
}

export const fmt = (x, d = 3) => (Math.abs(x) < 1e-12 ? 0 : x).toFixed(d);
