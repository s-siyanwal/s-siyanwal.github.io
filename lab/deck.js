/* Horizontal decks (home "Research threads", worldline gallery mode) without scroll-jacking.
   A deck is an ordinary overflow-x scroller: the vertical wheel and middle-click autoscroll always move the page
   (nothing pins the section or turns vertical scroll into sideways motion), while sideways travel comes from a
   trackpad, shift + wheel, touch swipe, the arrow keys on the focused deck, or the Previous / Next buttons. */
import { esc, REDUCE } from "./core.js";

/* Controls under a deck: which items are in view, a progress line, and Previous / Next. */
export const deckControls = (what) => `<div class="deck-ctrl">
  <p class="deck-pos micro" aria-live="polite"></p>
  <span class="deck-bar" aria-hidden="true"><span class="deck-fill"></span></span>
  <span class="deck-btns"><button type="button" class="ab-btn" data-deck="-1" aria-label="Previous ${esc(what)}">←</button><button type="button" class="ab-btn" data-deck="1" aria-label="Next ${esc(what)}">→</button></span>
</div>`;

export function wireDeck(deck, ctrl, itemSel) {
  const [back, fwd] = ctrl.querySelectorAll("[data-deck]");
  const pos = ctrl.querySelector(".deck-pos"), fill = ctrl.querySelector(".deck-fill");
  const items = () => [...deck.querySelectorAll(itemSel)];
  const sync = () => {
    const max = deck.scrollWidth - deck.clientWidth, x = deck.scrollLeft;
    back.disabled = x < 4; fwd.disabled = x > max - 4;
    fill.style.transform = `scaleX(${max > 0 ? Math.max(0.04, Math.min(1, x / max)) : 1})`;
    const box = deck.getBoundingClientRect(), its = items();
    const seen = its.map((el, i) => [el.getBoundingClientRect(), i]).filter(([r]) => r.left < box.right - r.width * 0.4 && r.right > box.left + r.width * 0.4).map(([, i]) => i + 1);
    pos.textContent = seen.length ? `${seen[0] === seen[seen.length - 1] ? seen[0] : `${seen[0]}–${seen[seen.length - 1]}`} of ${its.length}` : "";
  };
  const step = (dir) => {
    const first = items()[0], gap = parseFloat(getComputedStyle(first.parentElement).columnGap) || 0;
    deck.scrollBy({ left: dir * ((first ? first.offsetWidth : 320) + gap), behavior: REDUCE ? "auto" : "smooth" });
  };
  back.addEventListener("click", () => step(-1));
  fwd.addEventListener("click", () => step(1));
  deck.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  if (document.fonts) document.fonts.ready.then(sync);
  requestAnimationFrame(sync);
  return sync;
}
