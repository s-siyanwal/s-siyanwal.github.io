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
    const bib = `<button type="button" class="bib-btn" data-i="${i}" aria-label="Copy BibTeX for ${esc(p.title)}">Copy BibTeX</button>`;
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
      <div class="pubcard-links">${doi}${bib}<span class="bib-status" role="status"></span></div>
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

  $("pub-list").addEventListener("click", async (e) => {
    const btn = e.target.closest(".bib-btn");
    if (!btn) return;
    const status = btn.parentElement.querySelector(".bib-status");
    const text = bibtex(pubs[+btn.dataset.i]);
    try { await navigator.clipboard.writeText(text); status.textContent = "Copied"; }
    catch { window.prompt("Copy BibTeX:", text); }
    setTimeout(() => { status.textContent = ""; }, 2000);
  });

  initReveal();
})();

/* BibTeX built only from stored fields; nothing is guessed. */
function bibtex(p) {
  const kind = { "Journal article": "article", "Conference paper": "inproceedings" }[p.type] || "misc";
  const venueField = { article: "journal", inproceedings: "booktitle", misc: "howpublished" }[kind];
  const clean = (s) => String(s || "").replace(/[{}]/g, "");
  const names = clean(p.authors).replace(/\s*et al\.?/i, "").split(/,|\band\b/)
    .map((s) => s.trim()).filter(Boolean);
  const author = names.join(" and ") + (/et al/i.test(p.authors || "") ? " and others" : "");
  const surname = (names[0] || "anon").split(/[\s.]+/).filter(Boolean).pop().toLowerCase().replace(/[^a-z]/g, "");
  const word = ((p.title || "").toLowerCase().match(/[a-z]{4,}/) || ["paper"])[0];
  const fields = [
    ["title", p.title && `{${clean(p.title)}}`],
    ["author", author],
    [venueField, clean(p.venue)],
    ["year", clean(p.year)],
    ["doi", clean(p.doi)],
    ["note", clean(p.status)],
  ].filter(([, v]) => v).map(([k, v]) => `  ${k} = {${v}}`);
  return `@${kind}{${surname}${p.year || ""}${word},\n${fields.join(",\n")}\n}`;
}
