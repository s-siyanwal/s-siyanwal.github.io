/* Site: about. */
import { boot, $, esc } from "./core.js";

boot({
  page: "about",
  fieldMode: 0,
  render(d) {
    const a = d.about || {}, p = d.profile || {};
    $("ab-lede").textContent = p.research_interests || a.research_interests || "";
    $("statement-body").innerHTML = (a.statement || []).map((t, i) => `<p class="${i === 0 ? "first" : ""}" data-rv>${esc(t)}</p>`).join("");
    $("interest-list").innerHTML = (a.interests || []).map((x, i) => `<li class="interest" data-rv>
      <span class="in-n">${String(i + 1).padStart(2, "0")}</span><h3>${esc(x.title)}</h3><p>${esc(x.detail || "")}</p></li>`).join("");
    $("looking").textContent = a.looking_for || "";
    $("edu-list").innerHTML = (d.education || []).map((e) => `<li data-rv>
      <span class="edu-when">${esc(e.period || "")}</span><h3>${esc(e.degree)}</h3>
      <p class="edu-school">${esc(e.school)}${e.location ? ` · ${esc(e.location)}` : ""}</p>${e.note ? `<p class="edu-note">${esc(e.note)}</p>` : ""}</li>`).join("");
    $("tools-list").innerHTML = (d.skills || []).map((g) => `<div data-rv><dt>${esc(g.category)}</dt><dd>${esc((g.items || []).join(" · "))}</dd></div>`).join("");
    $("award-list").innerHTML = (d.awards || []).map((x) => `<li data-rv><span class="aw-y">${esc(x.year || "")}</span><span class="aw-t">${esc(x.title)}</span></li>`).join("");
    return {};
  },
});
