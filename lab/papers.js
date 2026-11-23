/* Site: papers, posters and talks. One horizontal row per type (native scroll-snap, swipe on touch, buttons
   and keyboard on desktop), newest first, so the page keeps the same height however long the list grows.
   Filter chips show one type at a time. Abstracts open in place. Without JS the rows are still scrollable lists. */
import { boot, $, esc, MOTION } from "./core.js";
import { authorsHtml, venueHtml, idLinks, EQ_FOOTNOTE, hasDetail, paperHref } from "../js/site.js";

const GROUPS = [
  ["papers", "Papers", (p) => !["poster", "presentation"].includes(p.category)],
  ["posters", "Posters", (p) => p.category === "poster"],
  ["talks", "Talks", (p) => p.category === "presentation"],
];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

boot({
  page: "papers",
  fieldMode: 0,
  render(d) {
    const pubs = [...(d.publications || [])].sort((a, b) => String(b.year).localeCompare(String(a.year)));
    const groups = GROUPS.map(([k, label, f]) => [k, label, pubs.filter(f)]).filter(([, , list]) => list.length);
    // Manuscripts in preparation: topics only (no title or author list yet), kept apart from the bibliography.
    const prep = d.in_preparation || [];
    const nameOf = (id) => ((d.projects || []).find((x) => x.id === id) || {}).name || "";
    $("pp-lede").textContent = `${pubs.length} entries: ${groups.map(([k, label, list]) => plural(list.length, label.toLowerCase().replace(/s$/, ""), label.toLowerCase())).join(", ")}.`
      + (prep.length ? ` ${prep.length} more in preparation.` : "");
    $("filters").innerHTML = [["all", "All"], ...groups.map(([k, label]) => [k, label]), ...(prep.length ? [["prep", "In preparation"]] : [])].map(([k, label], i) =>
      `<button type="button" class="chip" data-f="${k}" aria-pressed="${i === 0}">${esc(label)}</button>`).join("");
    $("pub-groups").innerHTML = groups.map(([k, label, list]) => `<section class="block pub-group" id="g-${k}" aria-labelledby="g-${k}-h" data-g="${k}">
      <div class="pub-head"><h2 id="g-${k}-h" data-split>${esc(label)} <span class="pub-n">${list.length}</span></h2>
        <div class="row-ctrl"><button type="button" class="ab-btn" data-dir="-1" aria-label="Scroll ${esc(label)} back">←</button><button type="button" class="ab-btn" data-dir="1" aria-label="Scroll ${esc(label)} forward">→</button></div></div>
      <ol class="pub-row" tabindex="0" aria-label="${esc(label)}, scrolls sideways">${list.map((p) => `<li class="bib" data-rv>
        <p class="cite-k">${esc(p.year || "")} · ${esc(p.type || p.category || "")}${p.status && p.status !== "published" ? ` · ${esc(p.status)}` : ""}</p>
        <h3 class="cite-t">${esc(p.title)}</h3>
        ${p.authors ? `<p class="cite-a">${authorsHtml(p.authors)}</p>` : ""}
        <p class="cite-v">${venueHtml(p)}</p>
        ${p.role && !hasDetail(p) ? `<p class="cite-v"><b>My role.</b> ${esc(p.role)}</p>` : ""}
        ${idLinks(p) ? `<p class="ids">${idLinks(p)}</p>` : ""}
        ${p.abstract ? `<details class="abs"><summary>Abstract</summary><p>${esc(p.abstract)}</p></details>` : ""}
        ${hasDetail(p) ? `<p class="ids"><a href="${paperHref(p)}" aria-label="Full write-up: ${esc(p.title)}">Full write-up <span aria-hidden="true">→</span></a></p>` : ""}</li>`).join("")}</ol>
    </section>`).join("") + (prep.length ? `<section class="block pub-group" id="g-prep" aria-labelledby="g-prep-h" data-g="prep">
      <div class="pub-head"><h2 id="g-prep-h" data-split>In preparation <span class="pub-n">${prep.length}</span></h2>
        <div class="row-ctrl"><button type="button" class="ab-btn" data-dir="-1" aria-label="Scroll In preparation back">←</button><button type="button" class="ab-btn" data-dir="1" aria-label="Scroll In preparation forward">→</button></div></div>
      <ol class="pub-row" tabindex="0" aria-label="In preparation, scrolls sideways">${prep.map((m) => `<li class="bib" data-rv>
        <p class="cite-k">${esc(m.kind || "Manuscript")} · in preparation</p>
        <h3 class="cite-t">${esc(m.topic)}</h3>
        ${m.detail ? `<p class="cite-v">${esc(m.detail)}</p>` : ""}
        ${idLinks(m) ? `<p class="ids">${idLinks(m)}</p>` : ""}
        ${m.project && nameOf(m.project) ? `<p class="ids"><a href="project-${esc(m.project)}.html">Thread: ${esc(nameOf(m.project))} <span aria-hidden="true">→</span></a></p>` : ""}</li>`).join("")}</ol>
    </section>` : "");
    $("biblio-foot").innerHTML = pubs.some((p) => p.equal_contribution) ? EQ_FOOTNOTE : "";

    document.querySelectorAll(".pub-group").forEach((g) => {
      const row = g.querySelector(".pub-row");
      const sync = () => {
        const [b, f] = g.querySelectorAll("[data-dir]");
        b.disabled = row.scrollLeft < 4; f.disabled = row.scrollLeft + row.clientWidth > row.scrollWidth - 4;
      };
      g.querySelectorAll("[data-dir]").forEach((btn) => btn.addEventListener("click", () => {
        const card = row.querySelector(".bib");
        row.scrollBy({ left: +btn.dataset.dir * ((card ? card.offsetWidth : 300) + 16), behavior: MOTION ? "smooth" : "auto" });
      }));
      row.addEventListener("scroll", sync, { passive: true });
      requestAnimationFrame(sync);
    });

    const btns = [...document.querySelectorAll(".chip")];
    btns.forEach((b) => b.addEventListener("click", () => {
      const f = b.dataset.f;
      btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      let n = 0;
      document.querySelectorAll(".pub-group").forEach((g) => { const on = f === "all" || g.dataset.g === f; g.hidden = !on; if (on) n += g.querySelectorAll(".bib").length; });
      $("filter-status").textContent = `${n} shown`;
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      window.dispatchEvent(new Event("scroll"));
    }));
    return {};
  },
});
