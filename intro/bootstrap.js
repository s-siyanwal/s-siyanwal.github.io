/* Big Bang intro bootstrap (home page only, a few hundred bytes). The inline script in the page head has already
   decided whether the intro plays (first visit in this session, or ?intro=1, never while prerendering) and, if so,
   added html.intro-on, which paints a plain vacuum cover until the overlay is ready. This module loads the intro
   on demand and exposes window.__intro.replay() for the "Replay intro" control. */
const root = document.documentElement;
let running = null;

async function start(opts = {}) {
  if (running || window.__PRERENDER__) return;
  window.__introStarted = true;
  root.classList.add("intro-on");
  try {
    const { play } = await import("./controller.js");
    running = play(opts);
    await running;
  } catch (e) {
    console.warn("intro unavailable", e);
    root.classList.remove("intro-on");
  } finally {
    running = null;
  }
}

window.__intro = { replay: () => start({ replay: true }) };
if (root.classList.contains("intro-on")) start();
