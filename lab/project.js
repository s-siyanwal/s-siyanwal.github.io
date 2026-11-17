/* Lab edition: one research thread, rendered from content.json. The build writes lab/project-<id>.html with
   data-project set; opened directly, lab/project.html?id=<id> works too. */
import { boot, $, esc, paras, splitWords, MOTION } from "./core.js";
import { THREADS, projectStatus, authorsHtml, venueHtml, idLinks, EQ_FOOTNOTE } from "../js/site.js";
import { figuresFor } from "../js/figures.js";

const MODES = { tensor: 1, nmr: 2, image: 3, vqls: 3, weather: 4, qkd: 5 };
const numeric = (v) => /^\d+$/.test(String(v).trim());

function table(t) {
  if (!t || !t.rows) return "";
  return `<div class="tbl" tabindex="0" role="group" aria-label="${esc(t.caption || "Table")} (scrolls sideways on small screens)"><table>
    ${t.caption ? `<caption>${esc(t.caption)}</caption>` : ""}
    ${t.head ? `<thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>` : ""}
    <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}

const id = document.querySelector("main").dataset.project || new URLSearchParams(location.search).get("id") || "";

boot({
  page: "work",
  render(d) {
    const projects = d.projects || [], pubs = d.publications || [];
    const i = Math.max(0, projects.findIndex((x) => x.id === id));
    const pr = projects[i];
    if (!pr) { $("pr-h").textContent = "Thread not found"; return {}; }
    const [th, label] = THREADS[pr.id] || ["", "Project"];
    document.title = `${pr.name} — ${(d.profile || {}).name} (Lab edition)`;
    document.querySelector("main").classList.add(`th-${th}`);

    $("pr-count").textContent = `${String(i + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
    $("pr-thread").textContent = label;
    $("pr-h").textContent = pr.name;
    $("pr-blurb").textContent = pr.blurb || "";
    $("pr-status").innerHTML = `${esc(projectStatus(pr, pubs))}${(pr.tags || []).length ? ` <span class="pr-tags">${esc(pr.tags.join(" / "))}</span>` : ""}`;
    $("pr-metrics").innerHTML = (pr.metrics || []).map((m) => `<li data-rv><span class="v"${numeric(m.value) ? ` data-count="${esc(m.value)}"` : ""}>${esc(m.value)}</span><span class="l">${esc(m.label)}</span></li>`).join("");

    const fig = figuresFor(pr.id);
    if (fig) { $("figure").hidden = false; $("pr-figure").innerHTML = fig; }

    $("pr-role").innerHTML = pr.role ? paras(pr.role) : `<p>${esc("Contribution statement to be confirmed.")}</p>`;

    $("pr-chapters").innerHTML = (pr.sections || []).map((s, k) => `<li class="chapter" data-rv>
      <div class="ch-side"><span class="ch-n">${String(k + 1).padStart(2, "0")}</span><h3 class="ch-h">${esc(s.h || "")}</h3></div>
      <div class="ch-body prose">${paras(s.p)}${table(s.table)}</div></li>`).join("");
    if (!(pr.sections || []).length) $("breakdown").hidden = true;

    const pub = pr.paper && pubs.find((x) => x.title === pr.paper);
    if (pub) {
      $("paper").hidden = false;
      $("pr-paper").innerHTML = `
        <p class="cite-k">${esc(pub.year || "")} · ${esc(pub.type || pub.category || "")}${pub.status && pub.status !== "published" ? ` · ${esc(pub.status)}` : ""}</p>
        <h3 class="cite-t">${esc(pub.title)}</h3>
        <p class="cite-a">${authorsHtml(pub.authors)}</p>
        <p class="cite-v">${venueHtml(pub)}</p>
        ${idLinks(pub) ? `<p class="ids">${idLinks(pub)}</p>` : ""}
        ${pub.abstract ? `<div class="abstract"><p class="micro">Abstract</p><p>${esc(pub.abstract)}</p></div>` : ""}
        ${pub.equal_contribution ? EQ_FOOTNOTE : ""}`;
    }
    const ext = (pr.links || []).filter((l) => l.url);
    if (ext.length) {
      $("pr-paper").insertAdjacentHTML("beforeend", `<p class="ids">${ext.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</p>`);
      $("paper").hidden = false;
    }

    const prev = projects[(i - 1 + projects.length) % projects.length], next = projects[(i + 1) % projects.length];
    $("pr-next").innerHTML = [[prev, "Previous thread", "←"], [next, "Next thread", "→"]].map(([x, k, arrow]) => `
      <a class="next-card" href="project-${esc(x.id)}.html"><span class="micro">${k} ${arrow}</span><span class="next-t">${esc(x.name)}</span>
      <span class="next-b">${esc(x.blurb || "")}</span></a>`).join("");

    return { fieldMode: MODES[th] ?? 0, kickers: ".next-card, .chapter", after: () => heroIn() };
  },
});

/* The project title rises in word by word as the page arrives. */
function heroIn() {
  if (!MOTION) return;
  const words = splitWords($("pr-h"));
  window.gsap.from(words, { yPercent: 115, rotate: 3, duration: 1.2, ease: "expo.out", stagger: 0.05, delay: 0.35 });
  window.gsap.from(["#pr-thread", "#pr-blurb", "#pr-status"], { y: 24, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.08, delay: 0.55 });
}
