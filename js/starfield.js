// ═══════════════════════════════════════════════════════
// STARFIELD — canvas lives inside the window, sized to it
// ═══════════════════════════════════════════════════════
(function () {
  const win = document.getElementById('window');
  const cv = document.getElementById('starfield');
  const cx = cv.getContext('2d');
  let W, H, stars = [];

  function resize() {
    W = cv.width  = win.clientWidth;
    H = cv.height = win.clientHeight;
  }

  function makeStars() {
    stars = [];
    const n = Math.round(W * H / 1800);
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2,
        base: Math.random() * 0.7 + 0.15,
        freq: Math.random() * 0.014 + 0.003,
        phase: Math.random() * Math.PI * 2,
        vx: (Math.random() - 0.5) * 0.012,
      });
    }
  }

  let tick = 0;
  function frame() {
    cx.fillStyle = '#05060a';
    cx.fillRect(0, 0, W, H);

    tick++;
    for (const s of stars) {
      const t = Math.sin(tick * s.freq + s.phase);
      const a = s.base * (0.6 + 0.4 * t);
      cx.beginPath();
      cx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      cx.fillStyle = `rgba(220,225,235,${a})`;
      cx.fill();
      s.x += s.vx;
      if (s.x < 0) s.x = W;
      if (s.x > W) s.x = 0;
    }
    requestAnimationFrame(frame);
  }

  const ro = new ResizeObserver(() => { resize(); makeStars(); });
  ro.observe(win);
  resize();
  makeStars();
  frame();
})();
