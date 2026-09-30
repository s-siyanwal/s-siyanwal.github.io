import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal, tags, projectHref, THREADS, projectStatus, chip, authorsHtml, venueHtml, idLinks, EQ_FOOTNOTE } from "./site.js";
import { mountCircuit } from "./circuit.js";

(async function () {
  let data;
  try { data = await loadData(); }
  catch (e) {
    fail("Could not load content. If you opened this file directly, run a local server — browsers block <code>fetch</code> on <code>file://</code>. See README.");
    console.error(e); return;
  }

  const p = data.profile || {}, links = p.links || {};
  document.title = `${p.name} — ${p.title}`;
  mountChrome(data, "home");

  // Hero
  $("hero-title").textContent = p.title;
  $("hero-name").textContent = p.name;
  if (p.tagline) $("hero-tagline").textContent = p.tagline; else $("hero-tagline").remove();
  const now = (data.experience || []).find((e) => e.current);
  if (now) $("hero-now").innerHTML = `<span class="hero-now-k">Now</span> ${esc(now.role)} · ${esc(now.org)}`;
  else $("hero-now")?.remove();
  if (p.availability) $("hero-avail").textContent = p.availability;
  else $("hero-avail")?.remove();

  const cta = [];
  if (links.cv_pdf) cta.push(`<a class="btn btn--primary" href="${esc(links.cv_pdf)}" target="_blank" rel="noopener">Download CV</a>`);
  cta.push(`<a class="btn" href="about.html">Research statement</a>`);
  if (p.email) cta.push(`<a class="btn" href="mailto:${esc(p.email)}">Email</a>`);
  $("hero-cta").innerHTML = cta.join("");

  mountCircuit($("hero-circuit"), p.focus_areas, $("glance"));

  // Metrics
  $("glance").innerHTML = (data.metrics || []).map((m, i) => `
    <div class="stat" data-reveal style="--i:${i}">
      <div class="stat-value">${esc(m.value)}</div>
      <div class="stat-label">${esc(m.label)}</div>
      ${m.note ? `<div class="stat-note">${esc(m.note)}</div>` : ""}
    </div>`).join("");

  // Profiles
  $("profiles").innerHTML = (p.profiles || []).filter((x) => x.primary).map((x) => `
    <a class="profile-link" href="${esc(x.url)}"${x.url.startsWith("mailto:") ? "" : ' target="_blank" rel="noopener"'}>
      <span class="profile-label">${esc(x.label)}</span>
      <span class="profile-handle">${esc(x.handle).replace("@", "@<wbr>")}</span>
      <span class="profile-go" aria-hidden="true">↗</span>
    </a>`).join("");

  // Experience
  $("work-list").innerHTML = (data.experience || []).map((e, i) => xp(e, i)).join("");

  // Projects
  const projects = data.projects || [];
  $("projects-list").innerHTML = projects.map((pr, i) => {
    const [th, label] = THREADS[pr.id] || ["", "Project"];
    return `
    <a class="card${th ? ` th-${th}` : ""}" href="${projectHref(pr.id)}"
       data-aud="${esc(pr.audience || "both")}" data-reveal style="--i:${i % 3}">
      <span class="card-thread">${esc(label)}</span>
      <h3>${esc(pr.name)}</h3>
      <p class="card-status">${esc(projectStatus(pr, data.publications))}</p>
      <p class="card-blurb">${esc(pr.blurb || "")}</p>
      ${(pr.metrics || []).length ? `<div class="card-metrics">${(pr.metrics || []).slice(0, 3).map((m) =>
        `<div class="card-metric"><div class="m-val">${esc(m.value)}</div><div class="m-lab">${esc(m.label)}</div></div>`).join("")}</div>` : ""}
      <div class="card-foot">
        <div class="card-tags">${tags((pr.tags || []).slice(0, 3))}</div>
        <span class="card-more">Read →</span>
      </div>
    </a>`;
  }).join("");

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((b) => {
        const on = b === btn; b.classList.toggle("is-active", on); b.setAttribute("aria-pressed", on);
      });
      document.querySelectorAll(".card").forEach((c) => {
        const a = c.dataset.aud;
        c.classList.toggle("is-hidden", !(f === "all" || a === f || a === "both"));
      });
    });
  });

  // Selected papers: the four most recent with an abstract; the result is its first sentence.
  const pubs = data.publications || [];
  const byYear = pubs.filter((x) => x.abstract)
    .sort((a, b) => (b.year || "").localeCompare(a.year || "")).slice(0, 4);
  $("paper-list").innerHTML = byYear.map((pb) => `
    <li class="cite" data-reveal>
      <div class="cite-head">${chip(pb.category)}<span class="cite-year">${esc(pb.year || "")}</span></div>
      <h3 class="cite-title">${esc(pb.title)}</h3>
      <p class="cite-authors">${authorsHtml(pb.authors)}</p>
      <p class="cite-venue">${venueHtml(pb)}</p>
      <p class="cite-result">${esc(firstSentence(pb.abstract))}</p>
      ${idLinks(pb) ? `<div class="ids">${idLinks(pb)}</div>` : ""}
    </li>`).join("");
  $("paper-foot").innerHTML = byYear.some((x) => x.equal_contribution) ? EQ_FOOTNOTE : "";

  $("education-list").innerHTML = (data.education || []).map((ed) => `
    <div class="mini" data-reveal>
      <p class="mini-degree">${esc(ed.degree)}</p>
      <p class="mini-school">${esc(ed.school)}</p>
      <p class="mini-meta">${esc(ed.period)}${ed.location ? " · " + esc(ed.location) : ""}</p>
      ${ed.note ? `<p class="mini-note">${esc(ed.note)}</p>` : ""}
    </div>`).join("");
  $("awards-list").innerHTML = (data.awards || []).map((x) =>
    `<li>${esc(x.title)}${x.year ? ` <span class="yr">${esc(x.year)}</span>` : ""}</li>`).join("");

  mountFooter(data);
  initReveal();

  function firstSentence(t) {
    const m = String(t).match(/^.+?[.!?](?=\s+[A-Z]|$)/s);
    return m ? m[0] : t;
  }

  function xp(e, i) {
    return `
    <details class="xp" data-reveal>
      <summary class="xp-summary">
        <h3 class="xp-role">${esc(e.role || "")}${e.current ? '<span class="xp-current">Current</span>' : ""}</h3>
        <span class="xp-period">${esc(e.period || "")}</span>
        <p class="xp-org">${esc(e.org || "")}${e.location ? ` <span class="loc">· ${esc(e.location)}</span>` : ""}</p>
        ${e.summary ? `<p class="xp-teaser">${esc(e.summary)}</p>` : ""}
        ${(e.tags || []).length ? `<div class="xp-tags">${tags(e.tags)}</div>` : ""}
        <span class="xp-toggle"><span class="chev" aria-hidden="true">▸</span> Details</span>
      </summary>
      <div class="xp-detail"><ul>${(e.points || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </details>`;
  }
})();
