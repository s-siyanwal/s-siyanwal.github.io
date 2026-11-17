/* Lab edition: home. */
import { boot, $, esc, kineticName, MOTION, DESKTOP } from "./core.js";
import { THREADS, projectStatus, authorsHtml, venueHtml, idLinks } from "../js/site.js";

const shortRole = (r = "") => r.split("—")[0].trim();
const firstSentence = (t = "") => (String(t).match(/^.+?[.!?](?=\s+[A-Z]|$)/s) || [t])[0];
const numeric = (v) => /^\d+$/.test(String(v).trim());

boot({
  page: "work",
  fieldMode: 0,
  render(d) {
    const p = d.profile || {}, pubs = d.publications || [], projects = d.projects || [];
    const roles = [...(d.experience || []), ...(d.research || [])];
    const now = roles.find((e) => e.current);

    $("h-kicker").textContent = (p.focus_areas || []).join(" · ");
    kineticName($("h-name"), p.name || "");
    $("h-title").textContent = p.title || "";
    $("h-tagline").textContent = p.tagline || "";
    $("h-now").innerHTML = now ? `<b>Now</b>${esc(shortRole(now.role))} · ${esc(now.org)}` : "";
    const cv = (p.links || {}).cv_pdf;
    $("h-cta").innerHTML = [
      `<a class="btn btn--solid" href="#work">See the work</a>`,
      `<a class="btn" href="about.html">Research statement</a>`,
      cv ? `<a class="btn" href="../${esc(cv)}" target="_blank" rel="noopener">CV (PDF)</a>` : "",
    ].join("");

    const a = d.about || {};
    $("q-text").textContent = a.question || (a.statement || [])[0] || p.research_interests || "";

    $("work-track").innerHTML = projects.map((pr, i) => {
      const [th, label] = THREADS[pr.id] || ["", "Project"];
      const m = (pr.metrics || [])[0];
      return `<li class="hz-card th-${esc(th)}" data-rv>
        <a href="project-${esc(pr.id)}.html">
          <span class="hz-n">${String(i + 1).padStart(2, "0")} <span class="hz-of">/ ${String(projects.length).padStart(2, "0")}</span></span>
          <span class="hz-thread">${esc(label)}</span>
          <span class="hz-title">${esc(pr.name)}</span>
          <span class="hz-status">${esc(projectStatus(pr, pubs))}</span>
          <span class="hz-blurb">${esc(pr.blurb || "")}</span>
          ${m ? `<span class="hz-metric"><span class="v"${numeric(m.value) ? ` data-count="${esc(m.value)}"` : ""}>${esc(m.value)}</span><span class="l">${esc(m.label)}</span></span>` : ""}
          <span class="hz-go">Open the breakdown <span aria-hidden="true">→</span></span>
        </a></li>`;
    }).join("");

    $("nums").innerHTML = (d.metrics || []).map((m) => `<li data-rv>
      <span class="num-v"${numeric(m.value) ? ` data-count="${esc(m.value)}"` : ""}>${esc(m.value)}</span>
      <span class="num-l">${esc(m.label)}</span>${m.note ? `<span class="num-n">${esc(m.note)}</span>` : ""}</li>`).join("");

    $("mini-path").innerHTML = roles.slice(0, 3).map((e) => `<li data-rv>
      <span class="mp-when">${esc(e.period || "")}</span>
      <span class="mp-role">${esc(shortRole(e.role))}</span>
      <span class="mp-org">${esc(e.org)}</span></li>`).join("");

    const sel = pubs.filter((x) => x.abstract).sort((x, y) => String(y.year).localeCompare(String(x.year))).slice(0, 3);
    $("cites").innerHTML = sel.map((x) => `<li class="cite" data-rv>
      <p class="cite-k">${esc(x.year || "")} · ${esc(x.type || x.category || "")}</p>
      <h3 class="cite-t">${esc(x.title)}</h3>
      <p class="cite-a">${authorsHtml(x.authors)}</p>
      <p class="cite-v">${venueHtml(x)}</p>
      <p class="cite-r">${esc(firstSentence(x.abstract))}</p>
      ${idLinks(x) ? `<p class="ids">${idLinks(x)}</p>` : ""}</li>`).join("");

    $("avail").textContent = p.availability || "";
    const links = [];
    if (p.email) links.push([`mailto:${p.email}`, "Email"]);
    if (cv) links.push([`../${cv}`, "CV (PDF)"]);
    (p.profiles || []).filter((x) => x.url && !x.url.startsWith("mailto:")).forEach((x) => links.push([x.url, x.label]));
    $("links").innerHTML = links.map(([h, l]) => `<li><a href="${esc(h)}"${/^(http|\.\.)/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${esc(l)} <span aria-hidden="true">↗</span></a></li>`).join("");

    return { kickers: ".hz-card a", after: horizontal };
  },
});

/* Work: on desktop with motion, the section pins and vertical scroll drives the track sideways. Keyboard focus
   on a card scrolls the page to the point where that card is in view. Elsewhere it is a plain vertical list. */
function horizontal({ gsap, ScrollTrigger, lenis }) {
  if (!MOTION || !DESKTOP) return;
  const section = $("work"), track = $("work-track"), wrap = section.querySelector(".hz");
  section.classList.add("is-pinned");
  $("work-hint").textContent = "Scroll to move through the threads; each one opens a full breakdown.";
  const distance = () => Math.max(0, track.scrollWidth - wrap.clientWidth);
  const nav = document.querySelector(".page-nav");
  const tween = gsap.to(track, {
    x: () => -distance(), ease: "none",
    scrollTrigger: { trigger: section, pin: true, start: "top top", end: () => `+=${distance()}`, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1,
      // The side navigator steps aside while the track is pinned, so it never covers a card.
      onToggle: (self) => nav && nav.classList.toggle("is-away", self.isActive) },
  });
  track.querySelectorAll(".hz-card").forEach((card) => {
    gsap.fromTo(card, { rotateY: -16, scale: 0.94 }, { rotateY: 0, scale: 1, ease: "none",
      scrollTrigger: { trigger: card, containerAnimation: tween, start: "left 95%", end: "left 55%", scrub: true } });
    card.querySelector("a").addEventListener("focus", () => {
      const st = tween.scrollTrigger, max = distance();
      if (!st || !max) return;
      const x = Math.min(max, Math.max(0, card.offsetLeft - wrap.clientWidth * 0.2));
      const y = st.start + (x / max) * (st.end - st.start);
      lenis ? lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y);
    });
  });
  if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
}
