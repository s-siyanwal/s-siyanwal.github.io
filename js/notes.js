/* Notes pages (index + articles): content is baked in by scripts/build.py; this only mounts chrome. */
import { loadData, mountChrome, mountFooter, initReveal } from "./site.js";

loadData()
  .then((data) => { mountChrome(data, "notes"); mountFooter(data); initReveal(); })
  .catch(() => { /* article text is static HTML; chrome is optional */ });
