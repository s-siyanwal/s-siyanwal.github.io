import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal, tags } from "./site.js";

(async function () {
  let data;
  try { data = await loadData(); }
  catch (e) { fail("Could not load content. Run a local server — see README."); console.error(e); return; }

  mountChrome(data, "about");
  mountFooter(data);
  const p = data.profile || {}, a = data.about || {};
  document.title = `About — ${p.name}`;

  $("about-headline").textContent = a.headline || "About";
  $("about-statement").innerHTML = (a.statement || []).map((par, i) =>
    `<p data-reveal style="--i:${i}">${esc(par)}</p>`).join("");

  $("interests").innerHTML = (a.interests || []).map((it, i) => `
    <div class="interest" data-reveal style="--i:${i % 2}">
      <h3>${esc(it.title)}</h3>
      <p>${esc(it.detail)}</p>
    </div>`).join("");

  if (a.looking_for) $("looking").textContent = a.looking_for; else $("looking").remove();

  // Research training
  $("research-list").innerHTML = (data.research || []).map((e) => `
    <details class="xp" data-reveal>
      <summary class="xp-summary">
        <h3 class="xp-role">${esc(e.role || "")}</h3>
        <span class="xp-period">${esc(e.period || "")}</span>
        <p class="xp-org">${esc(e.org || "")}${e.location ? ` <span class="loc">· ${esc(e.location)}</span>` : ""}</p>
        ${e.summary ? `<p class="xp-teaser">${esc(e.summary)}</p>` : ""}
        ${(e.tags || []).length ? `<div class="xp-tags">${tags(e.tags)}</div>` : ""}
        <span class="xp-toggle"><span class="chev" aria-hidden="true">▸</span> Details</span>
      </summary>
      <div class="xp-detail"><ul>${(e.points || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
    </details>`).join("");

  // Skills
  $("skills-list").innerHTML = (data.skills || []).map((s) => `
    <div class="row" data-reveal>
      <dt>${esc(s.category)}</dt>
      <dd>${(s.items || []).map((it) => `<span class="chip">${esc(it)}</span>`).join("")}</dd>
    </div>`).join("");

  // Education
  $("education-list").innerHTML = (data.education || []).map((ed) => `
    <div class="mini" data-reveal>
      <p class="mini-degree">${esc(ed.degree)}</p>
      <p class="mini-school">${esc(ed.school)}</p>
      <p class="mini-meta">${esc(ed.period)}${ed.location ? " · " + esc(ed.location) : ""}</p>
      ${ed.note ? `<p class="mini-note">${esc(ed.note)}</p>` : ""}
    </div>`).join("");

  // Awards
  $("awards-list").innerHTML = (data.awards || []).map((x) =>
    `<li>${esc(x.title)}${x.year ? ` <span class="yr">${esc(x.year)}</span>` : ""}</li>`).join("");

  // Profiles
  $("about-profiles").innerHTML = (p.profiles || []).filter((x) => x.primary).map((x) => `
    <a class="profile-link" href="${esc(x.url)}"${x.id === "email" ? "" : ' target="_blank" rel="noopener"'}>
      <span class="profile-label">${esc(x.label)}</span>
      <span class="profile-handle">${esc(x.handle)}</span>
      <span class="profile-go" aria-hidden="true">↗</span>
    </a>`).join("");

  initReveal();
})();
