import { $, esc, loadData, fail, mountChrome, mountFooter, initReveal, tags, audLabel, projectHref, THREADS, projectStatus } from "./site.js";
import { figuresFor } from "./figures.js";

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
      <div class="wrap narrow page-head"><div class="panel">
        <p class="eyebrow">Not found</p>
        <h1>That project doesn't exist</h1>
        <p class="lede">Pick one from the list below.</p>
        <ul class="plain-list">${projects.map((x) =>
          `<li><a href="${projectHref(x.id)}">${esc(x.name)}</a></li>`).join("")}</ul>
      </div></div>`;
    return;
  }

  document.title = `${pr.name} — ${data.profile.name}`;

  const [th, thread] = THREADS[pr.id] || ["", audLabel[pr.audience] || "Project"];
  const liveLinks = (pr.links || []).filter((l) => l.url);
  const idx = projects.indexOf(pr);
  const prev = projects[idx - 1], next = projects[idx + 1];

  $("proj").innerHTML = `
    <header class="page-head">
      <div class="wrap narrow"><div class="panel">
        <a class="backlink" href="index.html#projects">← All threads</a>
        <p class="eyebrow">${esc(thread)}</p>
        <h1>${esc(pr.name)}</h1>
        <p class="lede">${esc(pr.blurb || "")}</p>
        <dl class="meta-block">
          ${pr.role ? `<div><dt>Role</dt><dd>${esc(pr.role)}</dd></div>` : ""}
          <div><dt>Status</dt><dd>${esc(projectStatus(pr, data.publications))}</dd></div>
          <div><dt>Track</dt><dd>${esc(audLabel[pr.audience] || "Project")}</dd></div>
          ${(pr.tags || []).length ? `<div><dt>Topics</dt><dd>${esc(pr.tags.slice(0, 4).join(" · "))}</dd></div>` : ""}
        </dl>
        ${(pr.metrics || []).length ? `<div class="detail-metrics">${(pr.metrics || []).map((m) =>
          `<div class="detail-metric"><div class="m-val">${esc(m.value)}</div><div class="m-lab">${esc(m.label)}</div></div>`).join("")}</div>` : ""}
        ${liveLinks.length ? `<div class="hero-cta">${liveLinks.map((l) =>
          `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`).join("")}</div>`
          : ""}
      </div></div>
    </header>

    <div class="wrap narrow"><div class="panel prose${th ? ` th-${th}` : ""}">
      ${pr.abstract ? `<p class="abstract" data-reveal>${esc(pr.abstract)}</p>` : ""}
      ${figuresFor(pr.id)}
      ${(pr.sections || []).map((s) => `
        <section class="prose-sec" data-reveal>
          <h2>${esc(s.h)}</h2>
          ${[].concat(s.p || []).map((t) => `<p>${esc(t)}</p>`).join("")}
          ${[s.table, ...(s.tables || [])].map(table).join("")}
        </section>`).join("")}

      ${(pr.sections || []).some((s) => /result/i.test(s.h || "")) ? "" : `
        <section class="prose-sec" data-reveal>
          <h2>Results</h2>
          <p class="coming-soon">Results write-up coming soon.</p><!-- TODO(Shivanshu): results for ${esc(pr.id)} (content.json → projects → sections) -->
        </section>`}

      <div class="tag-row" data-reveal>${tags(pr.tags || [])}</div>

      <nav class="pager" aria-label="More projects">
        ${prev ? `<a class="pager-prev" href="${projectHref(prev.id)}"><span>← Previous</span><strong>${esc(prev.name)}</strong></a>` : "<span></span>"}
        ${next ? `<a class="pager-next" href="${projectHref(next.id)}"><span>Next →</span><strong>${esc(next.name)}</strong></a>` : "<span></span>"}
      </nav>
    </div></div>`;

  initReveal();
})();

/* A results table stored with a section ({caption, head, rows}); it scrolls sideways on narrow screens. */
function table(t) {
  if (!t || !t.rows) return "";
  return `<div class="tbl" tabindex="0" role="group" aria-label="${esc(t.caption || "Table")} (scrolls sideways on small screens)"><table>
    ${t.caption ? `<caption>${esc(t.caption)}</caption>` : ""}
    ${t.head ? `<thead><tr>${t.head.map((h) => `<th scope="col">${esc(h)}</th>`).join("")}</tr></thead>` : ""}
    <tbody>${t.rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td>${esc(c)}</td>` : `<th scope="row">${esc(c)}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`;
}
