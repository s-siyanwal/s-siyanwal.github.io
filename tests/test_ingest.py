"""Unit tests for the deterministic merge in scripts/ingest.py. No network."""

import copy
import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import ingest  # noqa: E402
import check_content  # noqa: E402

CONTENT = json.loads((ROOT / "data" / "content.json").read_text(encoding="utf-8"))


@pytest.fixture
def cur():
    return copy.deepcopy(CONTENT)


# ------------------------------------------------------------------ dedupe
def test_experience_dedupe_by_role_and_org(cur):
    e = cur["experience"][0]
    n = len(cur["experience"])
    ingest.merge(cur, {"experience": [{"role": e["role"].upper() + " ", "org": e["org"],
                                       "period": e["period"]}]})
    assert len(cur["experience"]) == n


def test_publication_dedupe_by_title(cur):
    t = cur["publications"][0]["title"]
    n = len(cur["publications"])
    ingest.merge(cur, {"publications": [{"title": t + "!", "year": "2026"}]})
    assert len(cur["publications"]) == n


def test_new_items_are_added(cur):
    n = len(cur["awards"])
    stats = ingest.merge(cur, {"awards": [{"title": "A brand new award", "year": "2026"}]})
    assert len(cur["awards"]) == n + 1
    assert stats["awards"] == (1, 0)


# ------------------------------------------------------------------ backfill
def test_doi_backfill_on_existing_publication(cur):
    pub = cur["publications"][0]
    pub["doi"] = ""
    ingest.merge(cur, {"publications": [{"title": pub["title"], "doi": "10.1000/xyz"}]})
    match = [p for p in cur["publications"] if p["title"] == pub["title"]]
    assert match[0]["doi"] == "10.1000/xyz"


def test_existing_fields_never_overwritten(cur):
    pub = cur["publications"][0]
    old = pub["abstract"]
    assert old
    ingest.merge(cur, {"publications": [{"title": pub["title"], "abstract": "Rewritten"}]})
    assert [p for p in cur["publications"] if p["title"] == pub["title"]][0]["abstract"] == old


# ------------------------------------------------------------------ ids
def test_project_id_generated_from_name(cur):
    ingest.merge(cur, {"projects": [{"name": "Photonic Boson Sampling!"}]})
    p = cur["projects"][-1]
    assert p["id"] == "photonic-boson-sampling"
    assert p["audience"] == "both" and p["featured"] is False


def test_project_id_collision_gets_suffix(cur):
    cur["projects"].append({"id": "same-name", "name": "keep"})
    ingest.merge(cur, {"projects": [{"name": "Same Name"}]})
    ids = [p["id"] for p in cur["projects"]]
    assert "same-name-2" in ids
    assert len(ids) == len(set(ids))


# ------------------------------------------------------------------ skills
def test_skill_union(cur):
    cat = cur["skills"][0]
    have = list(cat["items"])
    ingest.merge(cur, {"skills": [{"category": cat["category"],
                                   "items": [have[0], "Brand New Skill"]}]})
    assert cat["items"] == have + ["Brand New Skill"]


def test_new_skill_category(cur):
    ingest.merge(cur, {"skills": [{"category": "Hardware", "items": ["FPGA"]}]})
    assert cur["skills"][-1] == {"category": "Hardware", "items": ["FPGA"]}


# ------------------------------------------------------------------ profile
def test_profile_fields_never_overwritten(cur):
    before = copy.deepcopy(cur["profile"])
    ingest.merge(cur, {"profile": {"name": "Someone Else", "title": "CEO",
                                   "email": "x@example.com", "summary": "new"}})
    assert cur["profile"] == before


def test_profile_empty_field_is_filled(cur):
    cur["profile"]["phone"] = ""
    ingest.merge(cur, {"profile": {"phone": "+00 123"}})
    assert cur["profile"]["phone"] == "+00 123"


# ------------------------------------------------------------------ sorting
@pytest.mark.parametrize("text,year", [
    ("Oct 2024 – Present", ingest.PRESENT),
    ("Jan 2020 – Current", ingest.PRESENT),
    ("Mar 2019 – Sep 2021", 2021),
    ("2025", 2025),
    ("", 0),
])
def test_latest_year(text, year):
    assert ingest.latest_year({"period": text}) == year


def test_sorted_newest_first(cur):
    ingest.merge(cur, {
        "experience": [{"role": "Old job", "org": "X", "period": "Jan 2015 – Dec 2016"}],
        "publications": [{"title": "Newest paper", "year": "2027"}],
        "research": [{"role": "RA", "org": "Y", "period": "Jan 2023 – Dec 2023"}],
    })
    for key in ("experience", "research", "publications"):
        ys = [ingest.latest_year(x) for x in cur[key]]
        assert ys == sorted(ys, reverse=True), key
    assert cur["experience"][0]["period"].endswith("Present")
    assert cur["experience"][-1]["role"] == "Old job"
    assert cur["publications"][0]["title"] == "Newest paper"


# ------------------------------------------------------------------ JSON salvage
@pytest.mark.parametrize("raw", [
    '{"awards": [{"title": "X"}]}',
    '```json\n{"awards": [{"title": "X"}]}\n```',
    'Sure! Here is the JSON:\n{"awards": [{"title": "X"}]}\nHope that helps.',
])
def test_parse_json_blob(raw):
    assert ingest.parse_json_blob(raw) == {"awards": [{"title": "X"}]}


def test_parse_json_blob_rejects_garbage():
    with pytest.raises(SystemExit):
        ingest.parse_json_blob("no json here")


# ------------------------------------------------------------------ validation
def test_current_content_is_valid():
    assert ingest.validate(CONTENT) == []
    assert check_content.schema_errors(CONTENT) == []


def test_validate_rejects_empty_experience(cur):
    cur["experience"] = []
    assert any("experience" in p for p in ingest.validate(cur))


def test_validate_rejects_duplicate_ids(cur):
    cur["projects"].append(dict(cur["projects"][0]))
    assert "project ids must be unique" in ingest.validate(cur)


def test_removed_titles_detected(cur):
    base = copy.deepcopy(cur)
    gone = cur["publications"].pop()
    assert check_content.removed_titles(base, cur) == [f"publications: {gone['title']}"]
    assert check_content.removed_titles(base, base) == []
