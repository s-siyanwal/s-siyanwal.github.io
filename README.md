# Shivanshu Siyanwal — Portfolio

A static, self-updating research + engineering portfolio.
Hosted free on GitHub Pages. **You update it by dropping a file into `inbox/`.**

---

## 1. How the automation works

```
Drop a file into  inbox/   (drag-and-drop in GitHub, works from your phone)
        │  commit
        ▼
GitHub Action fires
   ├─ extracts text        .pdf .tex .txt .md .docx .bib .json
   ├─ free LLM pulls out structured items (Groq / Gemini / local Ollama)
   ├─ Python merges them deterministically into data/content.json
   ├─ VALIDATES the result  ── fails? → job errors, site untouched
   └─ opens a PULL REQUEST for you
        ▼
You tap "Merge"  →  site rebuilds in ~60s
```

Nothing goes live until you approve it. If a parse comes out garbled, close the PR
and nothing changed.

### Using it
1. Go to the `inbox/` folder in your repo → **Add file → Upload files**.
2. Drop in your new CV (`.pdf`, `.tex`, whatever) **or** a plain note:
   > `note.txt` — "New paper accepted: 'Title here', IEEE QCE 2026, conference paper."
3. Commit. Wait ~2 min. A PR appears under the **Pull requests** tab.
4. Skim the diff on `data/content.json`, hit **Merge**. Done.

Processed files are moved to `inbox/archive/` automatically.

### One-time setup for the automation
**→ Full click-by-click walkthrough: [SETUP-GUIDE.md](SETUP-GUIDE.md)**

Short version:
1. Free API key at <https://console.groq.com> (open-weight models, default `openai/gpt-oss-120b`, no credit card).
2. Repo → **Settings → Secrets and variables → Actions → New repository secret**
   - Name: `LLM_API_KEY` · Value: your key
3. Repo → **Settings → Actions → General → Workflow permissions** →
   **Read and write permissions**, and tick
   **Allow GitHub Actions to create and approve pull requests**. Save.

Cost: **free**. Groq's free tier needs no card; GitHub Actions is free and
unlimited on public repos.

Other providers (Gemini, OpenRouter, local Ollama, Anthropic) are supported by
setting the `LLM_PROVIDER` repository variable — see SETUP-GUIDE.md.

### How the merge stays safe
The model is used **only to extract items** from your document. It never rewrites
`content.json`. All merging happens deterministically in Python, so existing
entries can't be dropped or reworded by the model, duplicates are detected by
title/role, and blank fields (like a missing DOI) get backfilled on entries you
already have.

> Prefer no automation at all? Just edit `data/content.json` directly in the GitHub
> web editor. Everything still works — the Action is optional convenience.

---

## 2. Structure

```
index.html            Home (the main design): hero, "the question", research threads, qubit, numbers
about.html  path.html  papers.html  cv.html  personal.html   The other pages of the main design
project.html          Research-thread template (built into project-<id>.html; ?id=<id> redirects)
detail.html           Template of the paper-<slug>.html and role-<slug>.html deep dives (main design;
                      text baked in by scripts/build.py, script lab/detail.js)
style.css             Styling of the notes pages and 404 only
js/
  site.js             Shared helpers (also used by the main design); nav and footer of the notes pages
  figures.js          Schematic figures, shared with the project pages
  notes.js            Notes-page renderer
data/content.json     ★ ALL CONTENT
assets/               CV PDF (generated from content.json by scripts/build.py)
lab/                  Code and styles of the main design (the folder kept its old name; the pages
                      themselves sit at the site root). Rendered from data/content.json +
                      data/links.json + data/journey.json. Project pages have Layman/Expert reading levels.
                      core.js (data, nav, contents drawer, sign-offs, Lenis + GSAP motion, curtain),
                      field3d.js (three.js shader background), sphere3d.js (Bloch sphere in the
                      contents panel), qubit3d.js (home "qubit you can steer"), gallery.js (field
                      notes lightbox), deck.js (sideways decks: plain overflow-x scrollers, never scroll-jacked), abstracts/<id>.js (interactive abstract per thread), lab.css.
                      The build writes forwarding pages at /lab/*.html so old /lab/ links still work.
intro/                Home-page intro: wave → measurement → name (WebGL, 2D fallback,
                      reduced-motion fade); all timings/colours in intro/config.js.
                      ?intro=1 forces it, ?intro=0 skips it.
cv/cv-template.tex    LaTeX CV template; scripts/cv_tex.py fills it from content.json
data/links.json       Artifact links per thread and proof links per award (empty = hidden)
data/journey.json     Photos and videos for the Path stages and the Personal page
lab/vendor/           Pinned copies of three.js r160, GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13
                      (licences in lab/vendor/LICENSES.md). No CDN, no build step.
inbox/                ← drop files here to update
scripts/ingest.py     Parser/merger (provider-agnostic)
scripts/build.py      Prerenders the site into _site/ (run by pages.yml)
SETUP-GUIDE.md        ★ Step-by-step setup walkthrough
.github/workflows/    The automation
```

**Adding a project automatically creates its page** at
`project-<its-id>.html` on the next deploy — no new files, no HTML to write.
Old `project.html?id=<its-id>` links redirect there.

**How the live site is built:** on every push to `main`, `pages.yml` runs
`scripts/build.py`. It renders each page with the site's own JS in headless
Chromium and saves the resulting HTML, so search engines and link previews
(LinkedIn, Slack, X) see real content, titles and a preview image. It also writes
`sitemap.xml`, `robots.txt`, `404.html`, `favicon.svg`, `og.png` and JSON-LD
structured data. The JS still runs in the browser for filters and motion.

---

## 3. Editing by hand

Edit `data/content.json`. Validate at <https://jsonlint.com> before committing —
a stray comma is the only thing that can break the site.

**Project** (gets its own page):
```json
{
  "id": "unique-slug",
  "name": "Title",
  "blurb": "One line for the card.",
  "abstract": "Opening paragraph on the project page.",
  "role": "Your role on the work.",
  "sections": [ { "h": "Problem", "p": "..." }, { "h": "Approach", "p": "..." } ],
  "metrics": [ { "value": "4", "label": "Image encodings" } ],
  "tags": ["Qiskit", "FPGA"],
  "audience": "industry",
  "links": [ { "label": "Code", "url": "https://github.com/..." } ],
  "featured": true
}
```
`audience` is `"academic"`, `"industry"`, or `"both"` — it drives the
Research/Engineering filter on the home page.

**Publication:**
```json
{ "venue": "IEEE QCE", "year": "2026", "title": "...", "type": "Conference paper",
  "status": "accepted", "authors": "S. Siyanwal et al.", "doi": "10.xxxx/xxx",
  "abstract": "..." }
```
A real `doi` makes a DOI link appear automatically.

**Job:** copy a block in `experience` — `org`, `role`, `location`, `period`,
`summary` (shown collapsed), `points` (shown expanded), `tags`, `current: true`.

**Profile links** live in `profile.profiles` — add any site (arXiv, personal blog,
Zenodo) by copying one entry. It appears in the hero, the About page, and the footer.

---

## 4. ★ Still to fill in

Search `content.json` for `REPLACE_ME`:

1. **Google Scholar** URL
2. **ORCID** iD (url + handle)
3. **ResearchGate** URL
4. **Project links** — repo/paper URLs (currently empty `""`)
5. **Publication DOIs**
6. Confirm the GitHub/LinkedIn handles guessed from your CV

Empty URLs degrade gracefully — they show "links coming soon" rather than breaking.

---

## 5. Deploy

1. Create a **public** repo `s-siyanwal.github.io`.
2. Upload everything here (including the hidden `.github` folder — if drag-and-drop
   skips it, use the git commands below).
3. **Settings → Pages → Source: GitHub Actions.** `pages.yml` builds and deploys.
4. Live at `https://s-siyanwal.github.io/`
   (a repo with any other name is served under `https://s-siyanwal.github.io/<repo-name>/`).

```bash
git init && git add -A && git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/s-siyanwal/s-siyanwal.github.io.git
git push -u origin main
```

### Local preview
```bash
python3 -m http.server 8000     # → http://localhost:8000  (raw, JS-rendered)

pip install playwright && python -m playwright install chromium
python3 scripts/build.py && python3 -m http.server -d _site 8000   # built site
```
Opening the HTML directly won't work — browsers block `fetch` on `file://`.

---

## 6. Design notes

Direction A, "Interference": warm paper ground, ink text, a verdigris accent with
vermilion for live state, self-hosted Fraunces/Geist/Geist Mono, light and dark
themes (Auto/Light/Dark toggle). The hero circuit is the signature element: one
wire per focus area, a wave packet sweeps the wires and feeds the metric tiles.
Tokens and motion rules are in `DESIGN.md`.

Accessibility: keyboard-operable throughout, visible focus rings, correct heading
order, `prefers-reduced-motion` freezes all animation, and reveal animations are
fail-safe (content shows with JS disabled, on print, and via a 2.5s timeout).
Change colors/fonts via the CSS variables at the top of `style.css`.

---

## How to add a note

`Notes` is a small, secondary section for personal, non-research writing
(habits, essays, creative pieces). It appears only as the last item in the top
bar and as a footer link; it is never featured on the homepage.
While no note is published (every file is `draft: true`), the Notes links are
hidden and `notes.html` is left out of the sitemap; they come back on their own
with the first published note.

1. Create `notes/<slug>.md` (the slug becomes the URL: `note-<slug>.html`).
2. Start it with front matter:
   ```
   ---
   title: My note title
   date: 2026-11-03
   blurb: One line shown on the Notes index.
   ---
   ```
   Add `draft: true` to keep it out of the build.
3. Write the body in Markdown: paragraphs, `##` headings, `-` lists, `>` quotes,
   `**bold**`, `*italic*`, `` `code` ``, `[links](url)`.
4. Commit to `main`. The Pages build lists it on `/notes.html` (newest first)
   and renders the article page.

`notes/example-placeholder.md` is a placeholder showing the format; delete it
once you add a real note.
