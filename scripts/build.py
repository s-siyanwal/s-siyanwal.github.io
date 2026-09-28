#!/usr/bin/env python3
"""
Build the deployable site into _site/ from data/content.json.

What it does
------------
1. Copies the static site (HTML, CSS, JS, data, assets) into _site/.
2. Writes one page per project (project-<id>.html) and turns project.html?id=<id>
   into a redirect to it, so old links keep working.
3. Injects per-page <title>, meta description, canonical URL, Open Graph /
   Twitter tags and JSON-LD structured data.
4. Prerenders every page by running the site's own JS renderers in headless
   Chromium and saving the resulting HTML. Crawlers and link previews (LinkedIn,
   Slack, X) then see real content. The JS still runs in visitors' browsers as
   progressive enhancement (filters, disclosure widgets, motion).
5. Adds favicon.svg, og.png (1200x630 preview image), sitemap.xml, robots.txt
   and 404.html.

The only input is data/content.json; nothing here needs editing for routine
content updates.

Usage
-----
  pip install playwright && python -m playwright install chromium
  python3 scripts/build.py                  # -> _site/
  python3 -m http.server -d _site 8000      # preview the built site

Env
---
  SITE_URL        absolute base URL of the deployed site (set by the Pages workflow)
  CHROMIUM_PATH   optional path to a Chromium binary for Playwright
"""

import functools
import html
import json
import os
import re
import shutil
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_site"
DEFAULT_SITE_URL = "https://s-siyanwal.github.io/shivanshu-siyanwal.github.io"

COPY = ["index.html", "project.html", "publications.html", "about.html",
        "style.css", ".nojekyll", "js", "data", "assets"]
PAGES = ["index.html", "publications.html", "about.html"]

ACCENT = "#1f5c54"
PAPER = "#fbfaf6"
INK = "#1b1a17"


# ------------------------------------------------------------------ helpers
def esc(s):
    return html.escape(str(s or ""), quote=True)


def clip(text, n=158):
    text = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0].rstrip(",;:—-– ")
    return cut + "…"


def real_url(u):
    return bool(u) and u.startswith("http") and "REPLACE_ME" not in u


def jsonld(obj):
    # "</" must not appear inside a <script> block
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False, indent=1).replace("</", "<\\/")
            + "</script>")


# ------------------------------------------------------------------ head tags
def head_block(site, path, title, desc, og_type="website", extra=""):
    url = f"{site}/{path}" if path else f"{site}/"
    img = f"{site}/og.png"
    return f"""<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}"/>
<link rel="canonical" href="{esc(url)}"/>
<link rel="icon" href="favicon.svg" type="image/svg+xml"/>
<meta property="og:type" content="{og_type}"/>
<meta property="og:title" content="{esc(title)}"/>
<meta property="og:description" content="{esc(desc)}"/>
<meta property="og:url" content="{esc(url)}"/>
<meta property="og:image" content="{esc(img)}"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="{esc(title)}"/>
<meta name="twitter:description" content="{esc(desc)}"/>
<meta name="twitter:image" content="{esc(img)}"/>
{extra}"""


def set_head(doc, block):
    doc = re.sub(r"<title>.*?</title>\s*", "", doc, flags=re.S)
    doc = re.sub(r'<meta (name="description"|property="og:[^"]*")[^>]*>\s*', "", doc)
    return doc.replace('initial-scale=1.0"/>\n',
                       'initial-scale=1.0"/>\n' + block + "\n", 1)


def mark_built(doc):
    return doc.replace('<html lang="en">', '<html lang="en" data-built>', 1)


def person_ld(data, site):
    p = data.get("profile", {})
    same = [x["url"] for x in p.get("profiles", []) if real_url(x.get("url"))]
    cur = [e for e in data.get("experience", []) if e.get("current")]
    obj = {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": p.get("name"),
        "jobTitle": p.get("title"),
        "url": f"{site}/",
        "image": f"{site}/og.png",
    }
    if p.get("email"):
        obj["email"] = f"mailto:{p['email']}"
    if same:
        obj["sameAs"] = same
    if cur:
        obj["worksFor"] = {"@type": "Organization", "name": cur[0].get("org")}
    schools = [e.get("school") for e in data.get("education", []) if e.get("school")]
    if schools:
        obj["alumniOf"] = [{"@type": "CollegeOrUniversity", "name": s} for s in schools]
    return obj


def article_ld(pub):
    obj = {"@context": "https://schema.org", "@type": "ScholarlyArticle",
           "headline": pub.get("title")}
    if pub.get("year"):
        obj["datePublished"] = pub["year"]
    authors = re.sub(r"\bet al\.?", "", pub.get("authors") or "")
    names = [a.strip() for a in re.split(r",|\band\b", authors) if a.strip()]
    if names:
        obj["author"] = [{"@type": "Person", "name": n} for n in names]
    if pub.get("venue"):
        obj["isPartOf"] = {"@type": "CreativeWork", "name": pub["venue"]}
    if pub.get("abstract"):
        obj["abstract"] = pub["abstract"]
    if pub.get("doi"):
        obj["sameAs"] = f"https://doi.org/{pub['doi']}"
    return obj


# ------------------------------------------------------------------ static extras
FAVICON = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<rect width="32" height="32" rx="6" fill="{PAPER}"/>
<g stroke="{ACCENT}" stroke-width="2" fill="none" stroke-linecap="round">
<line x1="4" y1="10" x2="28" y2="10"/><line x1="4" y1="22" x2="28" y2="22"/>
<line x1="16" y1="10" x2="16" y2="27"/><circle cx="16" cy="22" r="5"/>
</g>
<circle cx="16" cy="10" r="3" fill="{ACCENT}"/>
</svg>
"""


def og_card(data):
    p = data.get("profile", {})
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"/>
<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Spectral:wght@400&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet"/>
<style>
html,body{{margin:0;width:1200px;height:630px;background:{PAPER};color:{INK}}}
.c{{box-sizing:border-box;height:100%;padding:88px 96px;display:flex;flex-direction:column;justify-content:center;border-left:18px solid {ACCENT}}}
.e{{font:500 26px 'IBM Plex Mono',monospace;color:{ACCENT};letter-spacing:.06em;text-transform:uppercase;margin:0 0 24px}}
h1{{font:500 92px/1.05 Newsreader,Georgia,serif;margin:0 0 28px}}
p{{font:400 34px/1.4 Spectral,Georgia,serif;margin:0;max-width:900px;color:#3b372f}}
</style></head><body><div class="c">
<p class="e">{esc(p.get("title"))}</p>
<h1>{esc(p.get("name"))}</h1>
<p>{esc(clip(p.get("tagline") or p.get("summary"), 120))}</p>
</div></body></html>"""


def not_found(data, site):
    p = data.get("profile", {})
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Page not found — {esc(p.get("name"))}</title>
<meta name="robots" content="noindex"/>
<link rel="icon" href="{site}/favicon.svg" type="image/svg+xml"/>
<link rel="stylesheet" href="{site}/style.css"/>
</head>
<body>
<div class="topbar"><div class="wrap topbar-inner"><a class="topbar-name" href="{site}/">{esc(p.get("name"))}</a></div></div>
<main id="main">
  <header class="page-head">
    <div class="wrap narrow">
      <p class="eyebrow">404</p>
      <h1>Page not found</h1>
      <p class="lede">The page you were looking for isn't here. It may have moved.</p>
      <div class="hero-cta">
        <a class="btn btn--primary" href="{site}/">Home</a>
        <a class="btn" href="{site}/publications.html">Publications</a>
        <a class="btn" href="{site}/about.html">About</a>
      </div>
    </div>
  </header>
</main>
</body>
</html>
"""


REDIRECT = """<script>
(function () {
  var id = new URLSearchParams(location.search).get("id");
  if (id && /^[a-z0-9-]+$/.test(id)) location.replace("project-" + id + ".html");
})();
</script>
"""


# ------------------------------------------------------------------ build steps
def assemble(data, site):
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir()
    for name in COPY:
        src = ROOT / name
        if src.is_dir():
            shutil.copytree(src, OUT / name)
        elif src.exists():
            shutil.copy2(src, OUT / name)

    p = data.get("profile", {})
    name = p.get("name", "")
    about = data.get("about", {})
    pubs = data.get("publications", [])

    home_desc = clip(f"{p.get('title', '')}. {p.get('tagline') or p.get('summary', '')}")
    pages = {
        "index.html": head_block(site, "", f"{name} — {p.get('title', '')}", home_desc,
                                 extra=jsonld(person_ld(data, site))),
        "publications.html": head_block(
            site, "publications.html", f"Publications — {name}",
            clip(f"{len(pubs)} publications, conference papers and posters by {name}: "
                 + "; ".join(x.get("title", "") for x in pubs[:3])),
            extra="\n".join(jsonld(article_ld(x)) for x in pubs)),
        "about.html": head_block(
            site, "about.html", f"About — {name}",
            clip(about.get("headline") or (about.get("statement") or [""])[0]),
            og_type="profile"),
    }
    for page, block in pages.items():
        f = OUT / page
        f.write_text(mark_built(set_head(f.read_text(encoding="utf-8"), block)), encoding="utf-8")

    tmpl = (ROOT / "project.html").read_text(encoding="utf-8")
    written = list(PAGES)
    for pr in data.get("projects", []):
        pid = pr["id"]
        fname = f"project-{pid}.html"
        block = head_block(site, fname, f"{pr.get('name', '')} — {name}",
                           clip(pr.get("blurb") or pr.get("abstract")), og_type="article")
        doc = mark_built(set_head(tmpl, block))
        doc = doc.replace("<body>", f'<body data-project-id="{esc(pid)}">', 1)
        (OUT / fname).write_text(doc, encoding="utf-8")
        written.append(fname)

    # project.html?id=x -> project-x.html; with no/unknown id it still renders the list
    legacy = set_head(tmpl, head_block(site, "project.html", f"Projects — {name}",
                                       clip(f"Project write-ups by {name}.")))
    legacy = legacy.replace('<meta name="viewport"', REDIRECT + '<meta name="viewport"', 1)
    (OUT / "project.html").write_text(mark_built(legacy), encoding="utf-8")

    (OUT / "favicon.svg").write_text(FAVICON, encoding="utf-8")
    (OUT / "404.html").write_text(not_found(data, site), encoding="utf-8")
    (OUT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {site}/sitemap.xml\n",
                                    encoding="utf-8")
    urls = "\n".join(
        f"  <url><loc>{esc(site + '/' + ('' if w == 'index.html' else w))}</loc></url>"
        for w in written)
    (OUT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{urls}\n</urlset>\n", encoding="utf-8")
    return written


def clean_snapshot(doc):
    # The browser added class="js" (reveal gating) and is-in markers at runtime.
    # Strip them so the saved page is fully visible without JS; the live JS re-adds them.
    doc = re.sub(r'(<html[^>]*?) class="js"', r"\1", doc, count=1)
    doc = re.sub(r'\s*\bis-in\b', "", doc)
    doc = doc.replace(' class=""', "")
    return "<!DOCTYPE html>\n" + doc if not doc.lstrip().lower().startswith("<!doctype") else doc


def prerender(pages, og_html):
    from playwright.sync_api import sync_playwright

    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass

    handler = functools.partial(Quiet, directory=str(OUT))
    srv = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{srv.server_address[1]}/"

    kw = {}
    if os.environ.get("CHROMIUM_PATH"):
        kw["executable_path"] = os.environ["CHROMIUM_PATH"]
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(**kw)
            ctx = browser.new_context(reduced_motion="reduce")
            errors = []
            for page_name in pages:
                pg = ctx.new_page()
                pg.on("pageerror", lambda e, n=page_name: errors.append(f"{n}: {e}"))
                pg.goto(base + page_name, wait_until="load")
                pg.wait_for_selector(".topbar-name", timeout=15000)
                pg.wait_for_selector("#footer-slot .footer-name", timeout=15000)
                (OUT / page_name).write_text(clean_snapshot(pg.content()), encoding="utf-8")
                pg.close()
            if errors:
                sys.exit("JS errors while prerendering:\n" + "\n".join(errors))

            pg = browser.new_page(viewport={"width": 1200, "height": 630})
            pg.set_content(og_html, wait_until="load")
            try:
                pg.wait_for_function("document.fonts.status === 'loaded'", timeout=8000)
            except Exception:
                pass  # fonts unreachable (offline): fall back to system serif
            pg.screenshot(path=str(OUT / "og.png"))
            browser.close()
    finally:
        srv.shutdown()


def main():
    data = json.loads((ROOT / "data" / "content.json").read_text(encoding="utf-8"))
    site = (os.environ.get("SITE_URL") or DEFAULT_SITE_URL).rstrip("/")
    pages = assemble(data, site)
    prerender(pages, og_card(data))
    print(f"Built {len(pages)} pages into {OUT.relative_to(ROOT)}/ for {site}")


if __name__ == "__main__":
    main()
