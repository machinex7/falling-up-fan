// ═══════════════════════════════════════════════════════
// READOUT DRIFT — small live-feeling number nudges
// ═══════════════════════════════════════════════════════
(function () {
  // ro-power/ro-hull deliberately absent — they're story
  // state now, owned by js/story.js (ink VARs), not decorative drift
  const ids = ['ro-signal'];
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

// (The Cargo bar used to fill to a fixed 72% here; it's the ink `cargo`
// VAR now, drawn by js/instruments.js — its slow CSS width transition
// still gives the same power-up fill on load.)
