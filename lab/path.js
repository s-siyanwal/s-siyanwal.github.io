/* Lab edition: the path — every role and degree in time order, with the full details stored in content.json. */
import { boot, $, esc, paras } from "./core.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const startOf = (period = "") => {
  const m = String(period).match(/([A-Za-z]{3})?\w*\s*(\d{4})/);
  if (!m) return 0;
  const mon = m[1] ? MONTHS.indexOf(m[1].toLowerCase()) : 0;
  return +m[2] + Math.max(mon, 0) / 12;
};

boot({
  page: "path",
  fieldMode: 0,
  render(d) {
    const events = [
      ...(d.education || []).map((e) => ({ kind: "Education", when: e.period, title: e.degree, org: e.school, loc: e.location, sum: e.note, start: startOf(e.period) })),
      ...[...(d.experience || []), ...(d.research || [])].map((e) => ({
        kind: (d.research || []).includes(e) ? "Research" : "Role", when: e.period, title: e.role, org: e.org, loc: e.location,
        sum: e.summary, narrative: e.narrative, points: e.points, tags: e.tags, now: e.current, start: startOf(e.period),
      })),
    ].sort((x, y) => x.start - y.start);
    $("worldline").innerHTML = events.map((e) => `<li class="event${e.now ? " is-now" : ""}" data-rv>
      <span class="ev-dot" aria-hidden="true"></span>
      <p class="ev-when">${esc(e.when || "")}<span class="ev-kind"> · ${esc(e.kind)}${e.now ? " · now" : ""}</span></p>
      <h3 class="ev-title">${esc(e.title)}</h3>
      <p class="ev-org">${esc(e.org)}${e.loc ? ` · ${esc(e.loc)}` : ""}</p>
      ${e.sum ? `<p class="ev-sum">${esc(e.sum)}</p>` : ""}
      ${e.narrative ? `<div class="ev-narr prose">${paras(e.narrative)}</div>` : ""}
      ${(e.points || []).length ? `<ul class="ev-points">${e.points.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${(e.tags || []).length ? `<p class="ev-tags">${esc(e.tags.join(" / "))}</p>` : ""}</li>`).join("");
    return {};
  },
});
