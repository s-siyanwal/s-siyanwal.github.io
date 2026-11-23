#!/usr/bin/env python3
"""
Generate the LaTeX academic CV from data/content.json (+ data/links.json for proof links) using
cv/cv-template.tex, and compile it with pdflatex when available.

  python3 scripts/cv_tex.py                 # writes cv/cv.tex, and cv/cv.pdf if pdflatex exists
  python3 scripts/cv_tex.py --out DIR       # writes DIR/Shivanshu_Siyanwal_CV.tex (+ .pdf)

Sections: Education, Research experience, Publications, Posters and talks, Awards and fellowships, Skills,
References (on request). The phone number is never read or written.
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "cv" / "cv-template.tex"
ME = "S. Siyanwal"

PAPER_GROUPS = [("journal", "Journal articles", "J"), ("conference", "Conference papers", "C"),
                ("manuscript", "Manuscripts under review", "M"), ("preprint", "Preprints", "P"), ("thesis", "Thesis", "Th")]

_TEX = {"\\": r"\textbackslash{}", "&": r"\&", "%": r"\%", "$": r"\$", "#": r"\#", "_": r"\_",
        "{": r"\{", "}": r"\}", "~": r"\textasciitilde{}", "^": r"\textasciicircum{}"}


def tex(s):
    return "".join(_TEX.get(c, c) for c in str(s or ""))


def url(u):
    return str(u or "").replace("%", r"\%").replace("#", r"\#")


def authors(a):
    out = []
    for name in re.split(r",\s*", a or ""):
        if not name:
            continue
        star = name.endswith("*")
        clean = tex(name.rstrip("*"))
        out.append((r"\textbf{%s}" % clean if ME in name else clean) + ("$^{*}$" if star else ""))
    return ", ".join(out)


def cite(p):
    bits = []
    if p.get("venue"):
        bits.append(r"\textit{%s}" % tex(p["venue"]))
    if p.get("volume"):
        v = tex(p["volume"]) + (f"({tex(p['issue'])})" if p.get("issue") else "") + (f":{tex(p['article'])}" if p.get("article") else "")
        bits.append(v)
    if p.get("pages"):
        bits.append("pp.~" + tex(p["pages"]))
    if p.get("year") and not str(p.get("venue") or "").endswith(str(p["year"])):
        bits.append(tex(p["year"]))
    st = p.get("status") or ""
    status = f", {tex(st.rstrip('.'))}" if st and not re.match(r"^published$", st, re.I) and "library" not in st.lower() else ""
    ids = []
    if p.get("doi"):
        ids.append(r"\href{https://doi.org/%s}{doi:%s}" % (url(p["doi"]), tex(p["doi"])))
    if p.get("arxiv"):
        ids.append(r"\href{https://arxiv.org/abs/%s}{arXiv:%s}" % (url(p["arxiv"]), tex(p["arxiv"])))
    for l in p.get("links") or []:
        if l.get("url") and l.get("label"):
            ids.append(r"\href{%s}{%s}" % (url(l["url"]), tex(l["label"])))
    head = (authors(p.get("authors")) + ". ") if p.get("authors") else ""
    return f"{head}{tex(p.get('title'))}. {', '.join(bits)}{status}." + (" " + r" \textperiodcentered{} ".join(ids) if ids else "")



SITE = "https://s-siyanwal.github.io/"

def proof_href(value):
    """A links.json proof: an https URL, or a repo path published at the GitHub Pages origin."""
    v = value or ""
    href = v if v.startswith("http") else (SITE + v if v.startswith("assets/") else "")
    return (r" \href{%s}{\small\textit{View proof}}" % url(href)) if href else ""


def body(d, links):
    out = []
    out.append(r"\cvsection{Education}")
    for e in d.get("education", []):
        note = tex(e.get("note")) if e.get("note") else ""
        out.append(r"\cventry{%s}{%s}{%s}{%s}" % (tex(e["degree"]), tex(e.get("period")),
                                                  tex(e["school"] + (", " + e["location"] if e.get("location") else "")), note))
    out.append(r"\cvsection{Research experience}")
    role_proofs = (links or {}).get("role_proofs") or {}
    for e in d.get("experience", []) + d.get("research", []):
        pts = e.get("points") or []
        b = (r"\begin{cvitems}" + "".join(r"\item " + tex(t) for t in pts) + r"\end{cvitems}") if pts else tex(e.get("summary"))
        out.append(r"\cventry{%s%s}{%s}{%s}{%s}" % (tex(e["role"]), proof_href(role_proofs.get(f"{e.get('role', '')} @ {e.get('org', '')}")), tex(e.get("period")),
                                                  tex(e["org"] + (", " + e["location"] if e.get("location") else "")), b))
    pubs = d.get("publications", [])
    out.append(r"\cvsection{Publications}")
    for cat, label, pre in PAPER_GROUPS:
        lst = [p for p in pubs if p.get("category") == cat]
        if lst:
            out.append(r"\cvsubsection{%s}" % label)
            out += [r"\cvref{%s%d}{%s}" % (pre, i + 1, cite(p)) for i, p in enumerate(lst)]
    prep = d.get("in_preparation") or []                           # topics only: no title or author list yet
    if prep:
        out.append(r"\cvsubsection{Manuscripts in preparation}")
        def prep_item(m):
            tail = (" " + tex(m["detail"]) + ".") if m.get("detail") else ""
            links = " ".join(r"\href{%s}{%s}" % (url(l["url"]), tex(l["label"]))
                             for l in m.get("links") or [] if l.get("url") and l.get("label"))
            return tex(m["topic"]) + "." + tail + ((" " + links) if links else "")
        out.append(r"\begin{cvitems}" + "".join(r"\item %s" % prep_item(m) for m in prep) + r"\end{cvitems}")
    if any(p.get("equal_contribution") for p in pubs):
        out.append(r"\par\vspace{2pt}{\footnotesize $^{*}$Equal contribution.}\par")
    talks = [p for p in pubs if p.get("category") in ("poster", "presentation")]
    if talks:
        out.append(r"\cvsection{Posters and talks}")
        count = {"Poster": 0, "Talk": 0}                            # posters [Po1..] and talks [T1..] numbered separately
        for p in talks:
            kind = "Poster" if p["category"] == "poster" else "Talk"
            count[kind] += 1
            head = (authors(p.get("authors")) + ". ") if p.get("authors") else ""
            extra = "".join(" " + r"\href{%s}{%s}" % (url(l["url"]), tex(l["label"]))
                            for l in p.get("links") or [] if l.get("url") and l.get("label"))
            out.append(r"\cvref{%s%d}{%s%s. %s, \textit{%s}%s.%s}" % ("Po" if kind == "Poster" else "T", count[kind], head, tex(p["title"]), kind,
                                                                    tex(p.get("venue")), (", " + tex(p["year"])) if p.get("year") else "", extra))
    out.append(r"\cvsection{Awards and fellowships}")
    proofs = (links or {}).get("proofs") or {}
    for a in d.get("awards", []):
        out.append(r"\cvaward{%s%s}{%s}" % (tex(a["title"]), proof_href(proofs.get(a["title"])), tex(a.get("year"))))
    if d.get("certificates"):
        out.append(r"\cvsection{Certificates and events}")
        cert_proofs = (links or {}).get("certificate_proofs") or {}
        for a in d["certificates"]:
            out.append(r"\cvaward{%s%s}{%s}" % (tex(a["title"]), proof_href(cert_proofs.get(a["title"])), tex(a.get("year"))))
    out.append(r"\cvsection{Skills}")
    out.append(r"\begin{tabular}{@{}>{\bfseries}p{0.24\linewidth}p{0.72\linewidth}@{}}")
    out += [r"%s & %s \\[2pt]" % (tex(g["category"]), tex(", ".join(g.get("items", [])))) for g in d.get("skills", [])]
    out.append(r"\end{tabular}")
    # References as one closing line, not a section: a heading for a single line would orphan onto its own page
    out.append(r"\par\nopagebreak\vspace{8pt}{\itshape References available on request.}")
    return "\n".join(out)


def generate(data, links=None):
    p = data.get("profile", {})
    contact = [tex(p.get("location"))] if p.get("location") else []
    if p.get("email"):
        contact.append(r"\href{mailto:%s}{%s}" % (url(p["email"]), tex(p["email"])))
    for x in p.get("profiles", []):
        if x.get("url") and x.get("id") in ("orcid", "github", "linkedin", "scholar", "researchgate"):
            contact.append(r"\href{%s}{%s}" % (url(x["url"]), tex(x["label"])))
    t = TEMPLATE.read_text(encoding="utf-8")
    t = t.replace("%%NAME%%", tex(p.get("name"))).replace("%%TITLE%%", tex(p.get("title")))
    t = t.replace("%%CONTACT%%", r" \textperiodcentered{} ".join(contact)).replace("%%BODY%%", body(data, links))
    return t


def compile_pdf(tex_src, out_pdf):
    """Runs pdflatex twice in a temporary folder. Returns True on success; raises with the log tail on failure."""
    exe = shutil.which("pdflatex")
    if not exe:
        return False
    with tempfile.TemporaryDirectory() as tmp:
        (Path(tmp) / "cv.tex").write_text(tex_src, encoding="utf-8")
        for _ in range(2):
            r = subprocess.run([exe, "-interaction=nonstopmode", "-halt-on-error", "cv.tex"], cwd=tmp, capture_output=True, text=True)
            if r.returncode != 0:
                raise RuntimeError("pdflatex failed:\n" + r.stdout[-3000:])
        shutil.copyfile(Path(tmp) / "cv.pdf", out_pdf)
    return True


def load():
    data = json.loads((ROOT / "data" / "content.json").read_text(encoding="utf-8"))
    lp = ROOT / "data" / "links.json"
    links = json.loads(lp.read_text(encoding="utf-8")) if lp.exists() else {}
    return data, links


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", help="output folder (default: cv/)")
    a = ap.parse_args()
    data, links = load()
    src = generate(data, links)
    if a.out:
        out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
        tex_path, pdf_path = out / "Shivanshu_Siyanwal_CV.tex", out / "Shivanshu_Siyanwal_CV.pdf"
    else:
        tex_path, pdf_path = ROOT / "cv" / "cv.tex", ROOT / "cv" / "cv.pdf"
    tex_path.write_text(src, encoding="utf-8")
    ok = compile_pdf(src, pdf_path)
    print(f"wrote {tex_path}" + (f" and {pdf_path}" if ok else " (pdflatex not found: no PDF)"))


if __name__ == "__main__":
    sys.exit(main())
