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
index.html            Home: hero, experience, projects, recent papers
project.html          Project deep-dive  (project.html?id=vqc-fpga)
publications.html     Full bibliography with abstracts + type filter
about.html            Research statement, interests, skills, education
style.css             All styling
js/
  site.js             Shared helpers, nav, footer, scroll reveal
  circuit.js          Animated quantum-circuit hero motif
  index.js  project.js  publications.js  about.js
data/content.json     ★ ALL CONTENT
assets/               CV PDF
inbox/                ← drop files here to update
scripts/ingest.py     Parser/merger (provider-agnostic)
SETUP-GUIDE.md        ★ Step-by-step setup walkthrough
.github/workflows/    The automation
```

**Adding a project automatically creates its page** at
`project.html?id=<its-id>` — no new files, no HTML to write.

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
  "metrics": [ { "value": "6.7×", "label": "vs GPU" } ],
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

1. Create a **public** repo `shivanshu-siyanwal.github.io`.
2. Upload everything here (including the hidden `.github` folder — if drag-and-drop
   skips it, use the git commands below).
3. **Settings → Pages → Deploy from branch → `main` / root.**
4. Live at `https://shivanshu-siyanwal.github.io`.

```bash
git init && git add -A && git commit -m "Portfolio"
git branch -M main
git remote add origin https://github.com/shivanshu-siyanwal/shivanshu-siyanwal.github.io.git
git push -u origin main
```

### Local preview
```bash
python3 -m http.server 8000     # → http://localhost:8000
```
Opening the HTML directly won't work — browsers block `fetch` on `file://`.

---

## 6. Design notes

Academic-paper aesthetic: warm paper ground, ink text, one verdigris accent,
Newsreader/Spectral/IBM Plex Mono. The hero's animated quantum circuit is the
signature element — gates brighten as a pulse sweeps the wires.

Accessibility: keyboard-operable throughout, visible focus rings, correct heading
order, `prefers-reduced-motion` freezes all animation, and reveal animations are
fail-safe (content shows with JS disabled, on print, and via a 2.5s timeout).
Change colors/fonts via the CSS variables at the top of `style.css`.
