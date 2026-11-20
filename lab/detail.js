/* Site: paper and role deep-dive pages. The text is baked into the HTML by scripts/build.py; this only mounts the
   shared bar, footer, theme switch, curtain transitions and reveal motion. body[data-active] says which nav item is lit. */
import { boot } from "./core.js";

boot({
  page: document.body.dataset.active || "papers",
  fieldMode: 0,
  render() { return {}; },
});
