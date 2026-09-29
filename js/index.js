import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal, tags, audLabel, projectHref } from "./site.js";
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
  $("hero-tagline").textContent = p.tagline || "";
  $("hero-summary").textContent = p.summary || "";
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
    <a class="profile-link" href="${esc(x.url)}"${x.id === "email" ? "" : ' target="_blank" rel="noopener"'}>
      <span class="profile-label">${esc(x.label)}</span>
      <span class="profile-handle">${esc(x.handle)}</span>
      <span class="profile-go" aria-hidden="true">↗</span>
    </a>`).join("");

  // Experience
  $("work-list").innerHTML = (data.experience || []).map((e, i) => xp(e, i)).join("");

  // Projects
  const projects = data.projects || [];
  $("projects-list").innerHTML = projects.map((pr, i) => `
    <a class="card" href="${projectHref(pr.id)}"
       data-aud="${esc(pr.audience || "both")}" data-reveal style="--i:${i % 3}">
      <span class="card-aud">${esc(audLabel[pr.audience] || "Project")}</span>
      <h3>${esc(pr.name)}</h3>
      <p class="card-blurb">${esc(pr.blurb || "")}</p>
      ${(pr.metrics || []).length ? `<div class="card-metrics">${(pr.metrics || []).slice(0, 3).map((m) =>
        `<div class="card-metric"><div class="m-val">${esc(m.value)}</div><div class="m-lab">${esc(m.label)}</div></div>`).join("")}</div>` : ""}
      <div class="card-foot">
        <div class="card-tags">${tags((pr.tags || []).slice(0, 3))}</div>
        <span class="card-more">Read →</span>
      </div>
    </a>`).join("");

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

  // Publications preview (3 most recent) + link to full page
  const pubs = (data.publications || []).slice().sort((a, b) => (b.year || "").localeCompare(a.year || ""));
  $("pub-preview").innerHTML = pubs.slice(0, 3).map((pb) => `
    <li class="pub" data-reveal>
      <div class="pub-row">
        <span class="pub-year">${esc(pb.year || "")}</span>
        <div class="pub-main">
          <div class="pub-title">${esc(pb.title)}</div>
          <div class="pub-meta">
            <span class="pub-venue">${esc(pb.venue)}</span>
            ${pb.authors ? `<span class="pub-authors">${esc(pb.authors)}</span>` : ""}
            ${pb.status ? `<span class="pub-status">${esc(pb.status)}</span>` : ""}
          </div>
        </div>
        <span class="pub-type">${esc(pb.type || "")}</span>
      </div>
    </li>`).join("");
  $("pub-count").textContent = pubs.length;

  mountFooter(data);
  initReveal();

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
