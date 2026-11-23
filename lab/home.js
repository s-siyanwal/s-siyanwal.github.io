/* Site: home. */
import { boot, $, esc, kineticName, MOTION, DESKTOP, PRERENDER, REDUCE } from "./core.js";
import { deckControls, wireDeck } from "./deck.js";
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
      cv ? `<a class="btn" href="${esc(cv)}" target="_blank" rel="noopener">CV (PDF)</a>` : "",
    ].join("");

    const a = d.about || {};
    $("q-text").textContent = a.question || (a.statement || [])[0] || p.research_interests || "";

    const deckProjects = projects.filter((x) => x.group !== "hackathons"), hackathons = projects.filter((x) => x.group === "hackathons");
    $("work-track").innerHTML = deckProjects.map((pr, i) => {
      const [th, label] = THREADS[pr.id] || ["", "Project"];
      const m = (pr.metrics || [])[0];
      return `<li class="hz-card th-${esc(th)}" data-rv data-href="project-${esc(pr.id)}.html">
        <div class="hz-in">
          <span class="hz-n">${String(i + 1).padStart(2, "0")} <span class="hz-of">/ ${String(deckProjects.length).padStart(2, "0")}</span></span>
          <span class="hz-thread">${esc(label)}</span>
          <a class="hz-title" href="project-${esc(pr.id)}.html">${esc(pr.name)}</a>
          <span class="hz-status">${esc(projectStatus(pr, pubs))}</span>
          <span class="hz-blurb">${esc(pr.blurb || "")}</span>
          ${m ? `<span class="hz-metric"><span class="v"${numeric(m.value) ? ` data-count="${esc(m.value)}"` : ""}>${esc(m.value)}</span><span class="l">${esc(m.label)}</span></span>` : ""}
          <span class="hz-go" aria-hidden="true">Open the breakdown →</span>
        </div></li>`;
    }).join("");
    /* A click anywhere on a card opens it, but only the title is a link: a middle click on the rest of the card is
       left to the browser, so it starts autoscroll instead of opening a tab. */
    $("work-track").addEventListener("click", (e) => {
      const card = e.target.closest(".hz-card");
      if (!card || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.target.closest("a") || String(getSelection())) return;
      location.href = card.dataset.href;
    });

    /* Hackathon entries sit apart from the main research threads. */
    $("other-projects").hidden = !hackathons.length;
    $("other-list").innerHTML = hackathons.map((pr) => `<li class="op-item">
        <a class="op-title" href="project-${esc(pr.id)}.html">${esc(pr.name)}</a>
        <span class="op-status">${esc(pr.status || "")}</span>
        <span class="op-blurb">${esc(pr.blurb || "")}</span></li>`).join("");

    /* A metric with "computed" is counted from the publication list, so it cannot drift from the data. */
    const COMPUTED = {
      published_papers() {
        const done = pubs.filter((x) => x.status === "published");
        const parts = [["journal", "journal"], ["conference", "conference"]].map(([k, w]) => [done.filter((x) => x.category === k).length, w]).filter(([n]) => n);
        return { value: String(parts.reduce((s, [n]) => s + n, 0)), note: parts.map(([n, w]) => `${n} ${w}`).join(", ") };
      },
    };
    const metrics = (d.metrics || []).map((m) => (m.computed && COMPUTED[m.computed] ? { ...m, ...COMPUTED[m.computed]() } : m))
      .filter((m) => m.value !== "" && m.value != null);
    $("nums").innerHTML = metrics.map((m) => `<li data-rv>
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
    if (cv) links.push([cv, "CV (PDF)"]);
    (p.profiles || []).filter((x) => x.url && !x.url.startsWith("mailto:")).forEach((x) => links.push([x.url, x.label]));
    $("links").innerHTML = links.map(([h, l]) => `<li><a href="${esc(h)}"${/^(http|\.\.)/.test(h) ? ' target="_blank" rel="noopener"' : ""}>${esc(l)} <span aria-hidden="true">↗</span></a></li>`).join("");

    return { kickers: ".hz-card .hz-in", after: (ctx) => { horizontal(ctx); playground(); navAwayAtHero(); } };
  },
});

/* Work: on desktop with motion the threads form a sideways deck (see deck.js). It never pins or captures the vertical
   wheel, so the page always scrolls past it. Elsewhere it is a plain vertical list. */
function horizontal({ ScrollTrigger }) {
  if (!MOTION || !DESKTOP) return;
  const section = $("work"), deck = section.querySelector(".hz");
  section.classList.add("is-deck");
  deck.classList.add("deck");
  deck.tabIndex = 0;
  deck.setAttribute("role", "region");
  deck.setAttribute("aria-label", "Research threads, scrolls sideways");
  deck.insertAdjacentHTML("afterend", deckControls("thread"));
  const sync = wireDeck(deck, section.querySelector(".deck-ctrl"), ".hz-card");
  $("work-hint").textContent = "Each thread opens a full breakdown. Scroll down as usual. Sideways: swipe, trackpad, shift + wheel, arrow keys or the buttons.";
  // The side navigator steps aside while the deck is on screen, so it never covers a card.
  const nav = document.querySelector(".page-nav");
  ScrollTrigger.create({ trigger: deck, start: "top 85%", end: "bottom 15%", onToggle: (self) => nav && nav.classList.toggle("is-away", self.isActive) });
  if (document.fonts) document.fonts.ready.then(() => { sync(); ScrollTrigger.refresh(); });
}

/* Play: the three.js qubit is fetched only when its section approaches the viewport (it shares the vendored
   three.js with the background field), and renders only on demand. */
function playground() {
  const host = $("play-host");
  if (!host || PRERENDER) return;
  const go = async () => {
    try {
      const { mountQubit } = await import("./qubit3d.js");
      if (!mountQubit(host, { reduce: REDUCE })) host.innerHTML = '<p class="ab-fallback">This browser has WebGL turned off, so the Bloch sphere cannot be drawn.</p>';
    } catch (e) { console.warn("qubit playground unavailable", e); }
  };
  if (!("IntersectionObserver" in window)) { go(); return; }
  const io = new IntersectionObserver((ents) => { if (ents.some((x) => x.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: "500px 0px" });
  io.observe(host);
}

/* The side contents panel steps aside while the hero (with the photo) is on screen. */
function navAwayAtHero() {
  const nav = document.querySelector(".page-nav"), hero = $("top");
  if (!nav || !hero || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(([en]) => nav.classList.toggle("is-hero", en.intersectionRatio > 0.35), { threshold: [0, 0.35, 0.6, 1] }).observe(hero);
}
