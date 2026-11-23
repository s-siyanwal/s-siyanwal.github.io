"""Checks for the optional data files (links.json, journey.json) and the LaTeX CV generator. No network, no TeX."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import cv_tex  # noqa: E402

DATA = json.loads((ROOT / "data" / "content.json").read_text(encoding="utf-8"))
LINKS = json.loads((ROOT / "data" / "links.json").read_text(encoding="utf-8"))
JOURNEY = json.loads((ROOT / "data" / "journey.json").read_text(encoding="utf-8"))
PHONE = re.compile(r"\+?\d[\d\s-]{8,}\d")


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()).strip("-")[:60]
    return s.rstrip("-")


def test_links_keys_match_content():
    ids = {p["id"] for p in DATA["projects"]}
    assert set(LINKS.get("artifacts", {})) <= ids, "links.json artifacts must be keyed by project ids"
    for v in LINKS["artifacts"].values():
        assert set(v) <= {"pdf", "code", "data", "slides"}
    titles = {a["title"] for a in DATA["awards"]}
    assert set(LINKS.get("proofs", {})) <= titles, "links.json proofs must be keyed by award titles exactly"


def test_links_are_urls_or_repo_paths():
    vals = [v for a in LINKS["artifacts"].values() for v in a.values()] + list(LINKS["proofs"].values())
    for v in vals:
        assert v == "" or v.startswith("https://") or v.startswith("assets/"), v
        if v.startswith("assets/"):
            assert (ROOT / v).exists(), f"missing file {v}"


def test_journey_stages_match_path_events():
    keys = {slug(e["degree"]) for e in DATA["education"]} | {slug(e["role"]) for e in DATA["experience"] + DATA["research"]}
    assert set(JOURNEY["stages"]) <= keys, "journey.json stage keys must come from role / degree titles"
    items = [m for st in JOURNEY["stages"].values() for m in st.get("featured", []) + st.get("gallery", [])]
    items += [m for sec in JOURNEY["personal"].get("sections", []) for m in sec.get("featured", []) + sec.get("gallery", [])]
    for m in items:
        assert m.get("src") and m.get("alt") is not None, m
        assert m.get("type", "image") in ("image", "video")


def test_project_extras_are_well_formed():
    for p in DATA["projects"]:
        assert all(isinstance(x, str) and x for x in p.get("layman", []))
        for st in p.get("pipeline", []):
            assert set(st) == {"stage", "by"}


def test_cv_tex_has_sections_and_no_phone():
    src = cv_tex.generate(DATA, LINKS)
    for h in ["Education", "Research experience", "Publications", "Posters and talks", "Awards and fellowships", "Skills"]:
        assert r"\cvsection{%s}" % h in src
    assert "References available on request." in src
    body = src.split(r"\begin{document}")[1]
    text = re.sub(r"\\href\{[^}]*\}", "", body)
    text = re.sub(r"(doi|arXiv):\S+", "", text)                   # identifiers are not phone numbers
    assert not PHONE.search(text), "no phone-like numbers in the CV"


def test_cv_tex_escapes_specials():
    assert cv_tex.tex("R&D 50% #1 a_b") == r"R\&D 50\% \#1 a\_b"


def test_in_preparation_is_well_formed():
    ids = {p["id"] for p in DATA["projects"]}
    for m in DATA.get("in_preparation", []):
        assert set(m) <= {"topic", "kind", "detail", "project", "links"}, m
        assert isinstance(m.get("topic"), str) and m["topic"].strip(), m
        assert m.get("project") in (None, *ids), f"unknown project {m.get('project')}"
        for link in m.get("links", []):
            assert set(link) == {"label", "url"}, link
            assert link["url"].startswith("https://"), link
        assert not PHONE.search(" ".join(str(v) for v in m.values() if not isinstance(v, list))), "no phone-like numbers"


def test_cv_tex_lists_manuscripts_in_preparation():
    src = cv_tex.generate(DATA, LINKS)
    if DATA.get("in_preparation"):
        assert r"\cvsubsection{Manuscripts in preparation}" in src
        for m in DATA["in_preparation"]:
            assert cv_tex.tex(m["topic"]) in src


def test_project_links_are_https_or_empty():
    for p in DATA["projects"]:
        for link in p.get("links", []):
            assert set(link) == {"label", "url"}, link
            assert link["url"] == "" or link["url"].startswith("https://"), link


PERSONAL_MAIL = re.compile(r"@(gmail|googlemail|yahoo|outlook|hotmail|rediffmail|icloud|me\.com|proton|aol)\.", re.I)
MONTH = re.compile(r"\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b")


def test_references_are_institutional_and_have_no_phones():
    refs = DATA["references"]
    assert [r["name"] for r in refs] == [
        "Mr Abhishek Tiwari",
        "Dr Arpita Maitra",
        "Prof. Kavita Dorai",
        "Dr. Arvind",
        "Dr Ananth Venkatesan",
        "Prof. N. G. Prasad",
        "Dr. Vaishali Gulati",
        "Dr. Kapil Kumar Sharma",
    ]
    for r in refs:
        assert set(r) <= {"name", "post", "relation", "email"}
        assert r["name"].strip() and r["post"].strip()
        blob = " ".join(str(v) for v in r.values())
        assert not PHONE.search(blob), r
        assert not MONTH.search(r.get("relation") or ""), r
        if "email" in r:
            assert "@" in r["email"] and " " not in r["email"]
            assert not r["email"].startswith("mailto:")
            assert not PERSONAL_MAIL.search(r["email"]), r["email"]
    by = {r["name"]: r for r in refs}
    assert by["Dr. Vaishali Gulati"]["email"] == "vaishali@dl.amrita.edu"
    assert by["Dr. Arvind"]["email"] == "arvind@iisermohali.ac.in"
    assert "email" not in by["Dr. Kapil Kumar Sharma"]

