// ═══════════════════════════════════════════════════════
// PARALLAX — device-tilt drift on a few depth layers against
// the static hull: stars drift the most (behind everything,
// but exaggerated since a real starfield at infinity wouldn't
// move at all — this is a "look through the window" cue, not
// physically literal), the console drifts a little, and the
// armrests — the viewer's own body, nearest thing in frame —
// drift the most of the ship-side elements.
//
// Driven by the DeviceOrientation API (a fused tilt angle) and
// not raw devicemotion/accelerometer samples: those are noisy
// and need integrating to mean anything, while orientation just
// hands back a stable angle already. Applied via the standalone
// CSS `translate` property rather than `transform`, since
// #console and the armrests already carry real 3D transforms
// (rotateX, rotate, clip-path) from the depth work elsewhere —
// `translate` composes with those instead of overwriting them.
//
// iOS 13+ Safari refuses to hand over orientation data without
// an explicit tap first (a privacy gate), so on that platform
// only, #motion-enable (cockpit.css) is revealed and this file
// waits for that tap before attaching anything. Every other
// platform (Android, desktop) attaches straight away — desktop
// simply never fires meaningful deviceorientation events, so
// this is a silent no-op there. Also backs off entirely for
// prefers-reduced-motion, and requires HTTPS (or localhost) per
// browser policy — deviceorientation is a secure-context API.
// ═══════════════════════════════════════════════════════
(function () {
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('DeviceOrientationEvent' in window)) return;

  // [translateX multiplier, translateY multiplier] in px at full tilt.
  // Bigger = reads as nearer. Console + its riser share one multiplier
  // (and always get the exact same offset applied) so the two keep
  // reading as one continuous surface instead of shearing apart at
  // their seam.
  const layers = [
    { el: document.getElementById('starfield'), mx: 16, my: 11 },
    { el: document.querySelector('.armrest.left'), mx: 26, my: 16 },
    { el: document.querySelector('.armrest.right'), mx: 26, my: 16 },
    { el: document.getElementById('console'), mx: 4, my: 2.5 },
    { el: document.querySelector('.console-riser'), mx: 4, my: 2.5 },
  ].filter(layer => layer.el);

  if (!layers.length) return;

  const MAX_DEG = 18; // tilt range (either axis, off the calibrated neutral pose) mapped to full parallax travel — lower than a full comfortable tilt so the effect reaches full travel without needing an extreme angle
  const SMOOTHING = 0.08; // exponential smoothing factor per frame — low-pass filters sensor jitter

  let baseGamma = null;
  let baseBeta = null;
  let targetX = 0;
  let targetY = 0; // normalized -1..1
  let curX = 0;
  let curY = 0;
  let running = false;

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function onOrientation(e) {
    if (e.gamma == null || e.beta == null) return;
    // calibrate off whatever pose the phone happens to be held in when
    // the first reading arrives, so the effect is relative to "however
    // you're holding it right now" rather than an absolute flat-on-a-
    // table orientation
    if (baseGamma === null) {
      baseGamma = e.gamma;
      baseBeta = e.beta;
    }
    const dGamma = clamp(e.gamma - baseGamma, -MAX_DEG, MAX_DEG);
    const dBeta = clamp(e.beta - baseBeta, -MAX_DEG, MAX_DEG);
    targetX = dGamma / MAX_DEG;
    targetY = dBeta / MAX_DEG;
  }

  function frame() {
    curX += (targetX - curX) * SMOOTHING;
    curY += (targetY - curY) * SMOOTHING;
    // negated: the scene drifts opposite the tilt, like looking through
    // a window as your own viewpoint shifts — the common "tilt
    // wallpaper" convention, not a literal physics simulation
    for (const { el, mx, my } of layers) {
      el.style.translate = `${(-curX * mx).toFixed(2)}px ${(-curY * my).toFixed(2)}px`;
    }
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    window.addEventListener('deviceorientation', onOrientation);
    frame();
  }

  if (typeof DeviceOrientationEvent.requestPermission === 'function') {
    const btn = document.getElementById('motion-enable');
    if (!btn) return;
    btn.hidden = false;
    btn.addEventListener('click', () => {
      DeviceOrientationEvent.requestPermission()
        .then(state => {
          btn.hidden = true;
          if (state === 'granted') start();
        })
        .catch(() => { btn.hidden = true; });
    });
  } else {
    start();
  }
})();
