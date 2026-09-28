# Drop files here to update the site

Upload your new CV or a note about a new item, then commit.
A GitHub Action parses it, merges it into `data/content.json`, and opens a
pull request for you to review and merge.

Accepted: `.pdf` `.tex` `.txt` `.md` `.docx` `.bib` `.json`

See ../SETUP-GUIDE.md for the full walkthrough.

Examples:
- `Shivanshu_CV_2026.pdf` — full CV; new items get merged in
- `note.txt` — "New paper accepted: 'Title', IEEE QCE 2026, conference paper."
- `content.json` — replaces the content file wholesale (no API cost)

Processed files move to `archive/` automatically.
