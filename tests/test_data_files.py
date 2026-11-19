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
