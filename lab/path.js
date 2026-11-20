/* Site: the path — every role and degree in time order, oldest first. On desktop with motion allowed the
   section pins and vertical scroll moves the worldline left to right; on phones, under reduced motion, without JS
   and in print it is an ordinary vertical list. Photos and videos come from data/journey.json (stage key = slug of
   the role or degree title); until they exist each stage shows a quiet "coming soon" frame. */
import { boot, $, esc, paras, MOTION, DESKTOP, extras } from "./core.js";
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
    return { after: horizontal };
  },
});

/* Desktop + motion: pin the section and translate the worldline sideways with vertical scroll. Keyboard focus on
   anything inside a stage scrolls the page to the point where that stage is in view. */
function horizontal({ gsap, ScrollTrigger, lenis }) {
  if (!MOTION || !DESKTOP) return;
  const section = $("worldline-sec"), wrap = section.querySelector(".worldline-wrap"), track = $("worldline");
  section.classList.add("is-horizontal");
  track.querySelectorAll(".event").forEach((ev) => ev.setAttribute("data-lenis-prevent", ""));
  $("wl-hint").textContent = "Scroll to travel along the worldline →";
  const fill = section.querySelector(".wl-fill");
  ScrollTrigger.getAll().filter((t) => t.trigger === section || t.vars.trigger === fill.parentElement).forEach((t) => t.kill());
  gsap.set(fill, { scaleY: 1, scaleX: 0, transformOrigin: "left center" });
  const distance = () => Math.max(0, track.scrollWidth - wrap.clientWidth + 40);
  const tween = gsap.to(track, {
    x: () => -distance(), ease: "none",
    scrollTrigger: { trigger: section, pin: true, start: "top top", end: () => `+=${distance()}`, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: (self) => gsap.set(fill, { scaleX: self.progress }) },
  });
  track.querySelectorAll(".event").forEach((ev) => ev.addEventListener("focusin", () => {
    const st = tween.scrollTrigger, max = distance();
    if (!st || !max) return;
    const x = Math.min(max, Math.max(0, ev.offsetLeft - wrap.clientWidth * 0.15));
    const y = st.start + (x / max) * (st.end - st.start);
    lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
  }));
  ScrollTrigger.refresh();
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
