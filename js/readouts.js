// ═══════════════════════════════════════════════════════
// READOUT DRIFT — small live-feeling number nudges
// ═══════════════════════════════════════════════════════
(function () {
  // ro-hull deliberately absent — it's story state now, owned by
  // js/story.js (the ink `hull` variable), not decorative drift
  const ids = ['ro-power', 'ro-signal'];
  setInterval(() => {
    const id = ids[Math.floor(Math.random() * ids.length)];
    const el = document.getElementById(id);
    if (!el) return;
    let val = parseInt(el.textContent, 10);
    val += Math.random() > 0.5 ? 1 : -1;
    val = Math.max(60, Math.min(100, val));
    el.textContent = String(val).padStart(3, '0') + '%';
  }, 2600);
})();

// ═══════════════════════════════════════════════════════
// BAR FILL — animate to its target width after mount, same
// power-up feel as the arc gauges
// ═══════════════════════════════════════════════════════
(function () {
  const fill = document.getElementById('bar-cargo');
  if (!fill) return;
  requestAnimationFrame(() => {
    setTimeout(() => { fill.style.width = '72%'; }, 200);
  });
})();
