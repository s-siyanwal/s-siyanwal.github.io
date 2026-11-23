/* Site: the path — every role and degree in time order, oldest first. Gallery mode (a toggle, off by default,
   remembered in localStorage) lays the stages out as a sideways deck; with it off, and always without JS and in
   print, the worldline is an ordinary vertical list. Vertical scroll is never captured by the deck. Photos and videos come from data/journey.json (stage key = slug of
   the role or degree title); until they exist each stage shows a quiet "coming soon" frame. */
import { boot, $, esc, paras, extras } from "./core.js";
import { deckControls, wireDeck } from "./deck.js";
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
      <h3 class="ev-title">${esc(e.title)}</h3>
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
    return { after: galleryMode };
  },
});

/* Gallery mode: off by default. The choice is remembered in localStorage ("worldline-gallery": "1" or "0"). */
const KEY = "worldline-gallery";
const readPref = () => { try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; } };
const savePref = (on) => { try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) { /* storage blocked */ } };

function galleryMode({ ScrollTrigger }) {
  const section = $("worldline-sec"), wrap = section.querySelector(".worldline-wrap"), hint = $("wl-hint"), btn = $("wl-gallery");
  wrap.insertAdjacentHTML("afterend", deckControls("stage"));
  btn.hidden = false;
  const ctrl = section.querySelector(".deck-ctrl");
  const sync = wireDeck(wrap, ctrl, ".event");
  const refresh = () => { sync(); if (ScrollTrigger) ScrollTrigger.refresh(); };
  const apply = (on) => {
    section.classList.toggle("is-gallery", on);
    wrap.classList.toggle("deck", on);
    ctrl.hidden = !on;
    btn.setAttribute("aria-pressed", String(on));
    if (on) {
      wrap.tabIndex = 0;
      wrap.setAttribute("role", "region");
      wrap.setAttribute("aria-label", "Worldline gallery, scrolls sideways");
    } else {
      wrap.removeAttribute("tabindex"); wrap.removeAttribute("role"); wrap.removeAttribute("aria-label"); wrap.scrollLeft = 0;
    }
    hint.textContent = on
      ? "Scroll down as usual. Sideways: swipe, trackpad, shift + wheel, arrow keys or the buttons."
      : "Education and roles in time order, oldest first.";
    requestAnimationFrame(refresh);
  };
  btn.addEventListener("click", () => { const on = btn.getAttribute("aria-pressed") !== "true"; savePref(on); apply(on); });
  apply(readPref());
  if (document.fonts) document.fonts.ready.then(refresh);
}
