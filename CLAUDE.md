# CLAUDE.md — Portfolio site for Shivanshu Siyanwal

You are working on the personal portfolio of **Shivanshu Siyanwal** ("Shiv"), a
Quantum Software Engineer (Quantum Applications Engineer at CDAC). Your job is to
**harden, improve, and deploy** this site to GitHub Pages.

Read this whole file before touching anything. The "Hard rules" section is not
negotiable; everything else is guidance.

---

## 1. What this site is

- A **static** research + engineering portfolio, hosted free on **GitHub Pages**.
- Serves **two audiences equally**: academic admissions (PhD / research Master's in
  quantum information) and industry Quantum R&D hiring managers. A busy reader
  must be able to evaluate Shiv in 60–90 seconds, with depth one click away.
- **All content lives in `data/content.json`.** Pages are rendered from it by
  vanilla JS modules. No framework, no build step (yet — see Phase 3).
- **Self-updating:** Shiv drops a CV or a note into `inbox/`, a GitHub Action
  extracts items with a **free** LLM (Groq, `openai/gpt-oss-120b` by default),
  deterministic Python merges them into `content.json`, and a **pull request**
  is opened for his review.

### Repository map

```
index.html            Home: hero + animated circuit, metrics, profile links,
                      experience (<details>), project cards with filter, recent papers
project.html          Project deep-dive template; built into project-<id>.html
                      (project.html?id=<id> redirects there on the live site)
publications.html     Full bibliography, abstracts, type filter
about.html            Research statement, interests, training, skills, education
style.css             All styling; design tokens in :root
js/site.js            Shared: data loading, nav, footer, fail-safe scroll reveal
js/circuit.js         Signature element: animated SVG quantum circuit
js/index.js, project.js, publications.js, about.js   Page renderers
data/content.json     ★ Single source of truth for ALL content
assets/               CV PDF
inbox/                Drop zone for updates; processed files → inbox/archive/
scripts/ingest.py     Text extraction + LLM extraction + deterministic merge + validation
scripts/build.py      Prerender into _site/ (headless Chromium runs the JS renderers)
.github/workflows/update-content.yml   The inbox → PR automation
.github/workflows/pages.yml            Build (every PR) + deploy (push to main)
SETUP-GUIDE.md        Beginner walkthrough for Shiv (keep it accurate!)
README.md             Technical overview
```

---

## 2. Hard rules

1. **Stay static.** HTML/CSS/vanilla JS on GitHub Pages. No server, no database,
   no heavy framework. A small build step inside a GitHub Action is acceptable
   (Phase 3) as long as `content.json` remains the only thing Shiv edits.
2. **`data/content.json` is the single source of truth.** Routine updates (new
   paper, job, project, award) must never require editing HTML or JS.
3. **Nothing reaches `main` without Shiv's approval.** Work on branches, open
   pull requests, and explain what changed and why. Never push directly to
   `main`. Never auto-merge the content pipeline's PRs.
4. **The LLM only extracts; Python merges.** Never change `ingest.py` so that a
   model rewrites `content.json` wholesale. Merges must stay deterministic,
   additive, and unable to delete or reword existing entries.
5. **The content pipeline stays free and provider-agnostic.** Default provider is
   Groq. Do not introduce a paid dependency. Anthropic may remain as an optional
   provider only.
6. **Never fabricate facts.** No invented URLs, DOIs, metrics, dates, co-authors,
   or claims. `REPLACE_ME` placeholders stay until Shiv supplies real values.
   If you need information, ask.
7. **Animations must fail safe.** Content must be visible with JS disabled, when
   printing, under `prefers-reduced-motion`, and if IntersectionObserver never
   fires. Preserve the existing pattern (CSS gated on `html.js`, 2.5 s failsafe
   timeout, `beforeprint` handler) in any new motion work.
8. **Accessibility is WCAG 2.2 AA minimum.** Keyboard operable, visible focus,
   correct heading order, AA contrast, meaningful link text, screen-reader-sane
   disclosure widgets.
9. **Keep the aesthetic.** Academic-paper look: warm paper ground (`--paper`),
   ink text, single verdigris accent (`--accent #1f5c54`), Newsreader / Spectral /
   IBM Plex Mono. Minimal and humble, but not bland. No dark "dev portfolio"
   theme, no startup-landing gloss, no stock imagery.
10. **Keep `SETUP-GUIDE.md` true.** If you change any setup step, secret name,
    variable name, or folder, update the guide in the same PR.

---

## 3. Work plan

Do the phases in order. **One PR per phase** (or per coherent sub-task), each with
a clear description and a verification note. Stop and ask Shiv at every **ASK**.

### Phase 0 — Orient (no PR)

- Confirm the repo is named `<github-username>.github.io` and is public. If not,
  tell Shiv; the clean URL depends on it.
- Confirm `.github/workflows/update-content.yml` and `scripts/ingest.py` exist.
  GitHub's web uploader often drops the `.github` folder; if missing, restore it.
- Serve locally (`python3 -m http.server 8000`) and load all four pages. Note any
  console errors. (Google Fonts may 403 inside sandboxes; that is not a site bug.)
- Report a short audit to Shiv before changing code.

### Phase 1 — Fix known defects

These were found in review. Fix each and add a test where sensible.

1. **Broken sort in `ingest.py` → `merge()`.** The nested `yr()` helper uses
   `re.findall` with a capturing group (it returns only `"19"`/`"20"`) wrapped in
   a convoluted expression. Replace it with a clear helper that extracts the
   latest 4-digit year from `period`/`year`, treats `Present`/`Current` as the
   highest value, and sorts `experience`, `research`, and `publications`
   newest-first.
2. **Workflow runs for nothing.** The gate glob `inbox/*.md` matches
   `inbox/README.md`, so the job always proceeds to install tools. Exclude
   `README.md` and `.gitkeep` from the gate.
3. **Stale model and action versions.** Check against current official docs:
   - Groq default model ID (`llama-3.3-70b-versatile`) is still served.
   - Gemini default (`gemini-2.0-flash`) is not deprecated; update if it is.
   - The OpenRouter free model slug still exists.
   - `actions/checkout` and `peter-evans/create-pull-request` are on current
     major versions.
   Update the defaults *and* the provider table in `SETUP-GUIDE.md` together.
4. **Validate content on every PR.** Add `scripts/schema.json` (JSON Schema for
   `content.json`) and a workflow `validate-content.yml` that runs on pull
   requests touching `data/content.json`: schema check, unique project ids,
   required profile fields present, and no accidental deletions vs. `main`
   (fail if an existing experience/publication/project title disappeared,
   unless the PR description says "intentional removal").
5. **Unit tests for the merge.** Add `tests/test_ingest.py` (pytest, **no
   network**) covering: dedupe by role+org and by title, DOI backfill on an
   existing publication, id generation and collision handling, skill union,
   profile fields never overwritten, JSON salvage from fenced or chatty model
   output, and validation rejecting empty experience and duplicate ids.
   Run them in `validate-content.yml`.
6. **CV PDF.** `assets/Shivanshu_Siyanwal_CV.pdf` was compiled with the
   FontAwesome icons stripped out. **ASK** Shiv for his properly built PDF.

### Phase 2 — Go live on GitHub Pages

1. Enable Pages. If you have admin permission:
   `gh api -X POST repos/{owner}/{repo}/pages -f build_type=legacy -f "source[branch]=main" -f "source[path]=/"`
   Otherwise give Shiv the exact clicks:
   **Settings → Pages → Deploy from a branch → main → / (root) → Save.**
2. Workflow permissions (give Shiv the clicks if you can't set them):
   **Settings → Actions → General → Read and write permissions**, and tick
   **Allow GitHub Actions to create and approve pull requests.**
3. Secret `LLM_API_KEY` (a free Groq key from console.groq.com). Never ask Shiv to
   paste the key into chat, a file, or a commit — tell him where to add it:
   **Settings → Secrets and variables → Actions → New repository secret.**
4. Verify the live URL: all four pages load, the CV downloads, every internal
   link resolves, and `project.html?id=<each id>` works.
5. Smoke-test the pipeline: commit a partial-JSON file to `inbox/` (needs no API
   key), confirm a PR opens with a readable summary, then **ASK** Shiv to close it.
   Don't merge test data.

### Phase 3 — Improvements (propose first, build what Shiv approves)

Present these as a short menu with effort estimates before building.

1. **Prerender for SEO and link previews (highest value).** Pages are currently
   filled by client-side JS, so crawlers and LinkedIn/Slack/X previews see empty
   shells with generic titles, and `project.html?id=` pages aren't individually
   indexable. Add `scripts/build.py` that reads `content.json` and writes fully
   rendered static HTML — including `projects/<id>.html` with per-page `<title>`,
   meta description, Open Graph and Twitter tags — into `_site/`. Deploy via a
   `pages.yml` Actions workflow on push to `main`. Keep the JS as progressive
   enhancement (filters, disclosure, motion). Keep old `project.html?id=` URLs
   working via redirect. Update `SETUP-GUIDE.md` Part 1 (Pages source becomes
   "GitHub Actions").
2. **Structured data.** JSON-LD `Person` (with `sameAs` = Scholar, ORCID,
   ResearchGate, GitHub, LinkedIn) on the home page and `ScholarlyArticle` per
   publication.
3. **Identity basics.** Favicon (a small circuit-glyph SVG in the accent colour),
   a generated 1200×630 OG image (name + title on the paper background),
   `sitemap.xml`, `robots.txt`, a styled `404.html`.
4. **Publications polish.** "Copy BibTeX" per paper, generated only from stored
   fields; auto-link DOIs.
5. **Audits.** Run Lighthouse and axe on mobile; target ≥ 95 accessibility and
   SEO, ≥ 90 performance. Fix findings. Use `font-display: swap` or self-host
   fonts if they hurt LCP.
6. **Hero motion refinement (optional).** The circuit is the signature element;
   keep it. Changes must respect Hard rule 7 and stay under ~5 KB of JS.

### Phase 4 — Content (Shiv supplies, you format)

**ASK** Shiv for each of these; never guess:

- Real URLs for Google Scholar, ORCID (iD), and ResearchGate to replace
  `REPLACE_ME`.
- Confirmation of the GitHub and LinkedIn handles (inferred from his CV).
- Repo or paper links for each project; DOIs for published papers.
- Items not yet on the site that he may want added — e.g. his presentation at
  BQIT (Bristol) and the Honorable Mention at the Quandela Q-volution Hackathon
  2026 (Track B, photonic QC) — and whether any current work is public enough to
  list. Some CDAC work may be unpublished or restricted: add nothing he hasn't
  cleared.
- A read-through of the drafted research statement (`about` in `content.json`)
  and the project deep-dives. They were written from his CV and speak in his
  first person.

---

## 4. How to work

- **Branches:** `fix/…`, `feat/…`, `content/…`, `docs/…`.
- **Every PR description:** what changed, why, how you verified it (commands run,
  pages checked, screenshots for visual changes), and anything Shiv must do by hand.
- **Verify before claiming.** Run `python3 -m json.tool data/content.json`,
  `python3 -m pytest -q`, and load pages in a local server or headless browser
  before saying something works.
- **Small, reviewable diffs.** Don't reformat unrelated files.
- **Commands**
  ```bash
  python3 -m http.server 8000                      # preview at http://localhost:8000
  python3 -m pytest -q                             # tests (after Phase 1)
  python3 scripts/ingest.py                        # process inbox/ (needs LLM_API_KEY for non-JSON)
  LLM_PROVIDER=ollama python3 scripts/ingest.py    # fully local, no key
  ```
- **Secrets:** only `LLM_API_KEY` (secret) plus optional repository variables
  `LLM_PROVIDER`, `LLM_MODEL`, `LLM_BASE_URL`. Never print, log, or commit a key.

## 5. Definition of done

- [ ] Site live at `https://<username>.github.io`; all pages load with no console errors
- [ ] Inbox → PR pipeline verified end-to-end; nothing auto-merges
- [ ] `validate-content.yml` and merge tests pass on every PR
- [ ] Pages prerendered with per-page titles and working link previews (if approved)
- [ ] Lighthouse accessibility and SEO ≥ 95 on mobile
- [ ] No `REPLACE_ME` left, or each remaining one listed for Shiv
- [ ] `SETUP-GUIDE.md` and `README.md` match what's actually deployed
