import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal, CATEGORIES, groupOf, chip, authorsHtml, venueHtml, idLinks, EQ_FOOTNOTE } from "./site.js";

(async function () {
  let data;
  try { data = await loadData(); }
  catch (e) { fail("Could not load content. Run a local server — see README."); console.error(e); return; }

  mountChrome(data, "pubs");
  mountFooter(data);
  document.title = `Publications — ${data.profile.name}`;

  const pubs = (data.publications || []).slice()
    .sort((a, b) => (b.year || "").localeCompare(a.year || ""));

  const groups = CATEGORIES.filter(([, heading]) => heading)
    .map(([k, heading]) => [k, heading, pubs.filter((p) => groupOf(p) === k)])
    .filter(([, , list]) => list.length);
  $("pub-lede").textContent =
    `${pubs.length} entries in quantum machine learning, quantum cryptography and NMR quantum computing, grouped by type.`;

  $("pub-list").innerHTML = groups.map(([k, heading, list]) => `
    <section class="pub-group" aria-labelledby="g-${k}">
      <h2 id="g-${k}">${heading}</h2>
      <ol class="cites">${list.map((p) => {
        const i = pubs.indexOf(p);
        return `
        <li class="cite" data-reveal>
          <div class="cite-head">${chip(p.category)}<span class="cite-year">${esc(p.year || "")}</span></div>
          <h3 class="cite-title">${esc(p.title)}</h3>
          <p class="cite-authors">${authorsHtml(p.authors)}</p>
          <p class="cite-venue">${venueHtml(p)}</p>
          ${p.abstract ? `<p class="cite-result">${esc(p.abstract)}</p>` : ""}
          ${p.note ? `<p class="cite-note">${esc(p.note)}</p>` : ""}
          <div class="ids">${idLinks(p)}${groupOf(p) === "presentation" ? "" : `<button type="button" class="bib-btn" data-i="${i}" aria-label="Copy BibTeX for ${esc(p.title)}">Copy BibTeX</button><span class="bib-status" role="status"></span>`}</div>
        </li>`;
      }).join("")}</ol>
    </section>`).join("") + (pubs.some((p) => p.equal_contribution) ? EQ_FOOTNOTE : "");

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
  const kind = { journal: "article", conference: "inproceedings", thesis: "mastersthesis" }[p.category] || "misc";
  const venueField = { article: "journal", inproceedings: "booktitle", mastersthesis: "school", misc: "howpublished" }[kind];
  const clean = (s) => String(s || "").replace(/[{}]/g, "");
  const names = clean(p.authors).replace(/\*/g, "").replace(/\s*et al\.?/i, "").split(/,|\band\b/)
    .map((s) => s.trim()).filter(Boolean);
  const author = names.join(" and ") + (/et al/i.test(p.authors || "") ? " and others" : "");
  const surname = (names[0] || "anon").split(/[\s.]+/).filter(Boolean).pop().toLowerCase().replace(/[^a-z]/g, "");
  const word = ((p.title || "").toLowerCase().match(/[a-z]{4,}/) || ["paper"])[0];
  const fields = [
    ["title", p.title && `{${clean(p.title)}}`],
    ["author", author],
    [venueField, clean(p.venue)],
    ["type", kind === "mastersthesis" && clean(p.type)],
    ["year", clean(p.year)],
    ["volume", clean(p.volume)],
    ["number", clean(p.issue)],
    ["pages", clean(p.article || p.pages).replace("–", "--")],
    ["doi", clean(p.doi)],
    ["eprint", clean(p.arxiv)],
    ["note", clean(p.status)],
  ].filter(([, v]) => v).map(([k, v]) => `  ${k} = {${v}}`);
  return `@${kind}{${surname}${p.year || ""}${word},\n${fields.join(",\n")}\n}`;
}
