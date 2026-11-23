/* Site: one research thread, rendered from content.json (+ data/links.json for artifacts). The build writes
   project-<id>.html with data-project set; opened directly, project.html?id=<id> works too.
   Two reading levels: Layman (plain-language write-up) and Expert (methods, numbers, results). The choice is kept in
   localStorage("view") and applied before first paint by the inline script in the page head; without JS both show. */
import { boot, $, esc, paras, splitWords, MOTION, PRERENDER, REDUCE, extras, hrefOf } from "./core.js";
import { THREADS, projectStatus, authorsHtml, venueHtml, idLinks, EQ_FOOTNOTE } from "../js/site.js";
import { figuresFor } from "../js/figures.js";

const MODES = { tensor: 1, nmr: 2, image: 3, vqls: 3, weather: 4, qkd: 5 };
/* Threads that have an interactive abstract in lab/abstracts/<id>.js. Other threads hide that section (and never
   request a module that does not exist), so a new project needs only its content.json entry. */
const ABSTRACTS = new Set(["vqc-fpga", "qir-qnn", "qkd-testbeds", "qcrypto-circuits", "nmr-entanglement", "vqls-forecasting", "tensnet", "bitter-solenoid", "cpinn", "worm-like-spin-chain", "ebl-sexual-antagonism"]);
const numeric = (v) => /^\d+$/.test(String(v).trim());
const root = document.documentElement;

function table(t) {
  if (!t || !t.rows) return "";
  return `<div class="tbl" tabindex="0" role="group" aria-label="${esc(t.caption || "Table")} (scrolls sideways on small screens)"><table>
    ${t.caption ? `<caption>${esc(t.caption)}</caption>` : ""}
    ${t.head ? `<thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>` : ""}
    <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}

/* Paper link for the top of the page: DOI first, then the project's own "Paper" link, then IEEE Xplore. */
function paperUrl(pr, pub) {
  if (pub && pub.doi) return `https://doi.org/${pub.doi}`;
  const l = (pr.links || []).find((x) => /paper/i.test(x.label) && x.url);
  if (l) return l.url;
  if (pub && pub.xplore) return `https://ieeexplore.ieee.org/document/${pub.xplore}`;
  return "";
}

/* Artifacts row: Read the paper, Preprint, PDF, Code, Data, Slides / poster. Anything without a link is left out. */
function artifactsHtml(pr, pub) {
  const a = ((extras.links || {}).artifacts || {})[pr.id] || {};
  const fromContent = (re) => ((pr.links || []).find((x) => re.test(x.label) && x.url) || {}).url || "";
  const items = [
    ["Read the paper", paperUrl(pr, pub), "primary"],
    ["Preprint", (pub && pub.arxiv ? `https://arxiv.org/abs/${pub.arxiv}` : "") || ((pub && (pub.links || []).find((x) => /preprint/i.test(x.label) && x.url)) || {}).url || fromContent(/preprint/i)],
    ["PDF", hrefOf(a.pdf)],
    ["Code", hrefOf(a.code) || fromContent(/code|github/i)],
    ["Data", hrefOf(a.data) || fromContent(/data/i)],
    ["Slides / poster", hrefOf(a.slides) || fromContent(/slides|poster/i)],
    ["Live demo", fromContent(/demo/i)],
  ].filter(([, url]) => url);
  return items.length ? `<ul class="artifact-row" aria-label="Artifacts">${items.map(([label, url, kind]) =>
    `<li><a class="btn${kind === "primary" ? " btn--solid" : ""}" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)} <span aria-hidden="true">↗</span></a></li>`).join("")}</ul>` : "";
}

/* My role: the thread's pipeline with the stages I did highlighted; collaborators named; unknown owners left neutral. */
function pipelineHtml(pr) {
  const st = pr.pipeline || [];
  if (!st.length) return "";
  const unknown = st.some((x) => !x.by);
  return `<figure class="pipe-fig"><ol class="pipe">${st.map((x) => {
    const mine = x.by === "me", cls = mine ? "is-mine" : x.by ? "is-other" : "is-open";
    return `<li class="${cls}"><span class="pipe-stage">${esc(x.stage)}</span><span class="pipe-by">${mine ? "Me" : x.by ? esc(x.by) : "—"}</span>${mine ? '<span class="sr"> (my part)</span>' : ""}</li>`;
  }).join("")}</ol>
  <figcaption>${unknown
    ? `<span class="coming-soon">Which of these stages were mine: coming soon.</span><!-- TODO(Shivanshu): set "by" for each stage of ${esc(pr.id)} in content.json → projects → pipeline. -->`
    : `<span class="pipe-key"><span class="pk pk-mine"></span>My part</span><span class="pipe-key"><span class="pk pk-other"></span>Collaborators</span>`}</figcaption></figure>`;
}

function viewToggle() {
  const bar = $("view-bar");
  bar.innerHTML = `<div class="view-toggle" role="group" aria-label="Reading level">
    <button type="button" data-v="layman">Layman</button><button type="button" data-v="expert">Expert</button></div>`;
  const btns = [...bar.querySelectorAll("button")];
  const paint = () => btns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === (root.dataset.view || "expert"))));
  btns.forEach((b) => b.addEventListener("click", () => {
    root.dataset.view = b.dataset.v;
    try { localStorage.setItem("view", b.dataset.v); } catch (e) { /* storage blocked */ }
    paint();
    if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    window.dispatchEvent(new Event("scroll"));
  }));
  if (!root.dataset.view && !PRERENDER) root.dataset.view = "expert";
  paint();
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
    const pub = pr.paper && pubs.find((x) => x.title === pr.paper);
    document.title = `${pr.name} — ${(d.profile || {}).name}`;
    document.querySelector("main").classList.add(`th-${th}`);
    viewToggle();

    const prev = projects[(i - 1 + projects.length) % projects.length], next = projects[(i + 1) % projects.length];
    $("pr-count").textContent = `${String(i + 1).padStart(2, "0")} / ${String(projects.length).padStart(2, "0")}`;
    $("pr-pn-top").innerHTML = `<a href="project-${esc(prev.id)}.html" rel="prev"><span aria-hidden="true">‹</span> <span class="sr">Previous thread: </span>${esc(prev.name)}</a>
      <a href="project-${esc(next.id)}.html" rel="next"><span class="sr">Next thread: </span>${esc(next.name)} <span aria-hidden="true">›</span></a>`;
    $("pr-thread").textContent = label;
    $("pr-h").textContent = pr.name;
    $("pr-blurb").textContent = pr.blurb || "";
    $("pr-status").innerHTML = `${esc(projectStatus(pr, pubs))}${(pr.tags || []).length ? ` <span class="pr-tags">${esc(pr.tags.join(" / "))}</span>` : ""}`;
    $("pr-artifacts").innerHTML = artifactsHtml(pr, pub);
    $("pr-metrics").innerHTML = (pr.metrics || []).map((m) => `<li data-rv><span class="v"${numeric(m.value) ? ` data-count="${esc(m.value)}"` : ""}>${esc(m.value)}</span><span class="l">${esc(m.label)}</span></li>`).join("");

    // Layman view.
    const plain = pr.layman || [];
    $("pr-plain").innerHTML = plain.length
      ? `${pr.layman_status !== "verified" ? '<p class="draft-note" role="note">Draft — to be verified. Written in plain language from the paper and project notes on this site.</p>' : ""}${paras(plain)}`
      : `<p class="coming-soon">A plain-language version is coming soon.</p><!-- TODO(Shivanshu): layman text for ${esc(pr.id)} -->`;

    // Expert view: the stored sections, plus a clear gap where results are not written up yet.
    const sections = [...(pr.sections || [])];
    $("pr-chapters").innerHTML = sections.map((s, k) => `<li class="chapter" data-rv>
      <div class="ch-side"><span class="ch-n">${String(k + 1).padStart(2, "0")}</span><h3 class="ch-h">${esc(s.h || "")}</h3></div>
      <div class="ch-body prose">${paras(s.p)}${[s.table, ...(s.tables || [])].map(table).join("")}</div></li>`).join("");

    if (!ABSTRACTS.has(pr.id)) $("abstract").hidden = true;
    const fig = figuresFor(pr.id);
    if (fig) { $("figure").hidden = false; $("pr-figure").innerHTML = fig; }

    /* Empty fields are not shown: with no role text and no pipeline the whole "My role" block stays hidden. */
    const pipeline = pr.role ? pipelineHtml(pr) : "";
    if (pr.role || pipeline) {
      $("pr-role").innerHTML = pr.role ? paras(pr.role) : "";
      $("pr-pipeline").innerHTML = pipeline;
    } else $("role").hidden = true;

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

    $("pr-next").innerHTML = [[prev, "Previous thread", "←", "prev"], [next, "Next thread", "→", "next"]].map(([x, k, arrow, rel]) => `
      <a class="next-card" href="project-${esc(x.id)}.html" rel="${rel}"><span class="micro">${k} ${arrow}</span><span class="next-t">${esc(x.name)}</span></a>`).join("");

    return { fieldMode: MODES[th] ?? 0, kickers: ".next-card, .chapter", after: () => { heroIn(); mountAbstract(pr); } };
  },
});

/* The project title rises in word by word as the page arrives. */
function heroIn() {
  if (!MOTION) return;
  const words = splitWords($("pr-h"));
  window.gsap.from(words, { yPercent: 115, rotate: 3, duration: 1.2, ease: "expo.out", stagger: 0.05, delay: 0.35 });
  window.gsap.from(["#pr-thread", "#pr-blurb", "#pr-status", "#pr-artifacts"], { y: 24, opacity: 0, duration: 1, ease: "power3.out", stagger: 0.08, delay: 0.55 });
}

/* The interactive abstract is loaded only when its section comes near the viewport, and is paused off-screen. */
function mountAbstract(pr) {
  const host = $("pr-abstract");
  if (!host || PRERENDER || !ABSTRACTS.has(pr.id)) return;
  const go = async () => {
    try {
      const mod = await import(`./abstracts/${pr.id}.js`);
      host.innerHTML = "";
      const api = mod.mount(host, { reduce: REDUCE, project: pr }) || {};
      if (api.pause && "IntersectionObserver" in window) {
        new IntersectionObserver(([en]) => (en.isIntersecting ? api.resume && api.resume() : api.pause())).observe(host);
      }
    } catch (e) { console.warn("interactive abstract unavailable", e); }
  };
  if (!("IntersectionObserver" in window)) { go(); return; }
  const io = new IntersectionObserver((ents) => { if (ents.some((x) => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "600px 0px" });
  io.observe(host);
}
