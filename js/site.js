/* Shared utilities for all pages. Content comes from data/content.json. */

export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export const $ = (id) => document.getElementById(id);

/* Resolve data path whether we're at root or in a subpage */
export async function loadData() {
  const res = await fetch("data/content.json", { cache: "no-cache" });
  if (!res.ok) throw new Error("HTTP " + res.status);
  return res.json();
}

export function fail(msg) {
  const m = document.querySelector("main") || document.body;
  m.innerHTML = `<div class="wrap" style="padding:3rem 0;color:var(--accent-2)">${msg}</div>`;
}

/* ---------- Sticky bar + shared chrome ---------- */
export function mountChrome(data, active) {
  const p = data.profile || {};
  const bar = document.querySelector(".topbar-inner");
  if (!bar) return;
  const cv = (p.links || {}).cv_pdf;
  const item = (href, label, id) =>
    `<a href="${href}"${active === id ? ' aria-current="page" class="is-current"' : ""}>${label}</a>`;
  bar.innerHTML = `
    <a class="topbar-name" href="index.html">${esc(p.name)}</a>
    <nav class="topbar-nav" aria-label="Sections">
      ${item("index.html#work", "Work", "work")}
      ${item("index.html#projects", "Projects", "projects")}
      ${item("publications.html", "Publications", "pubs")}
      ${item("about.html", "About", "about")}
      ${cv ? `<a class="topbar-cv" href="${esc(cv)}" target="_blank" rel="noopener">CV ↓</a>` : ""}
    </nav>
    <button type="button" class="theme-toggle"></button>`;
  mountThemeToggle(bar.querySelector(".theme-toggle"));
}

/* ---------- Theme: Auto (follows the OS) → Light → Dark ----------
   The inline <head> script applies a saved choice before first paint. */
const THEMES = ["auto", "light", "dark"];
function mountThemeToggle(btn) {
  let cur = "auto";
  try { cur = localStorage.getItem("theme") || "auto"; } catch (e) { /* storage blocked */ }
  if (!THEMES.includes(cur)) cur = "auto";
  const paint = () => {
    btn.textContent = cur[0].toUpperCase() + cur.slice(1);
    btn.setAttribute("aria-label", `Colour theme: ${cur}. Switch theme`);
  };
  paint();
  btn.addEventListener("click", () => {
    cur = THEMES[(THEMES.indexOf(cur) + 1) % 3];
    const root = document.documentElement;
    if (cur === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", cur);
    try { cur === "auto" ? localStorage.removeItem("theme") : localStorage.setItem("theme", cur); } catch (e) { /* storage blocked */ }
    paint();
  });
}

export function mountFooter(data) {
  const p = data.profile || {};
  const f = $("footer-slot");
  if (!f) return;
  const links = (p.profiles || []).filter((x) => x.primary).map((x) =>
    `<a href="${esc(x.url)}"${x.url.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"'}>${esc(x.label)}</a>`).join("");
  f.innerHTML = `
    <div class="wrap"><div class="panel footer-grid">
      <div>
        <p class="footer-name">${esc(p.name)}</p>
        <p class="footer-loc">${esc(p.location || "")}</p>
      </div>
      <div class="footer-links">${links}</div>
    </div></div>`;
}

/* ---------- Scroll reveal (respects reduced motion) ---------- */
export function initReveal() {
  initPrint();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const els = document.querySelectorAll("[data-reveal]");
  const showAll = () => els.forEach((e) => e.classList.add("is-in"));

  // Only opt into hidden-then-reveal once we know JS is running.
  document.documentElement.classList.add("js");

  if (reduce || !("IntersectionObserver" in window)) { showAll(); return; }

  // Failsafe: whatever happens, nothing stays invisible for more than 2.5s.
  const failsafe = setTimeout(showAll, 2500);
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  els.forEach((e) => io.observe(e));

  // Print / find-in-page must never hit invisible text.
  window.addEventListener("beforeprint", () => { clearTimeout(failsafe); showAll(); });
}

/* Printed pages show collapsed details; restore what the reader had open afterwards. */
function initPrint() {
  let opened = [];
  window.addEventListener("beforeprint", () => {
    opened = [...document.querySelectorAll("details:not([open])")];
    opened.forEach((d) => { d.open = true; });
  });
  window.addEventListener("afterprint", () => { opened.forEach((d) => { d.open = false; }); });
}

/* ---------- Tag / chip helpers ---------- */
export const tags = (arr = []) => arr.map((t) => `<span class="tag">${esc(t)}</span>`).join("");
/* Built site (scripts/build.py) has one static file per project; raw repo uses ?id=. */
export const projectHref = (id) => document.documentElement.hasAttribute("data-built")
  ? `project-${encodeURIComponent(id)}.html`
  : `project.html?id=${encodeURIComponent(id)}`;

export const audLabel = { academic: "Research", industry: "Engineering", both: "Research + Engineering" };

/* ---------- Citations: built only from stored fields ---------- */
export const CATEGORIES = [
  ["journal", "Journal articles", "Journal"],
  ["conference", "Conference papers", "Conference"],
  ["preprint", "Preprints", "Preprint"],
  ["thesis", "Theses", "Thesis"],
  ["manuscript", "Manuscripts in preparation", "Manuscript"],
  ["presentation", "Presentations", "Presentation"],
  ["poster", null, "Poster"],
];
/* Posters list under Presentations, as in the CV. */
export const groupOf = (p) => (p.category === "poster" ? "presentation" : p.category);
const catLabel = Object.fromEntries(CATEGORIES.map(([k, , one]) => [k, one]));
export const chip = (cat) => cat && catLabel[cat]
  ? `<span class="chip-cat chip-cat--${cat}">${catLabel[cat]}</span>` : "";

/* His name in <strong>; an equal-contribution star in the accent-2 hue. */
export function authorsHtml(authors = "") {
  return authors.split(/,\s*/).map((a) => {
    const star = a.endsWith("*");
    const name = esc(star ? a.slice(0, -1) : a);
    const shown = /Siyanwal/.test(a) ? `<strong>${name}</strong>` : name;
    return shown + (star ? '<span class="eq">*</span>' : "");
  }).join(", ");
}

export function venueHtml(p) {
  const bits = [p.venue && `<em>${esc(p.venue)}</em>`];
  if (p.volume) bits.push(`${esc(p.volume)}${p.issue ? `(${esc(p.issue)})` : ""}${p.article ? `, ${esc(p.article)}` : ""}`);
  if (p.pages) bits.push(`pp. ${esc(p.pages)}`);
  bits.push(esc(p.year || ""));
  return bits.filter(Boolean).join(", ");
}

export function idLinks(p) {
  const out = [];
  if (p.doi) out.push(`<a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">doi:${esc(p.doi)}</a>`);
  if (p.arxiv) out.push(`<a href="https://arxiv.org/abs/${esc(p.arxiv)}" target="_blank" rel="noopener">arXiv:${esc(p.arxiv)}</a>`);
  if (p.xplore) out.push(`<a href="https://ieeexplore.ieee.org/document/${esc(p.xplore)}" target="_blank" rel="noopener">IEEE Xplore ${esc(p.xplore)}</a>`);
  return out.join("");
}

export const EQ_FOOTNOTE = '<p class="footnote"><span class="eq">*</span> Equal contribution.</p>';

/* Research threads are a display grouping of projects, not content. */
export const THREADS = {
  "nmr-entanglement": ["nmr", "NMR entanglement"],
  "vqc-fpga": ["weather", "Weather QML · FPGA inference"],
  "qir-qnn": ["image", "Quantum image classification"],
  "qkd-testbeds": ["qkd", "QKD protocols"],
  "qcrypto-circuits": ["qkd", "Quantum cryptography"],
};
