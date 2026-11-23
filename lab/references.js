/* Site: references / points of contact. Institutional emails only, rendered as mailto. No phone numbers. */
import { boot, $, esc } from "./core.js";

boot({
  page: "references",
  fieldMode: 0,
  render(d) {
    $("ref-list").innerHTML = (d.references || []).map((r, i) => {
      const mail = (r.email || "").trim();
      const rel = (r.relation || "").trim();
      return `<li data-rv>
        <span class="ref-n">${String(i + 1).padStart(2, "0")}</span>
        <h2>${esc(r.name || "")}</h2>
        <p class="ref-post">${esc(r.post || "")}</p>
        ${rel ? `<p class="ref-rel">${esc(rel)}</p>` : ""}
        ${mail ? `<p class="ref-mail"><a href="mailto:${esc(mail)}">${esc(mail)}</a></p>` : ""}
      </li>`;
    }).join("");
    return {};
  },
});
