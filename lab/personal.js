/* Site: Personal — hobbies and life outside research, from data/journey.json → personal
   ({ intro, sections: [{ title, text, featured, gallery }] }). Until Shiv fills it in, the page shows a quiet
   "coming soon" state; nothing here is written on his behalf. */
import { boot, $, esc, paras, extras } from "./core.js";
import { featuredHtml, galleryButton, wireGalleries } from "./gallery.js";

boot({
  page: "personal",
  fieldMode: 0,
  render() {
    const ps = (extras.journey || {}).personal || {};
    const sections = (ps.sections || []).filter((s) => s && (s.title || s.text || (s.featured || []).length || (s.gallery || []).length));
    $("ps-intro").textContent = ps.intro || "Hobbies and what I do in my free time: coming soon.";
    $("ps-sections").innerHTML = sections.length
      ? sections.map((s, i) => `<section class="block ps-sec" id="ps-${i + 1}" aria-labelledby="ps-${i + 1}-h">
          <p class="micro">${String(i + 1).padStart(2, "0")}</p>
          <h2 id="ps-${i + 1}-h" data-split>${esc(s.title || "Untitled")}</h2>
          ${s.text ? `<div class="prose">${paras(s.text)}</div>` : ""}
          <div class="ev-media">${featuredHtml(s.featured, { label: "Photos" })}${galleryButton(s.gallery, s.title || "", String(i))}</div>
        </section>`).join("")
      : `<section class="block ps-sec" id="ps-soon" aria-labelledby="ps-soon-h"><h2 id="ps-soon-h" class="sr">Coming soon</h2>
          <div class="fn-empty fn-empty--wide" role="note"><span>Photos and stories coming soon</span></div>
          <!-- TODO(Shivanshu): fill data/journey.json → personal (intro, sections with title, text, featured and gallery media). --></section>`;
    wireGalleries($("ps-sections"), (k) => (sections[+k] || {}).gallery || []);
    return {};
  },
});
