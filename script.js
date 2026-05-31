/* script.js — tunap. landing
   The app-screen previews are built at a fixed "design width" so their dense,
   pixel-precise layout stays faithful to the original prototype. Here we scale
   each preview down (or up) with a CSS transform to fit its responsive column,
   and collapse the wrapper height so no extra whitespace is left behind. */

(function () {
  'use strict';

  function scaleShot(shot) {
    var inner = shot.querySelector('.shot__inner');
    var scaleEl = shot.querySelector('.shot__scale');
    if (!inner || !scaleEl) return;

    var designW = inner.offsetWidth;               // fixed design width (px)
    var designH = parseFloat(shot.dataset.h) || inner.offsetHeight;
    var available = shot.clientWidth;
    if (!designW || !available) return;

    var scale = available / designW;
    scaleEl.style.transform = 'scale(' + scale + ')';
    shot.style.height = (designH * scale) + 'px';
  }

  function scaleAll() {
    document.querySelectorAll('.shot').forEach(scaleShot);
  }

  // Recompute when the layout settles and on resize.
  window.addEventListener('load', scaleAll);
  window.addEventListener('resize', debounce(scaleAll, 120));

  // Re-run once fonts are ready (font metrics affect heights).
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scaleAll);
  }

  // Per-element observer keeps previews crisp through any reflow.
  if ('ResizeObserver' in window) {
    var ro = new ResizeObserver(debounce(scaleAll, 60));
    document.querySelectorAll('.shot').forEach(function (s) { ro.observe(s); });
  }

  // Initial pass (in case load already fired).
  scaleAll();

  function debounce(fn, wait) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, wait);
    };
  }
})();
