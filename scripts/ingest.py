#!/usr/bin/env python3
"""
Ingest a dropped file (PDF / LaTeX / txt / md / docx / json) and merge its
information into data/content.json.

Design notes
------------
The language model is used ONLY to EXTRACT structured items from your document.
It never rewrites content.json. All merging is done deterministically in Python,
so existing entries can never be dropped, reworded, or hallucinated away by the
model. This also keeps prompts small enough for free-tier rate limits.

Providers (set LLM_PROVIDER):
  groq        free, no credit card, open-weight models   <- default
  gemini      Google AI Studio free tier
  openrouter  many free open models (":free" suffix)
  ollama      fully local / offline, no account at all
  openai_compat  any OpenAI-compatible endpoint via LLM_BASE_URL
  anthropic   optional

Only stdlib is used for HTTP, so no SDK needs installing.
"""

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / "data" / "content.json"
INBOX = ROOT / "inbox"

TOP_LEVEL = ["profile", "metrics", "skills", "experience", "research",
             "projects", "publications", "education", "awards", "about"]

# --------------------------------------------------------------- provider cfg
DEFAULTS = {
    "groq": {
        "url": "https://api.groq.com/openai/v1/chat/completions",
        "model": "llama-3.3-70b-versatile",
        "kind": "openai",
    },
    "openrouter": {
        "url": "https://openrouter.ai/api/v1/chat/completions",
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "kind": "openai",
    },
    "gemini": {
        "url": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        "model": "gemini-2.0-flash",
        "kind": "gemini",
    },
    "ollama": {
        "url": "http://localhost:11434/v1/chat/completions",
        "model": "llama3.1:8b",
        "kind": "openai",
    },
    "openai_compat": {
        "url": "",  # must supply LLM_BASE_URL
        "model": "",
        "kind": "openai",
    },
    "anthropic": {
        "url": "https://api.anthropic.com/v1/messages",
        "model": "claude-sonnet-4-6",
        "kind": "anthropic",
    },
}


def provider_config():
    name = (os.environ.get("LLM_PROVIDER") or "groq").strip().lower()
    if name not in DEFAULTS:
        sys.exit(f"::error::Unknown LLM_PROVIDER '{name}'. "
                 f"Choose one of: {', '.join(DEFAULTS)}")
    cfg = dict(DEFAULTS[name])
    cfg["name"] = name
    cfg["model"] = os.environ.get("LLM_MODEL") or cfg["model"]
    base = os.environ.get("LLM_BASE_URL")
    if base:
        base = base.rstrip("/")
        if cfg["kind"] == "openai":
            cfg["url"] = base if base.endswith("/chat/completions") else base + "/chat/completions"
        else:
            cfg["url"] = base
    if cfg["kind"] == "gemini":
        cfg["url"] = cfg["url"].format(model=cfg["model"])
    if not cfg["url"]:
        sys.exit("::error::LLM_BASE_URL is required for provider 'openai_compat'.")
    cfg["key"] = os.environ.get("LLM_API_KEY", "")
    if not cfg["key"] and name != "ollama":
        sys.exit(f"::error::LLM_API_KEY is not set. Add it as a repository secret "
                 f"(Settings → Secrets and variables → Actions).")
    return cfg


# ---------------------------------------------------------------- HTTP helper
def post_json(url, payload, headers, timeout=180):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:600]
        if e.code == 429:
            sys.exit("::error::Rate limit hit on the free tier. Wait a minute and "
                     "re-run the workflow (Actions → Update site content → Run workflow).")
        sys.exit(f"::error::LLM request failed ({e.code}): {body}")
    except urllib.error.URLError as e:
        sys.exit(f"::error::Could not reach the LLM endpoint: {e.reason}")


def call_llm(cfg, system, user):
    if cfg["kind"] == "openai":
        payload = {
            "model": cfg["model"],
            "temperature": 0,
            "messages": [{"role": "system", "content": system},
                         {"role": "user", "content": user}],
        }
        headers = {}
        if cfg["key"]:
            headers["Authorization"] = f"Bearer {cfg['key']}"
        data = post_json(cfg["url"], payload, headers)
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            sys.exit(f"::error::Unexpected response: {json.dumps(data)[:400]}")

    if cfg["kind"] == "gemini":
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": user}]}],
            "generationConfig": {"temperature": 0},
        }
        data = post_json(f"{cfg['url']}?key={cfg['key']}", payload, {})
        try:
            return "".join(p.get("text", "")
                           for p in data["candidates"][0]["content"]["parts"])
        except (KeyError, IndexError):
            sys.exit(f"::error::Unexpected response: {json.dumps(data)[:400]}")

    # anthropic
    payload = {
        "model": cfg["model"], "max_tokens": 8000, "temperature": 0,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    headers = {"x-api-key": cfg["key"], "anthropic-version": "2023-06-01"}
    data = post_json(cfg["url"], payload, headers)
    try:
        return "".join(b.get("text", "") for b in data["content"])
    except KeyError:
        sys.exit(f"::error::Unexpected response: {json.dumps(data)[:400]}")


# ---------------------------------------------------------------- extraction
def extract_text(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in (".json", ".txt", ".md", ".markdown", ".tex", ".bib"):
        return path.read_text(encoding="utf-8", errors="replace")
    if ext == ".pdf":
        try:
            return subprocess.run(["pdftotext", "-layout", str(path), "-"],
                                  capture_output=True, text=True, check=True).stdout
        except Exception as e:
            sys.exit(f"::error::Could not read PDF {path.name}: {e}")
    if ext == ".docx":
        try:
            import docx
            return "\n".join(p.text for p in docx.Document(str(path)).paragraphs)
        except Exception as e:
            sys.exit(f"::error::Could not read DOCX {path.name}: {e}")
    sys.exit(f"::error::Unsupported file type: {path.name}")


# ---------------------------------------------------------------- prompting
SYSTEM = (
    "You extract structured data from CVs and academic notes. "
    "You output ONLY a single raw JSON object. No markdown fences, no commentary. "
    "You never invent facts: if a field is not stated in the source, omit it or use \"\". "
    "You never output URLs, DOIs, or numbers that do not literally appear in the source."
)

USER_TMPL = """Extract every item from the SOURCE below into this exact JSON shape.
Include ONLY items you can actually find. Omit any array that has nothing new.

{{
  "experience":   [{{"org":"","role":"","location":"","period":"","summary":"","points":[""],"tags":[""],"current":false}}],
  "research":     [{{"org":"","role":"","location":"","period":"","summary":"","points":[""],"tags":[""]}}],
  "projects":     [{{"name":"","blurb":"","abstract":"","tags":[""],"audience":"academic|industry|both","metrics":[{{"value":"","label":""}}]}}],
  "publications": [{{"venue":"","year":"","title":"","type":"Journal article|Conference paper|Poster|Preprint","status":"","authors":"","doi":"","abstract":""}}],
  "education":    [{{"school":"","degree":"","location":"","period":"","note":""}}],
  "awards":       [{{"title":"","year":""}}],
  "skills":       [{{"category":"","items":[""]}}],
  "profile":      {{"name":"","title":"","location":"","email":"","phone":"","summary":""}}
}}

Rules:
- "period" format: "Mon YYYY – Mon YYYY" or "Mon YYYY – Present".
- Set "current": true only for a role explicitly ongoing.
- "audience": "industry" for engineering/deployment work, "academic" for research, "both" if genuinely both.
- Keep "points" as short factual bullets copied in substance from the source.
- Do not copy the EXISTING ITEMS list below into your output. It is shown only so you
  can skip things already recorded. If an existing item appears in the source with NEW
  information, include it with the fuller details.

EXISTING ITEMS (already on the site — do not re-emit unless you have new detail):
{existing}

=== SOURCE: {filename} ===
{source}
"""


def compact_existing(d):
    """A tiny digest of what's already stored, to help the model skip duplicates."""
    lines = []
    for e in d.get("experience", []) + d.get("research", []):
        lines.append(f"- role: {e.get('role','')} @ {e.get('org','')} ({e.get('period','')})")
    for p in d.get("projects", []):
        lines.append(f"- project: {p.get('name','')}")
    for p in d.get("publications", []):
        lines.append(f"- publication: {p.get('title','')} ({p.get('year','')})")
    for a in d.get("awards", []):
        lines.append(f"- award: {a.get('title','')}")
    for e in d.get("education", []):
        lines.append(f"- education: {e.get('degree','')} @ {e.get('school','')}")
    return "\n".join(lines) or "(none)"


def parse_json_blob(raw: str):
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?", "", raw)
        raw = raw.rsplit("```", 1)[0]
    raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass
    # salvage the outermost {...}
    s, e = raw.find("{"), raw.rfind("}")
    if s != -1 and e > s:
        try:
            return json.loads(raw[s:e + 1])
        except json.JSONDecodeError as err:
            Path("/tmp/bad_llm_output.txt").write_text(raw)
            sys.exit(f"::error::Model did not return valid JSON: {err}")
    Path("/tmp/bad_llm_output.txt").write_text(raw)
    sys.exit("::error::Model did not return JSON at all.")


# ---------------------------------------------------------------- merging
def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", str(s or "").lower()).strip()


def slug(s):
    out = re.sub(r"[^a-z0-9]+", "-", str(s or "").lower()).strip("-")
    return out[:48] or "project"


def merge_list(existing, incoming, keyfn, allow_update=True):
    """Add new items; fill blank fields on matched items. Never deletes."""
    added = updated = 0
    index = {keyfn(x): x for x in existing}
    for item in incoming or []:
        if not isinstance(item, dict):
            continue
        k = keyfn(item)
        if not k:
            continue
        if k in index:
            if not allow_update:
                continue
            tgt = index[k]
            for f, v in item.items():
                if v in ("", [], None, False):
                    continue
                if tgt.get(f) in ("", [], None):
                    tgt[f] = v
                    updated += 1
        else:
            existing.append(item)
            index[k] = item
            added += 1
    return added, updated


def merge(current, new):
    stats = {}

    stats["experience"] = merge_list(
        current.setdefault("experience", []), new.get("experience"),
        lambda x: f"{norm(x.get('role'))}|{norm(x.get('org'))}")

    stats["research"] = merge_list(
        current.setdefault("research", []), new.get("research"),
        lambda x: f"{norm(x.get('role'))}|{norm(x.get('org'))}")

    # Projects need stable, unique ids (subpage URLs depend on them)
    projects = current.setdefault("projects", [])
    used = {p.get("id") for p in projects}
    incoming_projects = []
    for p in (new.get("projects") or []):
        if not isinstance(p, dict) or not p.get("name"):
            continue
        p = dict(p)
        if not p.get("id"):
            base = slug(p["name"])
            cand, n = base, 2
            while cand in used:
                cand, n = f"{base}-{n}", n + 1
            p["id"] = cand
            used.add(cand)
        p.setdefault("links", [{"label": "Code", "url": ""}])
        p.setdefault("featured", False)
        p.setdefault("metrics", [])
        p.setdefault("audience", "both")
        incoming_projects.append(p)
    stats["projects"] = merge_list(projects, incoming_projects,
                                   lambda x: norm(x.get("name")))

    stats["publications"] = merge_list(
        current.setdefault("publications", []), new.get("publications"),
        lambda x: norm(x.get("title")))

    stats["education"] = merge_list(
        current.setdefault("education", []), new.get("education"),
        lambda x: f"{norm(x.get('degree'))}|{norm(x.get('school'))}")

    stats["awards"] = merge_list(
        current.setdefault("awards", []), new.get("awards"),
        lambda x: norm(x.get("title")))

    # Skills: union of items within each category
    skills = current.setdefault("skills", [])
    sidx = {norm(s.get("category")): s for s in skills}
    added = 0
    for s in (new.get("skills") or []):
        if not isinstance(s, dict) or not s.get("category"):
            continue
        k = norm(s["category"])
        if k in sidx:
            have = {norm(i) for i in sidx[k].get("items", [])}
            for it in s.get("items", []):
                if norm(it) not in have:
                    sidx[k].setdefault("items", []).append(it)
                    have.add(norm(it))
                    added += 1
        else:
            skills.append({"category": s["category"], "items": s.get("items", [])})
            sidx[k] = skills[-1]
            added += 1
    stats["skills"] = (added, 0)

    # Profile: only fill genuinely empty fields; never overwrite your wording
    prof = current.setdefault("profile", {})
    np = new.get("profile") or {}
    pu = 0
    for f in ("name", "title", "location", "email", "phone"):
        if np.get(f) and not prof.get(f):
            prof[f] = np[f]
            pu += 1
    stats["profile"] = (0, pu)

    # Newest first
    def yr(x):
        m = re.findall(r"(19|20)\d{2}", str(x.get("period") or x.get("year") or ""))
        return max(m and [int(str(x.get("period") or x.get("year"))[s.start():s.start()+4])
                          for s in re.finditer(r"(19|20)\d{2}",
                          str(x.get("period") or x.get("year") or ""))] or [0])
    try:
        current["experience"].sort(key=yr, reverse=True)
        current["publications"].sort(key=lambda p: str(p.get("year", "")), reverse=True)
    except Exception:
        pass

    return stats


# ---------------------------------------------------------------- validation
def validate(obj):
    problems = []
    if not isinstance(obj, dict):
        return ["Top level is not a JSON object."]
    for key in TOP_LEVEL:
        if key not in obj:
            problems.append(f"Missing top-level key: {key}")
    prof = obj.get("profile", {})
    for f in ("name", "title", "email"):
        if not prof.get(f):
            problems.append(f"profile.{f} is empty")
    if not isinstance(prof.get("profiles"), list) or not prof.get("profiles"):
        problems.append("profile.profiles must be a non-empty list")
    for key in ("experience", "projects", "publications", "education"):
        if key in obj and not isinstance(obj[key], list):
            problems.append(f"{key} must be a list")
    ids = [p.get("id") for p in obj.get("projects", []) if isinstance(p, dict)]
    if any(not i for i in ids):
        problems.append("every project needs a non-empty 'id'")
    if len(ids) != len(set(ids)):
        problems.append("project ids must be unique")
    if len(obj.get("experience", [])) == 0:
        problems.append("experience list is empty — refusing (likely a bad parse)")
    return problems


# ---------------------------------------------------------------- main
def out(key, val):
    p = os.environ.get("GITHUB_OUTPUT")
    if p:
        with open(p, "a") as f:
            f.write(f"{key}={val}\n")


def main():
    files = [p for p in sorted(INBOX.iterdir())
             if p.is_file() and p.name not in (".gitkeep", "README.md")]
    if not files:
        print("No files in inbox/. Nothing to do.")
        out("changed", "false")
        return

    current = json.loads(CONTENT.read_text(encoding="utf-8"))
    before = json.dumps(current, sort_keys=True)
    summary_lines = []
    processed = []

    for f in files:
        print(f"\n→ {f.name}")
        text = extract_text(f)
        if not text.strip():
            sys.exit(f"::error::No text extracted from {f.name}")

        if f.suffix.lower() == ".json":
            try:
                blob = json.loads(text)
            except json.JSONDecodeError as e:
                sys.exit(f"::error::{f.name} is not valid JSON: {e}")
            # A full content file replaces; a partial one merges.
            if "profile" in blob and "projects" in blob and "about" in blob:
                current = blob
                summary_lines.append(f"- `{f.name}`: replaced content.json wholesale")
                processed.append(f)
                continue
            new = blob
            print("  partial JSON — merging (no LLM needed)")
        else:
            cfg = provider_config()
            print(f"  provider={cfg['name']} model={cfg['model']}")
            raw = call_llm(cfg, SYSTEM, USER_TMPL.format(
                existing=compact_existing(current),
                filename=f.name,
                source=text[:60000],
            ))
            new = parse_json_blob(raw)

        stats = merge(current, new)
        bits = [f"{k} +{a}/~{u}" for k, (a, u) in stats.items() if a or u]
        line = ", ".join(bits) if bits else "no new items found"
        print(f"  {line}")
        summary_lines.append(f"- `{f.name}`: {line}")
        processed.append(f)

    problems = validate(current)
    if problems:
        for p in problems:
            print(f"::error::{p}")
        sys.exit("Validation failed — content.json NOT modified.")

    if json.dumps(current, sort_keys=True) == before:
        print("\nNo effective change.")
        out("changed", "false")
        return

    CONTENT.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n",
                       encoding="utf-8")
    print("\n✓ data/content.json updated")

    archive = INBOX / "archive"
    archive.mkdir(exist_ok=True)
    names = []
    for f in processed:
        dest = archive / f.name
        if dest.exists():
            dest = archive / f"{f.stem}-{os.urandom(3).hex()}{f.suffix}"
        f.rename(dest)
        names.append(f.name)

    out("changed", "true")
    out("files", ", ".join(names))
    Path(ROOT / "pr_body.md").write_text(
        "Automated update from files dropped in `inbox/`.\n\n"
        + "\n".join(summary_lines)
        + "\n\nReview the `data/content.json` diff below, then **Merge** to publish.\n"
          "Close this PR instead if anything looks wrong — nothing goes live until you merge.\n",
        encoding="utf-8")


if __name__ == "__main__":
    main()
