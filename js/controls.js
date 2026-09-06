// ═══════════════════════════════════════════════════════
// TACTILE CONTROLS — toggles click on/off, knobs click-turn
// Bound to the whole .tile (not just the small inner shape): the
// console is tilted in 3D, so a tiny knob/toggle's painted position
// can drift from its layout center enough that point-hit-testing
// misses it — the full tile is a reliable, larger target either way.
// ═══════════════════════════════════════════════════════
(function () {
  document.querySelectorAll('.tile').forEach(tile => {
    const toggle = tile.querySelector('.toggle-btn');
    if (toggle) {
      tile.addEventListener('click', () => {
        toggle.classList.toggle('is-on');
        tile.classList.toggle('is-on', toggle.classList.contains('is-on'));
      });
      return;
    }
    const knob = tile.querySelector('.knob');
    if (knob) {
      tile.addEventListener('click', () => {
        const current = knob.style.transform.match(/-?\d+/);
        const deg = current ? parseInt(current[0], 10) : 0;
        knob.style.transform = `rotate(${deg + 45}deg)`;
      });
      return;
    }
    if (tile.classList.contains('alert')) {
      tile.addEventListener('click', () => tile.classList.toggle('is-alert'));
    }
  });
})();
