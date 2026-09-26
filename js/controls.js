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
    // data-stat toggles are ship state (e.g. SGNL BST): ask the story to
    // flip it rather than flipping locally — js/instruments.js lights the
    // button once the ink value actually changes.
    if (toggle && tile.dataset.stat) {
      tile.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('control:set', {
          detail: { name: tile.dataset.stat, value: !toggle.classList.contains('is-on') },
        }));
      });
      return;
    }
    if (toggle) {
      tile.addEventListener('click', () => {
        toggle.classList.toggle('is-on');
        tile.classList.toggle('is-on', toggle.classList.contains('is-on'));
      });
      return;
    }
    // Turn only the .knob-pointer layer, never .knob itself: the knob's
    // background carries the cockpit's fixed specular highlight (see
    // --light-pos), which has to stay put while the indicator spins.
    const pointer = tile.querySelector('.knob-pointer');
    if (pointer) {
      tile.addEventListener('click', () => {
        const current = pointer.style.transform.match(/-?\d+/);
        const deg = current ? parseInt(current[0], 10) : 0;
        pointer.style.transform = `rotate(${deg + 45}deg)`;
      });
      return;
    }
    // data-stat lamps are driven by ship state (js/instruments.js owns
    // their clicks too), so only the purely decorative ones toggle here
    if (tile.classList.contains('alert') && !tile.dataset.stat) {
      tile.addEventListener('click', () => tile.classList.toggle('is-alert'));
    }
  });
})();
