// ═══════════════════════════════════════════════════════
// THROTTLE — drag the handle up/down its track (mouse + touch
// via Pointer Events); click-anywhere-on-track also jumps to
// that position
//
// A track with data-stat="<name>" is a ship-state lever instead: it
// doesn't move its own handle, it asks for that value via a
// 'control:set' event (detail: { name, value }) — js/story.js applies
// the story's rules (e.g. shield can't exceed reactor) and
// js/instruments.js then positions the handle wherever the value
// actually landed (via --lever-pos; see .lever in console.css).
// ═══════════════════════════════════════════════════════
(function () {
  document.querySelectorAll('.throttle-track').forEach(track => {
    const handle = track.querySelector('.throttle-handle');
    const stat = track.dataset.stat;
    let dragging = false;
    let lastSent = null;

    function setFromClientY(clientY) {
      const rect = track.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, (1 - (clientY - rect.top) / rect.height) * 100));
      if (!stat) {
        handle.style.bottom = `${pct}%`;
        return;
      }
      const value = Math.round(pct);
      if (value === lastSent) return;
      lastSent = value;
      document.dispatchEvent(new CustomEvent('control:set', { detail: { name: stat, value } }));
    }

    // Listen on the whole tile, not just the narrow track: the console's
    // 3D tilt shifts where the track actually renders, so a press near
    // its ends can land on the tile's label instead (see AGENTS.md's
    // "3D transforms break naive click targeting"). The value still
    // comes from the pointer's height against the track itself.
    const target = track.closest('.tile') || track;
    target.addEventListener('pointerdown', e => {
      dragging = true;
      target.setPointerCapture(e.pointerId);
      setFromClientY(e.clientY);
    });
    target.addEventListener('pointermove', e => {
      if (dragging) setFromClientY(e.clientY);
    });
    target.addEventListener('pointerup', () => { dragging = false; });
    target.addEventListener('pointercancel', () => { dragging = false; });
  });
})();
