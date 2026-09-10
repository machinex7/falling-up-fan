// ═══════════════════════════════════════════════════════
// WINDOW SCENES — the view through #window is a stack of swappable
// backgrounds (css/scenes.css), not one fixed starfield. This file
// owns the crossfade switch between them and the one transition that
// exists so far: silo -> ascent -> space, played once on the
// 'ship:launch' event (dispatched by js/power.js the first time the
// ship powers on). A future scene (another ship, a constellation, an
// effect) is just another .scene element inside #scene-layer and
// however it decides to call showScene — this file doesn't need to
// know about it in advance.
// ═══════════════════════════════════════════════════════
(function () {
  const layer = document.getElementById('scene-layer');
  const ascent = document.getElementById('scene-ascent');
  const strip = document.getElementById('ascent-strip');
  const space = document.getElementById('scene-space');
  if (!layer || !ascent || !strip || !space) return;

  // keep in sync with the silo-shake/ascent-scroll durations in
  // css/scenes.css
  const SHAKE_MS = 1400;
  const SCROLL_MS = 30000;

  function showScene(scene) {
    layer.querySelectorAll('.scene').forEach(s => s.classList.toggle('is-active', s === scene));
  }

  function playAscent() {
    ascent.classList.add('is-shaking');
    setTimeout(() => {
      ascent.classList.remove('is-shaking');
      strip.classList.add('is-launching');
      setTimeout(() => showScene(space), SCROLL_MS);
    }, SHAKE_MS);
  }

  document.addEventListener('ship:launch', playAscent);
})();
