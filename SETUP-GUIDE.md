# Setup Guide — start to finish

Follow this once, top to bottom. It takes about 20 minutes.
No coding required. Everything here is free.

**What you'll end up with:** a public website at
`https://shivanshu-siyanwal.github.io` that you update by dropping your CV
into a folder.

---

- [Part 1 — Put the site online](#part-1--put-the-site-online-10-min) *(required)*
- [Part 2 — Turn on auto-updating](#part-2--turn-on-auto-updating-10-min) *(optional but recommended)*
- [Part 3 — Day-to-day use](#part-3--day-to-day-use)
- [Part 4 — Fill in your real links](#part-4--fill-in-your-real-links)
- [Part 5 — When something goes wrong](#part-5--when-something-goes-wrong)

---

# Part 1 — Put the site online (10 min)

### Step 1.1 — Make a GitHub account
Go to <https://github.com/join>. Free. Remember your **username** — it becomes
part of your web address.

> The rest of this guide assumes your username is `shivanshu-siyanwal`.
> Wherever you see that, use your own.

### Step 1.2 — Create the repository
1. Go to <https://github.com/new>
2. **Repository name:** `shivanshu-siyanwal.github.io`
   *(your username, then `.github.io` — this exact pattern gives you the clean web address)*
3. Choose **Public**
4. Leave every checkbox unticked
5. Click **Create repository**

### Step 1.3 — Upload the website files
1. On the empty repository page, click **uploading an existing file**
2. Unzip the folder I gave you
3. Select **everything inside** it and drag it into the browser
   - Drag the *contents*, not the folder itself
4. Scroll down, click **Commit changes**

> **Important:** browsers sometimes silently skip the hidden `.github` folder,
> which contains the automation. After uploading, check whether you can see a
> `.github` folder in your repository's file list.
> If it's missing, do Step 1.3b.

<details>
<summary><b>Step 1.3b — only if the .github folder is missing</b></summary>

The web uploader hides folders starting with a dot. Add it manually:

1. In your repository, click **Add file → Create new file**
2. In the filename box, type exactly:
   `.github/workflows/update-content.yml`
   *(typing the `/` characters creates the folders automatically)*
3. Open `update-content.yml` from the unzipped folder in any text editor,
   copy everything, paste it into the box
4. Click **Commit changes**

Repeat the same process for `scripts/ingest.py` if that's missing too.
</details>

### Step 1.4 — Switch the website on
1. In your repository click **Settings** (top row)
2. In the left sidebar click **Pages**
3. Under **Build and deployment → Source**, choose **Deploy from a branch**
4. Branch: **main**, folder: **/ (root)**
5. Click **Save**

Wait about a minute, then refresh. A green banner shows your live address:

**https://shivanshu-siyanwal.github.io**

✅ Your site is now public. If you stop here, everything works — you'd just
update it by editing `data/content.json` by hand.

---

# Part 2 — Turn on auto-updating (10 min)

This lets you drop your CV in and have the site update itself.

### Step 2.1 — Get a free AI key (Groq)

Groq runs open-source models (Llama) and is free with **no credit card**.

1. Go to <https://console.groq.com>
2. Sign in with Google or GitHub
3. Click **API Keys** in the left sidebar
4. Click **Create API Key**, give it any name
5. **Copy the key immediately** — it's shown only once.
   It looks like `gsk_ABC123...`

> Prefer a different provider? See [Using a different AI provider](#using-a-different-ai-provider) below.
> There's also a fully-offline option with no account at all.

### Step 2.2 — Store the key in GitHub
1. Your repository → **Settings**
2. Left sidebar → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. **Name:** `LLM_API_KEY`   ← must be exactly this
5. **Secret:** paste your `gsk_...` key
6. Click **Add secret**

The key is encrypted. Nobody can read it, including from your public repo.

### Step 2.3 — Let the robot open pull requests
1. Still in **Settings** → left sidebar → **Actions** → **General**
2. Scroll to **Workflow permissions**
3. Select **Read and write permissions**
4. Tick **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

> Miss this step and you'll see a "not permitted" error later. It's the most
> common thing to forget.

### Step 2.4 — Test it
1. Go to the **inbox** folder in your repository
2. **Add file → Create new file**, name it `test.txt`
3. Paste this in:
   ```
   New award: Best Poster Award, National Quantum Symposium, 2026.
   ```
4. **Commit changes**
5. Click the **Actions** tab — you'll see a job running (yellow dot → green tick)
6. After a minute, click the **Pull requests** tab. There's a new PR.
7. Open it, click **Files changed** to see exactly what it wants to add
8. If it looks right: **Merge pull request** → **Confirm merge**
9. A minute later, the award appears on your live site

✅ Automation is working.

---

# Part 3 — Day-to-day use

### Updating with a new CV
1. Repository → **inbox** folder → **Add file → Upload files**
2. Drag in your new CV (`.pdf`, `.tex`, `.docx`, `.txt` — any of these)
3. **Commit changes**
4. Wait ~2 minutes, go to **Pull requests**
5. Skim the changes, click **Merge**

Anything genuinely new gets added. Things already on the site are left alone.

### Updating with just a quick note
You don't need a whole CV. Create a file called `note.txt` in `inbox/` saying:

```
New paper accepted: "Logical Qubit Decoding at Scale",
IEEE QCE 2026, conference paper.

New job: Senior Quantum Engineer at Quantinuum, Cambridge UK,
starting August 2026. Working on error-corrected logical qubits.
```

Plain English is fine.

### Editing something by hand
Open `data/content.json`, click the pencil icon, edit, commit. The site updates
in a minute. Paste the file into <https://jsonlint.com> first if you're unsure —
a missing comma is the only thing that can break the site.

### Adding a photo or a new CV PDF
Upload into the `assets/` folder. To swap the downloadable CV, either keep the
filename `Shivanshu_Siyanwal_CV.pdf` or update `profile.links.cv_pdf` in
`content.json`.

---

# Part 4 — Fill in your real links

The site ships with placeholders. Open `data/content.json` and search for
`REPLACE_ME`:

| What | Where | Looks like |
|---|---|---|
| Google Scholar | `profiles` → `scholar` → `url` | `https://scholar.google.com/citations?user=XXXX` |
| ORCID | `profiles` → `orcid` → `url` and `handle` | `https://orcid.org/0000-0002-1825-0097` |
| ResearchGate | `profiles` → `researchgate` → `url` | `https://www.researchgate.net/profile/Your-Name` |
| Project code/papers | each project → `links` → `url` | your GitHub repo link |
| Paper DOIs | each publication → `doi` | `10.1007/s11128-023-04077-z` |

Also double-check the GitHub and LinkedIn addresses — I guessed those from your CV.

Empty links don't break anything; they just show "coming soon" instead.

### Adding another profile (arXiv, personal blog, Zenodo…)
In `content.json`, inside `profile.profiles`, copy an existing block:

```json
{ "id": "arxiv", "label": "arXiv", "handle": "Preprints",
  "url": "https://arxiv.org/a/yourname", "primary": true, "audience": "academic" }
```

It automatically appears on the home page, the About page, and the footer.

---

# Part 5 — When something goes wrong

**Nothing can break your live site by accident.** The automation checks its work
and stops if anything looks wrong, and nothing publishes until you press Merge.

| Symptom | Cause | Fix |
|---|---|---|
| Action fails: "not permitted to create pull request" | Step 2.3 missed | Do Step 2.3 |
| Action fails: `LLM_API_KEY is not set` | Secret missing or misnamed | Step 2.2; the name must be exactly `LLM_API_KEY` |
| Action fails: "Rate limit hit" | Free tier, too many runs in a minute | Wait 60 seconds → **Actions** → the failed run → **Re-run jobs** |
| Action fails: "Validation failed" | The AI produced something malformed | Nothing was changed. Try re-running, or add the item by hand |
| No pull request appeared | Nothing new was found in your file | Check the Actions log — it lists what it found |
| Site shows an error message | Broken `content.json` | Paste it into <https://jsonlint.com> to find the typo |
| Site didn't update after merging | Still building | Wait 2 minutes, then hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) |

**Undoing a bad merge:** go to your repository's **Commits**, find the bad one,
and click **Revert**. Your site rolls back within a minute.

---

## Using a different AI provider

Groq is the default. To switch, add **repository variables** under
**Settings → Secrets and variables → Actions → Variables tab**:

| Provider | `LLM_PROVIDER` | Free? | Get a key at |
|---|---|---|---|
| **Groq** (default) | `groq` | Yes, no card | <https://console.groq.com> |
| Google Gemini | `gemini` | Yes, free tier | <https://aistudio.google.com> |
| OpenRouter | `openrouter` | Free models available | <https://openrouter.ai> |
| Ollama (your own computer) | `ollama` | Yes, fully offline | <https://ollama.com> |
| Any OpenAI-compatible host | `openai_compat` + `LLM_BASE_URL` | Varies | — |
| Anthropic | `anthropic` | Paid | <https://console.anthropic.com> |

To pick a specific model, add a variable `LLM_MODEL`, e.g.
`llama-3.1-8b-instant` (faster, smaller) or `openai/gpt-oss-120b`.

> **Privacy note:** free tiers generally may train on what you send them.
> Your CV is a public document, so this is normally fine — but if you'd rather
> nothing leaves your machine, use the Ollama option, which runs a model
> locally. In that case run `python scripts/ingest.py` on your own computer
> instead of using the GitHub Action, then commit the result.

### Zero-AI option
You can skip Part 2 entirely. Either edit `data/content.json` directly, or drop
a **partial JSON file** into `inbox/` — those are merged without any AI at all:

```json
{ "awards": [ { "title": "Best Poster, NQS 2026", "year": "2026" } ] }
```

---

## Optional: your own domain name

1. Buy a domain (~$10/year at Namecheap or Cloudflare). Hosting stays free.
2. Repository → **Settings → Pages → Custom domain**, enter it, **Save**
3. At your registrar, add the DNS records GitHub shows you
4. Tick **Enforce HTTPS** once it becomes available

---

## Quick reference

| I want to… | Do this |
|---|---|
| Add a new paper/job/award | Drop a note or CV in `inbox/`, merge the PR |
| Fix a typo | Edit `data/content.json` directly |
| Change my CV PDF | Upload to `assets/` |
| Change colours or fonts | Edit the `:root` block at the top of `style.css` |
| See my site | `https://shivanshu-siyanwal.github.io` |
| Check on the robot | **Actions** tab |
| Approve a change | **Pull requests** tab |
