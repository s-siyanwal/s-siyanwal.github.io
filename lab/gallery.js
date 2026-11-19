/* Field notes: featured media tiles and a lightbox gallery, both driven by data/journey.json.
   Media item: { type: "image" | "video", src, alt, caption, poster }. Paths are repo paths (assets/media/...).
   The viewer is a native <dialog>: Esc closes it, focus returns to the button that opened it, arrow keys and the
   on-screen buttons step through the items. Videos never autoplay. */
import { esc, hrefOf } from "./core.js";

const isVideo = (m) => m.type === "video" || /\.(mp4|webm|mov)$/i.test(m.src || "");

/* Up to three featured tiles; a quiet "coming soon" frame when there are none yet. */
export function featuredHtml(items = [], { label = "Photos" } = {}) {
  const list = (items || []).filter((m) => m && m.src).slice(0, 3);
  if (!list.length) return `<div class="fn-empty" role="note"><span>${esc(label)} coming soon</span></div>`;
  return `<ul class="fn-featured">${list.map((m) => `<li>${isVideo(m)
    ? `<video src="${esc(hrefOf(m.src))}"${m.poster ? ` poster="${esc(hrefOf(m.poster))}"` : ""} preload="none" muted playsinline aria-label="${esc(m.alt || m.caption || "Video")}"></video>`
    : `<img src="${esc(hrefOf(m.src))}" alt="${esc(m.alt || "")}" loading="lazy" decoding="async"/>`}</li>`).join("")}</ul>`;
}

/* The "Open field notes" button, or nothing when there is nothing to open. */
export function galleryButton(items = [], title = "", key = "") {
  const n = (items || []).filter((m) => m && m.src).length;
  return n ? `<button type="button" class="fn-open" data-gallery="${esc(key)}" data-title="${esc(title)}">Open field notes <span class="fn-n">(${n})</span></button>` : "";
}

let dialog = null;
function ensureDialog() {
  if (dialog) return dialog;
  dialog = document.createElement("dialog");
  dialog.className = "fn-dialog";
  dialog.setAttribute("aria-labelledby", "fn-title");
  dialog.innerHTML = `<div class="fn-head"><p class="micro" id="fn-title"></p><p class="fn-count micro" aria-live="polite"></p>
      <button type="button" class="fn-close">Close<span class="sr"> field notes</span></button></div>
    <div class="fn-stage"></div><p class="fn-cap"></p>
    <div class="fn-nav"><button type="button" class="fn-prev">← Previous</button><button type="button" class="fn-next">Next →</button></div>`;
  document.body.append(dialog);
  dialog.querySelector(".fn-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
  return dialog;
}

export function openGallery(title, items, start = 0, opener = null) {
  const list = (items || []).filter((m) => m && m.src);
  if (!list.length) return;
  const d = ensureDialog();
  let i = Math.max(0, Math.min(start, list.length - 1));
  const stage = d.querySelector(".fn-stage"), cap = d.querySelector(".fn-cap"), count = d.querySelector(".fn-count");
  const show = () => {
    const m = list[i];
    stage.innerHTML = isVideo(m)
      ? `<video src="${esc(hrefOf(m.src))}"${m.poster ? ` poster="${esc(hrefOf(m.poster))}"` : ""} controls preload="metadata" playsinline aria-label="${esc(m.alt || m.caption || "Video")}"></video>`
      : `<img src="${esc(hrefOf(m.src))}" alt="${esc(m.alt || "")}" decoding="async"/>`;
    cap.textContent = m.caption || "";
    count.textContent = `${i + 1} / ${list.length}`;
    d.querySelector(".fn-prev").disabled = list.length < 2;
    d.querySelector(".fn-next").disabled = list.length < 2;
  };
  const step = (k) => { i = (i + k + list.length) % list.length; show(); };
  d.querySelector(".fn-prev").onclick = () => step(-1);
  d.querySelector(".fn-next").onclick = () => step(1);
  d.onkeydown = (e) => { if (e.key === "ArrowLeft") step(-1); else if (e.key === "ArrowRight") step(1); };
  d.onclose = () => { stage.innerHTML = ""; if (opener) opener.focus(); };
  d.querySelector("#fn-title").textContent = `Field notes · ${title}`;
  show();
  d.showModal();
  d.querySelector(".fn-close").focus();
}

/* Wires every [data-gallery] button inside root to its item list (lookup(key) returns the items). */
export function wireGalleries(root, lookup) {
  root.querySelectorAll("[data-gallery]").forEach((b) => b.addEventListener("click", () =>
    openGallery(b.dataset.title || "", lookup(b.dataset.gallery), 0, b)));
}
