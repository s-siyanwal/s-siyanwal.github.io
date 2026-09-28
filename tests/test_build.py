"""Unit tests for the pure helpers in scripts/build.py. No browser, no network."""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build  # noqa: E402

CONTENT = json.loads((ROOT / "data" / "content.json").read_text(encoding="utf-8"))
SITE = "https://example.test/site"


def test_clip_keeps_short_text():
    assert build.clip("  short   text ") == "short text"


def test_clip_cuts_on_word_boundary():
    out = build.clip("word " * 60, 30)
    assert out.endswith("…") and len(out) <= 31 and "wor…" not in out


def test_set_head_replaces_title_and_meta():
    tmpl = (ROOT / "index.html").read_text(encoding="utf-8")
    doc = build.set_head(tmpl, build.head_block(SITE, "", "T", "D"))
    assert doc.count("<title>") == 1 and "<title>T</title>" in doc
    assert doc.count('name="description"') == 1
    assert f'<link rel="canonical" href="{SITE}/"/>' in doc
    assert 'property="og:image" content="https://example.test/site/og.png"' in doc


def test_head_block_escapes():
    assert '&quot;x&quot;' in build.head_block(SITE, "p.html", 'A "x"', "d")


def test_person_ld_skips_placeholder_and_mailto():
    ld = build.person_ld(CONTENT, SITE)
    assert all(u.startswith("http") and "REPLACE_ME" not in u for u in ld.get("sameAs", []))
    assert ld["name"] == CONTENT["profile"]["name"]


def test_article_ld_strips_et_al():
    ld = build.article_ld({"title": "T", "year": "2025", "authors": "S. Siyanwal et al.",
                           "doi": "10.1/x"})
    assert ld["author"] == [{"@type": "Person", "name": "S. Siyanwal"}]
    assert ld["sameAs"] == "https://doi.org/10.1/x"


def test_jsonld_cannot_close_script():
    assert "</script" not in build.jsonld({"x": "</script><b>"})[:-9]


def test_clean_snapshot_removes_runtime_classes():
    raw = '<html lang="en" data-built class="js"><body><p class="is-in">x</p><p class="a is-in">y</p></body></html>'
    out = build.clean_snapshot(raw)
    assert out.startswith("<!DOCTYPE html>")
    assert 'class="js"' not in out and "is-in" not in out and 'class="a"' in out
