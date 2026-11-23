/* Site: the path — every role and degree in time order, oldest first, as an ordinary vertical list.
   A Photos toggle (off by default, remembered in localStorage) shows field-note photos and placeholders;
   with it off, and always without JS and in print unless already on, no photo frames are shown.
   Photos and videos come from data/journey.json (stage key = slug of the role or degree title). */
import { boot, $, esc, paras, extras, proofOf, viewProof } from "./core.js";
import { slug, roleHref } from "../js/site.js";
import { featuredHtml, galleryButton, wireGalleries } from "./gallery.js";

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const startOf = (period = "") => {
  const m = String(period).match(/([A-Za-z]{3})?\w*\s*(\d{4})/);
  if (!m) return 0;
  const mon = m[1] ? MONTHS.indexOf(m[1].toLowerCase()) : 0;
  return +m[2] + Math.max(mon, 0) / 12;
};

let stages = {};

boot({
  page: "path",
  fieldMode: 0,
  render(d) {
    stages = (extras.journey || {}).stages || {};
    const events = [
      ...(d.education || []).map((e) => ({ kind: "Education", when: e.period, title: e.degree, org: e.school, loc: e.location, sum: e.note, start: startOf(e.period) })),
      ...[...(d.experience || []), ...(d.research || [])].map((e) => ({
        kind: (d.research || []).includes(e) ? "Research" : "Role", when: e.period, title: e.role, org: e.org, loc: e.location,
        sum: e.summary, narrative: e.narrative, points: e.points, tags: e.tags, now: e.current, start: startOf(e.period), href: roleHref(e),
      })),
    ].sort((x, y) => x.start - y.start);
    $("worldline").innerHTML = events.map((e) => {
      const key = slug(e.title), st = stages[key] || {};
      const more = e.narrative || (e.points || []).length || (e.tags || []).length;
      return `<li class="event${e.now ? " is-now" : ""}" data-rv>
      <span class="ev-dot" aria-hidden="true"></span>
      <p class="ev-when">${esc(e.when || "")}<span class="ev-kind"> · ${esc(e.kind)}${e.now ? " · now" : ""}</span></p>
      <h3 class="ev-title">${esc(e.title)}${viewProof(proofOf("role_proofs", `${e.title} @ ${e.org}`), e.title)}</h3>
      <p class="ev-org">${esc(e.org)}${e.loc ? ` · ${esc(e.loc)}` : ""}</p>
      ${e.sum ? `<p class="ev-sum">${esc(e.sum)}</p>` : ""}
      ${e.href ? `<p class="ev-link"><a href="${e.href}" aria-label="Full write-up: ${esc(e.title)}, ${esc(e.org)}">Full write-up <span aria-hidden="true">→</span></a></p>` : ""}
      <div class="ev-media">${featuredHtml(st.featured, { label: "Photos" })}${galleryButton(st.gallery, e.title, key)}</div>
      ${more ? `<details class="ev-more"><summary>Read more</summary>
        ${e.narrative ? `<div class="ev-narr prose">${paras(e.narrative)}</div>` : ""}
        ${(e.points || []).length ? `<ul class="ev-points">${e.points.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
        ${(e.tags || []).length ? `<p class="ev-tags">${esc(e.tags.join(" / "))}</p>` : ""}</details>` : ""}</li>`;
    }).join("");
    wireGalleries($("worldline"), (k) => (stages[k] || {}).gallery || []);
    return { after: photosMode };
  },
});

/* Photos: off by default. The choice is remembered in localStorage ("worldline-photos": "1" or "0"). */
const KEY = "worldline-photos";
const readPref = () => { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
const savePref = (on) => { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* storage blocked */ } };

function photosMode() {
  const section = $("worldline-sec"), btn = $("wl-photos");
  if (!section || !btn) return;
  btn.hidden = false;
  try { localStorage.removeItem("worldline-gallery"); } catch (e) { /* storage blocked */ }
  const apply = (on) => {
    section.classList.toggle("is-photos", on);
    btn.setAttribute("aria-pressed", String(on));
  };
  btn.addEventListener("click", () => { const on = btn.getAttribute("aria-pressed") !== "true"; savePref(on); apply(on); });
  apply(readPref());
}
