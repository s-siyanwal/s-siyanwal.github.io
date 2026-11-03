/* Paper and role detail pages: content is baked in by scripts/build.py; this only mounts chrome. */
import { loadData, mountChrome, mountFooter, initReveal } from "./site.js";

loadData()
  .then((data) => { mountChrome(data, document.body.dataset.active || ""); mountFooter(data); initReveal(); })
  .catch(() => { /* page text is static HTML; chrome is optional */ });
