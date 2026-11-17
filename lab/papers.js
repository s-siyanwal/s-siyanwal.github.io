/* Lab edition: the bibliography, filterable by type, with abstracts on demand. */
import { boot, $, esc, MOTION } from "./core.js";
import { CATEGORIES, groupOf, authorsHtml, venueHtml, idLinks, EQ_FOOTNOTE } from "../js/site.js";

boot({
  page: "papers",
  fieldMode: 0,
  render(d) {
    const pubs = [...(d.publications || [])].sort((a, b) => String(b.year).localeCompare(String(a.year)));
    const groups = CATEGORIES.filter(([k, label]) => label && pubs.some((p) => groupOf(p) === k));
    const one = (l) => (l === "theses" ? "thesis" : l.replace(/s$/, ""));
    $("pp-lede").textContent = `${pubs.length} entries: ${groups.map(([k, label]) => {
      const n = pubs.filter((p) => groupOf(p) === k).length, l = label.toLowerCase();
      return `${n} ${n === 1 ? one(l) : l}`;
    }).join(", ")}.`;
    $("filters").innerHTML = [["all", "All"], ...groups.map(([k, label]) => [k, label])].map(([k, label], i) =>
      `<button type="button" class="chip" data-f="${k}" aria-pressed="${i === 0}">${esc(label)}</button>`).join("");
    $("biblio").innerHTML = pubs.map((p) => `<li class="bib" data-g="${esc(groupOf(p))}" data-rv>
      <p class="cite-k">${esc(p.year || "")} · ${esc(p.type || p.category || "")}${p.status && p.status !== "published" ? ` · ${esc(p.status)}` : ""}</p>
      <h3 class="cite-t">${esc(p.title)}</h3>
      ${p.authors ? `<p class="cite-a">${authorsHtml(p.authors)}</p>` : ""}
      <p class="cite-v">${venueHtml(p)}</p>
      ${idLinks(p) ? `<p class="ids">${idLinks(p)}</p>` : ""}
      ${p.abstract ? `<details class="abs"><summary>Abstract</summary><p>${esc(p.abstract)}</p></details>` : ""}</li>`).join("");
    $("biblio-foot").innerHTML = pubs.some((p) => p.equal_contribution) ? EQ_FOOTNOTE : "";

    const items = [...document.querySelectorAll(".bib")], btns = [...document.querySelectorAll(".chip")];
    btns.forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.f;
      btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const shown = items.filter((it) => { const on = f === "all" || it.dataset.g === f; it.hidden = !on; return on; });
      $("filter-status").textContent = `${shown.length} shown`;
      if (MOTION) window.gsap.fromTo(shown, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.03 });
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }));
    return {};
  },
});
