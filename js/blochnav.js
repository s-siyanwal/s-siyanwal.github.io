/* "On this page" navigator for the home page, drawn as a Bloch sphere.

   The state arrow tracks reading progress: |0⟩ at the top of the page, |1⟩ at the bottom, with the
   azimuth precessing as you go. Underneath are ordinary links to each section, so it works as a plain
   keyboard-operable nav. It only appears on wide screens, where the side gutter has room, and is hidden
   in print. Without JS the links still work; the arrow simply stays at |0⟩. */

const R = 28, C = 40, Y = 48;    // sphere radius and centre (C, Y) in the 80×96 viewBox

function point(theta, phi) {
  // Oblique projection: z up, the equator drawn as an ellipse squashed to 0.3.
  return [C + R * Math.sin(theta) * Math.cos(phi), Y - R * Math.cos(theta) + R * 0.3 * Math.sin(theta) * Math.sin(phi)];
}

function sphere() {
  return `<svg class="bn-sphere" viewBox="0 0 80 96" aria-hidden="true" focusable="false">
    <circle cx="${C}" cy="${Y}" r="${R}" class="bn-ring"/>
    <ellipse cx="${C}" cy="${Y}" rx="${R}" ry="${R * 0.3}" class="bn-eq"/>
    <line x1="${C}" y1="${Y - R}" x2="${C}" y2="${Y + R}" class="bn-axis"/>
    <text x="${C}" y="${Y - R - 7}" class="bn-k">|0⟩</text>
    <text x="${C}" y="${Y + R + 13}" class="bn-k">|1⟩</text>
    <line x1="${C}" y1="${Y}" x2="${C}" y2="${Y - R}" class="bn-vec"/>
    <circle cx="${C}" cy="${Y - R}" r="3" class="bn-tip"/>
  </svg>`;
}

export function mountBlochNav(sections) {
  const items = sections.map((id) => {
    const s = document.getElementById(id), h = s && s.querySelector("h2");
    return s && h ? { id, label: h.textContent.trim(), el: s } : null;
  }).filter(Boolean);
  if (items.length < 2) return;

  let nav = document.querySelector(".bloch-nav");
  if (!nav) {
    nav = document.createElement("nav");
    nav.className = "bloch-nav";
    nav.setAttribute("aria-label", "On this page");
    nav.innerHTML = sphere() + `<ol>${items.map((it) =>
      `<li><a href="#${it.id}">${it.label}</a></li>`).join("")}</ol>`;
    document.body.append(nav);
  }
  const vec = nav.querySelector(".bn-vec"), tip = nav.querySelector(".bn-tip");
  const links = [...nav.querySelectorAll("a")];

  let queued = false;
  const update = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const prog = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const [x, y] = point(Math.PI * prog, Math.PI * 3 * prog - Math.PI / 2);
    vec.setAttribute("x2", x.toFixed(1)); vec.setAttribute("y2", y.toFixed(1));
    tip.setAttribute("cx", x.toFixed(1)); tip.setAttribute("cy", y.toFixed(1));
    // Current section: the last one whose top has passed 40% of the viewport.
    let cur = 0;
    items.forEach((it, i) => { if (it.el.getBoundingClientRect().top < window.innerHeight * 0.4) cur = i; });
    links.forEach((a, i) => (i === cur ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}
