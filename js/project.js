import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal, tags, audLabel, projectHref } from "./site.js";

(async function () {
  let data;
  try { data = await loadData(); }
  catch (e) { fail("Could not load content. Run a local server — see README."); console.error(e); return; }

  mountChrome(data, "projects");
  mountFooter(data);

  const id = document.body.dataset.projectId || new URLSearchParams(location.search).get("id");
  const projects = data.projects || [];
  const pr = projects.find((x) => x.id === id);

  if (!pr) {
    $("proj").innerHTML = `
      <div class="wrap narrow" style="padding:4rem 0">
        <p class="eyebrow">Not found</p>
        <h1>That project doesn't exist</h1>
        <p class="lede">Pick one from the list below.</p>
        <ul class="plain-list">${projects.map((x) =>
          `<li><a href="${projectHref(x.id)}">${esc(x.name)}</a></li>`).join("")}</ul>
      </div>`;
    return;
  }

  document.title = `${pr.name} — ${data.profile.name}`;

  const liveLinks = (pr.links || []).filter((l) => l.url);
  const idx = projects.indexOf(pr);
  const prev = projects[idx - 1], next = projects[idx + 1];

  $("proj").innerHTML = `
    <header class="page-head">
      <div class="wrap narrow">
        <a class="backlink" href="index.html#projects">← All projects</a>
        <p class="eyebrow">${esc(audLabel[pr.audience] || "Project")}</p>
        <h1>${esc(pr.name)}</h1>
        <p class="lede">${esc(pr.blurb || "")}</p>
        ${pr.role ? `<p class="role-note">${esc(pr.role)}</p>` : ""}
        ${(pr.metrics || []).length ? `<div class="detail-metrics">${(pr.metrics || []).map((m) =>
          `<div class="detail-metric"><div class="m-val">${esc(m.value)}</div><div class="m-lab">${esc(m.label)}</div></div>`).join("")}</div>` : ""}
        ${liveLinks.length ? `<div class="hero-cta">${liveLinks.map((l) =>
          `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>`
          : `<p class="mini-note">Repository and paper links coming soon.</p>`}
      </div>
    </header>

    <div class="wrap narrow prose">
      ${pr.abstract ? `<p class="abstract" data-reveal>${esc(pr.abstract)}</p>` : ""}
      ${(pr.sections || []).map((s) => `
        <section class="prose-sec" data-reveal>
          <h2>${esc(s.h)}</h2>
          <p>${esc(s.p)}</p>
        </section>`).join("")}

      <div class="tag-row" data-reveal>${tags(pr.tags || [])}</div>

      <nav class="pager" aria-label="More projects">
        ${prev ? `<a class="pager-prev" href="${projectHref(prev.id)}"><span>← Previous</span><strong>${esc(prev.name)}</strong></a>` : "<span></span>"}
        ${next ? `<a class="pager-next" href="${projectHref(next.id)}"><span>Next →</span><strong>${esc(next.name)}</strong></a>` : "<span></span>"}
      </nav>
    </div>`;

  initReveal();
})();
