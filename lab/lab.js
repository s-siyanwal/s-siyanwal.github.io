/* Lab edition renderer. Reads the same data/content.json as the classic site; nothing here adds or rewords facts.
   Kinetic pieces (name, question, worldline) are progressive enhancement: the prerendered page is complete and
   readable without JS, and everything holds still under prefers-reduced-motion. */
import { esc, THREADS, projectStatus, roleHref } from "../js/site.js";
import { mountBlochNav } from "../js/blochnav.js";
import { mountLabField } from "./field.js";

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const still = window.matchMedia("(prefers-reduced-motion: reduce)");
const PRERENDER = Boolean(window.__PRERENDER__);      // set by scripts/build.py while it snapshots pages

/* ---------- Fail-safe reveal: CSS gated on html.js, 2.5 s timeout, print handler ---------- */
root.classList.add("js");
const showAll = () => document.querySelectorAll("[data-rv]").forEach((el) => el.classList.add("is-in"));
setTimeout(showAll, 2500);
window.addEventListener("beforeprint", showAll);

/* ---------- Theme (shared "theme" key with the classic site) ---------- */
function themeToggle(btn) {
  const order = ["auto", "light", "dark"];
  let cur = "auto";
  try { cur = localStorage.getItem("theme") || "auto"; } catch (e) { /* storage blocked */ }
  if (!order.includes(cur)) cur = "auto";
  const paint = () => {
    btn.textContent = `Theme: ${cur[0].toUpperCase()}${cur.slice(1)}`;
    btn.setAttribute("aria-label", `Theme: ${cur}. Switch colour theme`);
  };
  btn.addEventListener("click", () => {
    cur = order[(order.indexOf(cur) + 1) % 3];
    if (cur === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", cur);
    try { cur === "auto" ? localStorage.removeItem("theme") : localStorage.setItem("theme", cur); } catch (e) { /* blocked */ }
    paint();
  });
  paint();
}

const startOf = (period = "") => {
  const m = String(period).match(/([A-Za-z]{3})?\w*\s*(\d{4})/);
  if (!m) return 0;
  const mon = m[1] ? ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[1].toLowerCase()) : 0;
  return +m[2] + Math.max(mon, 0) / 12;
};

function render(d) {
  const p = d.profile || {}, pubs = d.publications || [];
  const roles = [...(d.experience || []), ...(d.research || [])];
  const now = roles.find((e) => e.current);

  $("hero-kicker").textContent = (p.focus_areas || []).join(" · ");
  $("hero-name").innerHTML = `<span class="sr">${esc(p.name)}</span><span aria-hidden="true">${
    String(p.name || "").split(" ").map((w) => `<span class="w">${[...w].map((c) => `<span class="ch">${esc(c)}</span>`).join("")}</span>`).join(" ")
  }</span>`;
  $("hero-plus").textContent = p.title || "";
  $("hero-tagline").textContent = p.tagline || "";
  $("hero-now").innerHTML = now ? `<b>NOW</b>${esc(now.role.split("—")[0].trim())} · ${esc(now.org)}` : "";
  $("mark").textContent = p.name || "";

  // The question: Shiv's own research question when set, else the opening line of his research statement.
  const a = d.about || {};
  const q = a.question || (a.statement || [])[0] || p.research_interests || "";
  let it = false;                          // *phrase* marks an italic accent, possibly spanning words
  $("q-text").innerHTML = q.split(/(\s+)/).map((tok) => {
    if (!tok.trim()) return tok;
    let w = tok, close = false;
    if (w.startsWith("*")) { it = true; w = w.slice(1); }
    const m = it && w.match(/^([^*]*)\*(.*)$/);
    if (m) { w = m[1] + m[2]; close = true; }
    const out = `<span class="wd">${it ? `<em>${esc(w)}</em>` : esc(w)}</span>`;
    if (close) it = false;
    return out;
  }).join("");

  // Work: every research thread, typography first.
  $("works").innerHTML = (d.projects || []).map((pr, i) => {
    const [, label] = THREADS[pr.id] || ["", "Project"];
    const m = (pr.metrics || [])[0];
    return `<li class="work" data-rv><a href="../project-${esc(pr.id)}.html">
      <span class="n">${String(i + 1).padStart(2, "0")}</span>
      <span class="thread">${esc(label)}</span>
      <h3>${esc(pr.name)}</h3>
      <p class="status">${esc(projectStatus(pr, pubs))}</p>
      <p class="blurb">${esc(pr.blurb || "")}</p>
      <span class="side">${m ? `<span class="metric">${esc(m.value)}<small>${esc(m.label)}</small></span>` : ""}
        <p class="tags">${esc((pr.tags || []).slice(0, 4).join(" / "))}</p></span>
    </a></li>`;
  }).join("");

  // Alongside: posters, talks and recognition, as recorded.
  const talks = pubs.filter((x) => x.category === "poster" || x.category === "presentation").map((x) => ({
    k: `${x.category === "poster" ? "Poster" : "Talk"}${x.year ? " · " + x.year : ""}`, t: x.title, v: x.venue || "",
  }));
  const awards = (d.awards || []).map((x) => ({ k: `Recognition${x.year ? " · " + x.year : ""}`, t: x.title, v: "" }));
  $("notes-list").innerHTML = [...talks, ...awards].map((x) => `<li class="note" data-rv>
      <p class="k">${esc(x.k)}</p><p class="t">${esc(x.t)}</p>${x.v && x.v !== x.t ? `<p class="v">${esc(x.v)}</p>` : ""}</li>`).join("");

  // Path: education and roles in time order, oldest first.
  const events = [
    ...(d.education || []).map((e) => ({ when: e.period, title: e.degree, org: e.school, sum: e.note || "", start: startOf(e.period) })),
    ...roles.map((e) => ({
      when: e.period, title: e.role, org: e.org + (e.location ? ` · ${e.location}` : ""), sum: e.summary || "",
      href: `../${roleHref(e)}`, now: e.current, start: startOf(e.period),
    })),
  ].sort((x, y) => x.start - y.start);
  $("worldline").innerHTML = events.map((e) => `<li class="event${e.now ? " is-now" : ""}" data-rv>
      <p class="when">${esc(e.when || "")}${e.now ? " · now" : ""}</p>
      <h3>${esc(e.title)}</h3><p class="org">${esc(e.org)}</p>
      ${e.sum ? `<p class="sum">${esc(e.sum)}</p>` : ""}
      ${e.href ? `<a class="go" href="${esc(e.href)}" aria-label="Role page: ${esc(e.title)}">Role page →</a>` : ""}</li>`).join("");

  $("tools-list").innerHTML = (d.skills || []).map((g) =>
    `<div data-rv><dt>${esc(g.category)}</dt><dd>${esc((g.items || []).join(" · "))}</dd></div>`).join("");

  $("avail").textContent = p.availability || "";
  const links = [];
  if (p.email) links.push([`mailto:${p.email}`, "Email"]);
  if ((p.links || {}).cv_pdf) links.push([`../${p.links.cv_pdf}`, "CV (PDF)"]);
  (p.profiles || []).filter((x) => x.url && !x.url.startsWith("mailto:")).forEach((x) => links.push([x.url, x.label]));
  $("links").innerHTML = links.map(([href, label]) =>
    `<li><a href="${esc(href)}"${href.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${esc(label)} <span aria-hidden="true">↗</span></a></li>`).join("");
  $("foot-name").textContent = [p.name, p.location].filter(Boolean).join(" · ");
}

/* ---------- Kinetic name: letters on springs, pushed aside by the pointer ---------- */
function kineticName(h1, field) {
  const chars = [...h1.querySelectorAll(".ch")].map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0, cx: 0, cy: 0 }));
  if (!chars.length) return;
  const measure = () => chars.forEach((c) => {
    const r = c.el.getBoundingClientRect();
    c.cx = r.left + r.width / 2 - c.x + window.scrollX; c.cy = r.top + r.height / 2 - c.y + window.scrollY;
  });
  let mx = -9999, my = -9999, raf = 0, last = 0, lastPulse = 0;
  const RAD = 170, PUSH = 46;
  const step = (now) => {
    const dt = Math.min((now - last) / 1000 || 0.016, 0.033);
    last = now;
    let moving = false;
    const px = mx + window.scrollX, py = my + window.scrollY;
    for (const c of chars) {
      const dx = c.cx - px, dy = c.cy - py, dist = Math.hypot(dx, dy) || 1;
      const f = dist < RAD ? (1 - dist / RAD) ** 2 * PUSH : 0;
      const tx = (dx / dist) * f, ty = (dy / dist) * f;
      c.vx += ((tx - c.x) * 180 - c.vx * 18) * dt; c.vy += ((ty - c.y) * 180 - c.vy * 18) * dt;
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.el.style.transform = `translate(${c.x.toFixed(1)}px, ${c.y.toFixed(1)}px) rotate(${(c.x * 0.15).toFixed(2)}deg)`;
      if (Math.abs(c.x) + Math.abs(c.y) + Math.abs(c.vx) + Math.abs(c.vy) > 0.05 || f > 0) moving = true;
      if (f > PUSH * 0.6 && now - lastPulse > 400) { lastPulse = now; field.pulse(mx, my); }
    }
    raf = moving ? requestAnimationFrame(step) : 0;
  };
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };
  window.addEventListener("pointermove", (e) => { if (still.matches) return; mx = e.clientX; my = e.clientY; kick(); }, { passive: true });
  document.addEventListener("pointerleave", () => { mx = my = -9999; kick(); });
  window.addEventListener("resize", measure);
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(measure);
  measure();
}

/* ---------- Scroll-linked pieces: the question's words and the worldline ---------- */
function scrollLinked() {
  const q = $("q-text"), words = [...q.querySelectorAll(".wd")], line = $("worldline");
  let queued = false;
  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    const r = q.getBoundingClientRect();
    const prog = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const lit = prog * (words.length + 2);
    words.forEach((w, i) => w.style.setProperty("--o", Math.min(1, Math.max(0.55, 0.55 + 0.45 * (lit - i))).toFixed(2)));
    const lr = line.getBoundingClientRect();
    line.style.setProperty("--p", Math.min(1, Math.max(0, (vh * 0.6 - lr.top) / lr.height)).toFixed(3));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  if (still.matches) { words.forEach((w) => w.style.setProperty("--o", 1)); line.style.setProperty("--p", 1); return; }
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}

function reveal() {
  const els = document.querySelectorAll("[data-rv]");
  if (still.matches || !("IntersectionObserver" in window)) { showAll(); return; }
  const io = new IntersectionObserver((list) => list.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
  }), { rootMargin: "0px 0px -8% 0px" });
  els.forEach((el) => io.observe(el));
}

(async function main() {
  themeToggle(document.querySelector(".theme-toggle"));
  let data;
  try {
    const res = await fetch("../data/content.json", { cache: "no-cache" });
    data = await res.json();
  } catch (e) {
    showAll();
    console.error(e);
    return;
  }
  render(data);
  reveal();
  scrollLinked();
  mountBlochNav(["question", "work", "notes", "path", "tools", "contact"]);
  root.dataset.labReady = "1";
  if (PRERENDER) return;

  // The field and the kinetic name start once the page is idle, so they never delay first paint.
  const start = () => {
    const field = mountLabField({ toggle: document.querySelector(".field-toggle"), hint: $("field-hint") });
    if (!still.matches && window.matchMedia("(pointer: fine)").matches) kineticName($("hero-name"), field);
    document.querySelectorAll(".work a").forEach((a) => a.addEventListener("pointerenter", () => {
      const r = a.getBoundingClientRect();
      field.pulse(r.left + 40, r.top + r.height / 2);
    }));
  };
  "requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 1200 }) : setTimeout(start, 200);
})();
