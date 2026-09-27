// ═══════════════════════════════════════════════════════
// STARFIELD — canvas lives inside the window, sized to it
//
// Stars are points in a simple 3D field (x/y in [-1, 1] at depth z = 1,
// z shrinking toward the viewer), projected by dividing by z — so flying
// forward (z decreasing) pushes every star outward from the center of
// the view, faster the closer it gets. How fast depends on the ENGAGED
// flight mode ('ship:movement' from js/story.js — see "Flight modes" in
// AGENTS.md):
//   stopped    still field, just twinkling
//   thruster   a very slow drift outward
//   sideSpace  fast, drawn as streaks (a line from where the star was a
//              moment ago to where it is now) — the warp look
// Speed eases toward the new mode's target rather than jumping, so
// engaging reads as the drive spooling up (and STOP as winding down).
// ═══════════════════════════════════════════════════════
(function () {
  const win = document.getElementById('window');
  const cv = document.getElementById('starfield');
  const cx = cv.getContext('2d');
  let W, H, stars = [];

  // depth units per second
  const SPEEDS = { stopped: 0, thruster: 0.02, sideSpace: 0.9 };
  const EASE = 1.2;        // how quickly speed approaches its target (1/s)
  const STREAK_S = 0.07;   // a streak's length, in seconds of travel
  const STREAK_MIN = 0.15; // speeds below this draw dots, above it lines
  const NEAR = 0.04;       // closer than this, a star is recycled
  const FADE_Z = 0.08;     // recycled stars fade in over this much depth

  let speed = 0;
  let target = 0;

  function resize() {
    W = cv.width  = win.clientWidth;
    H = cv.height = win.clientHeight;
  }

  // x/y are picked inside the view frustum at depth z (|x|, |y| <= z),
  // so every depth shell projects evenly across the whole window
  function place(s, z, fresh) {
    s.z = z;
    s.z0 = z; // depth it started at: size grows relative to this
    s.x = (Math.random() * 2 - 1) * z;
    s.y = (Math.random() * 2 - 1) * z;
    s.fresh = fresh;
  }

  function makeStars() {
    stars = [];
    const n = Math.round(W * H / 1800);
    for (let i = 0; i < n; i++) {
      const s = {
        r: Math.random() * 1.4 + 0.2,
        base: Math.random() * 0.7 + 0.15,
        freq: Math.random() * 0.014 + 0.003,
        phase: Math.random() * Math.PI * 2,
      };
      place(s, 0.15 + Math.random() * 0.85, false);
      stars.push(s);
    }
  }

  const sx = (x, z) => W / 2 + (x / z) * (W / 2);
  const sy = (y, z) => H / 2 + (y / z) * (H / 2);

  let tick = 0;
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    speed += (target - speed) * (1 - Math.exp(-EASE * dt));
    if (Math.abs(speed - target) < 1e-4) speed = target;

    cx.fillStyle = '#05060a';
    cx.fillRect(0, 0, W, H);

    tick++;
    const streaking = speed > STREAK_MIN;
    // streaks fade in with speed instead of popping on at the threshold
    const streakMix = Math.min(1, (speed - STREAK_MIN) / 0.3);
    for (const s of stars) {
      s.z -= speed * dt;
      const x = sx(s.x, s.z);
      const y = sy(s.y, s.z);
      if (s.z < NEAR || x < -4 || x > W + 4 || y < -4 || y > H + 4) {
        place(s, 1, true); // recycled at the far plane
        continue;
      }
      if (s.fresh && s.z0 - s.z >= FADE_Z) s.fresh = false;

      const t = Math.sin(tick * s.freq + s.phase);
      let a = s.base * (0.6 + 0.4 * t);
      if (s.fresh) a *= (s.z0 - s.z) / FADE_Z;
      const r = s.r * Math.min(3, s.z0 / s.z);

      if (streaking) {
        const tz = s.z + speed * STREAK_S; // where it was a moment ago
        cx.beginPath();
        cx.moveTo(sx(s.x, tz), sy(s.y, tz));
        cx.lineTo(x, y);
        cx.lineWidth = Math.max(0.6, r);
        cx.lineCap = 'round';
        cx.strokeStyle = `rgba(200,215,255,${Math.min(1, a * (1 + streakMix))})`;
        cx.stroke();
      } else {
        cx.beginPath();
        cx.arc(x, y, r, 0, Math.PI * 2);
        cx.fillStyle = `rgba(220,225,235,${a})`;
        cx.fill();
      }
    }
    requestAnimationFrame(frame);
  }

  document.addEventListener('ship:movement', e => {
    target = SPEEDS[e.detail.mode] ?? 0;
  });

  const ro = new ResizeObserver(() => { resize(); makeStars(); });
  ro.observe(win);
  resize();
  makeStars();
  requestAnimationFrame(frame);
})();
