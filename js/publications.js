import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal } from "./site.js";

(async function () {
  let data;
  try { data = await loadData(); }
  catch (e) { fail("Could not load content. Run a local server — see README."); console.error(e); return; }

  mountChrome(data, "pubs");
  mountFooter(data);
  document.title = `Publications — ${data.profile.name}`;

  const pubs = (data.publications || []).slice()
    .sort((a, b) => (b.year || "").localeCompare(a.year || ""));

  $("pub-lede").textContent =
    `${pubs.length} entries across journals, conferences, and posters in quantum machine learning, quantum cryptography, and NMR quantum computing.`;

  // Type filter buttons, derived from data
  const types = [...new Set(pubs.map((p) => p.type).filter(Boolean))];
  $("pub-filter").innerHTML =
    `<button class="filter-btn is-active" data-t="all" aria-pressed="true">All</button>` +
    types.map((t) => `<button class="filter-btn" data-t="${esc(t)}" aria-pressed="false">${esc(t)}s</button>`).join("");

  $("pub-list").innerHTML = pubs.map((p, i) => {
    const doi = p.doi ? `<a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">DOI ↗</a>` : "";
    return `
    <li class="pubcard" data-t="${esc(p.type || "")}" data-reveal style="--i:${i % 3}">
      <div class="pubcard-top">
        <span class="pub-year">${esc(p.year || "")}</span>
        <span class="pub-type">${esc(p.type || "")}</span>
      </div>
      <h2 class="pubcard-title">${esc(p.title)}</h2>
      <p class="pubcard-meta">
        <span class="pub-venue">${esc(p.venue)}</span>
        ${p.authors ? ` · ${esc(p.authors)}` : ""}
        ${p.status ? ` · <span class="pub-status">${esc(p.status)}</span>` : ""}
      </p>
      ${p.abstract ? `<p class="pubcard-abstract">${esc(p.abstract)}</p>` : ""}
      ${doi ? `<div class="pubcard-links">${doi}</div>` : ""}
    </li>`;
  }).join("");

  $("pub-filter").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    const t = btn.dataset.t;
    $("pub-filter").querySelectorAll(".filter-btn").forEach((b) => {
      const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on);
    });
    document.querySelectorAll(".pubcard").forEach((c) => {
      c.classList.toggle("is-hidden", !(t === "all" || c.dataset.t === t));
    });
  });

  initReveal();
})();
