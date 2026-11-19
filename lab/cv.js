/* Lab edition: the academic CV as a page, laid out like the LaTeX CV that scripts/cv_tex.py generates from the same
   content.json (education, research experience, publications, posters and talks, awards and fellowships, skills,
   references on request). Award proofs come from data/links.json → proofs; an award without a link shows none.
   No phone number is ever shown. */
import { boot, $, esc, extras, hrefOf } from "./core.js";
import { authorsHtml } from "../js/site.js";

const PAPER_GROUPS = [["journal", "Journal articles", "J"], ["conference", "Conference papers", "C"], ["manuscript", "Manuscripts under review", "M"], ["preprint", "Preprints", "P"], ["thesis", "Thesis", "T"]];

function cite(p) {
  const bits = [];
  if (p.venue) bits.push(`<em>${esc(p.venue)}</em>`);
  if (p.volume) bits.push(`${esc(p.volume)}${p.issue ? `(${esc(p.issue)})` : ""}${p.article ? `:${esc(p.article)}` : ""}`);
  if (p.pages) bits.push(`pp. ${esc(p.pages)}`);
  if (p.year && !String(p.venue || "").endsWith(String(p.year))) bits.push(esc(p.year));
  const status = p.status && !/^published$/i.test(p.status) && !/library/i.test(p.status) ? `, ${esc(p.status)}` : "";
  const ids = [];
  if (p.doi) ids.push(`<a href="https://doi.org/${esc(p.doi)}">doi:${esc(p.doi)}</a>`);
  if (p.arxiv) ids.push(`<a href="https://arxiv.org/abs/${esc(p.arxiv)}">arXiv:${esc(p.arxiv)}</a>`);
  return `${p.authors ? `${authorsHtml(p.authors)}. ` : ""}${esc(p.title)}. ${bits.join(", ")}${status}.${ids.length ? ` ${ids.join(" · ")}` : ""}`;
}

const section = (id, title, body) => `<section class="cv-sec" id="cv-${id}" aria-labelledby="cv-${id}-h"><h2 id="cv-${id}-h">${title}</h2>${body}</section>`;
const entry = (left, right, sub = "", body = "") => `<div class="cv-entry"><div class="cv-line"><span class="cv-l">${left}</span><span class="cv-r">${right}</span></div>${sub ? `<div class="cv-sub">${sub}</div>` : ""}${body}</div>`;

boot({
  page: "cv",
  fieldMode: 0,
  render(d) {
    const p = d.profile || {}, proofs = (extras.links || {}).proofs || {};
    const cv = (p.links || {}).cv_pdf;
    $("cv-actions").innerHTML = `<ul class="artifact-row">${cv ? `<li><a class="btn btn--solid" href="../${esc(cv)}" download>Download PDF <span aria-hidden="true">↓</span></a></li>` : ""}
      <li><a class="btn" href="../assets/Shivanshu_Siyanwal_CV.tex">LaTeX source</a></li></ul>`;
    const links = (p.profiles || []).filter((x) => x.url && /orcid|github|linkedin|scholar|researchgate/.test(x.id));
    $("cv-head").innerHTML = `<p class="cv-name">${esc(p.name || "")}</p>
      <p class="cv-tag">${esc(p.title || "")}</p>
      <p class="cv-contact">${[p.location && esc(p.location), p.email && `<a href="mailto:${esc(p.email)}">${esc(p.email)}</a>`,
        ...links.map((x) => `<a href="${esc(x.url)}">${esc(x.label)}</a>`)].filter(Boolean).join(" · ")}</p>`;

    const edu = (d.education || []).map((e) => entry(`<strong>${esc(e.degree)}</strong>`, esc(e.period || ""), `${esc(e.school)}${e.location ? `, ${esc(e.location)}` : ""}`,
      e.note ? `<p class="cv-p">${esc(e.note)}</p>` : "")).join("");
    const roles = [...(d.experience || []), ...(d.research || [])].map((e) => entry(`<strong>${esc(e.role)}</strong>`, esc(e.period || ""),
      `${esc(e.org)}${e.location ? `, ${esc(e.location)}` : ""}`,
      (e.points || []).length ? `<ul class="cv-ul">${e.points.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : e.summary ? `<p class="cv-p">${esc(e.summary)}</p>` : "")).join("");

    const pubs = d.publications || [];
    const papers = PAPER_GROUPS.map(([cat, label, pre]) => {
      const list = pubs.filter((x) => x.category === cat);
      return list.length ? `<h3 class="cv-h3">${label}</h3><ol class="cv-refs">${list.map((x, i) => `<li><span class="cv-key">[${pre}${i + 1}]</span> ${cite(x)}</li>`).join("")}</ol>` : "";
    }).join("");
    const eq = pubs.some((x) => x.equal_contribution) ? '<p class="cv-foot">* Equal contribution.</p>' : "";
    const talks = pubs.filter((x) => x.category === "poster" || x.category === "presentation");
    const talksHtml = `<ol class="cv-refs">${talks.map((x, i) => `<li><span class="cv-key">[${x.category === "poster" ? "Po" : "T"}${i + 1}]</span> ${x.authors ? `${authorsHtml(x.authors)}. ` : ""}${esc(x.title)}. ${x.category === "poster" ? "Poster" : "Talk"}, <em>${esc(x.venue || "")}</em>${x.year ? `, ${esc(x.year)}` : ""}.</li>`).join("")}</ol>`;
    const awards = `<ul class="cv-awards">${(d.awards || []).map((a) => {
      const proof = proofs[a.title];
      return `<li><span class="cv-l">${esc(a.title)}${proof ? ` <a class="cv-proof" href="${esc(hrefOf(proof))}" target="_blank" rel="noopener">Proof<span class="sr"> for ${esc(a.title)}</span></a>` : ""}</span><span class="cv-r">${esc(a.year || "")}</span></li>`;
    }).join("")}</ul>`;
    const skills = `<dl class="cv-skills">${(d.skills || []).map((g) => `<div><dt>${esc(g.category)}</dt><dd>${esc((g.items || []).join(", "))}</dd></div>`).join("")}</dl>`;

    $("cv-body").innerHTML = [
      section("education", "Education", edu),
      section("research", "Research experience", roles),
      section("publications", "Publications", papers + eq),
      section("talks", "Posters and talks", talksHtml),
      section("awards", "Awards and fellowships", awards),
      section("skills", "Skills", skills),
      section("references", "References", '<p class="cv-p">Available on request.</p>'),
    ].join("");
    return {};
  },
});
