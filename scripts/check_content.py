#!/usr/bin/env python3
"""
Validate data/content.json on pull requests.

  python3 scripts/check_content.py                      # schema + ingest.validate()
  python3 scripts/check_content.py --base base.json     # also fail on removed titles

Removals are allowed only when the PR description (env PR_BODY) contains
"intentional removal".
"""

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from ingest import norm, validate  # noqa: E402

TITLE_KEYS = {
    "experience": lambda x: f"{x.get('role', '')} @ {x.get('org', '')}",
    "research": lambda x: f"{x.get('role', '')} @ {x.get('org', '')}",
    "publications": lambda x: x.get("title", ""),
    "projects": lambda x: x.get("name", ""),
}


def schema_errors(obj):
    import jsonschema
    schema = json.loads((ROOT / "scripts" / "schema.json").read_text(encoding="utf-8"))
    v = jsonschema.Draft202012Validator(schema)
    return [f"{'/'.join(map(str, e.absolute_path)) or '(root)'}: {e.message}"
            for e in sorted(v.iter_errors(obj), key=lambda e: list(e.absolute_path))]


def removed_titles(base, head):
    gone = []
    for key, label in TITLE_KEYS.items():
        now = {norm(label(x)) for x in head.get(key, []) if isinstance(x, dict)}
        for x in base.get(key, []):
            if isinstance(x, dict) and norm(label(x)) not in now:
                gone.append(f"{key}: {label(x)}")
    return gone


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--content", default=str(ROOT / "data" / "content.json"))
    ap.add_argument("--base", help="content.json from the base branch")
    args = ap.parse_args()

    try:
        head = json.loads(Path(args.content).read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        sys.exit(f"::error::content.json is not valid JSON: {e}")

    problems = schema_errors(head) + validate(head)

    if args.base and Path(args.base).exists():
        base = json.loads(Path(args.base).read_text(encoding="utf-8"))
        gone = removed_titles(base, head)
        if gone and "intentional removal" not in os.environ.get("PR_BODY", "").lower():
            problems += [f"removed vs base: {g}" for g in gone]
            problems.append('If these removals are deliberate, add "intentional removal" '
                            "to the PR description and re-run.")

    for p in problems:
        print(f"::error::{p}")
    if problems:
        sys.exit(1)
    print("content.json OK")


if __name__ == "__main__":
    main()
