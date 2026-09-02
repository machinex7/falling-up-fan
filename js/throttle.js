// ═══════════════════════════════════════════════════════
// THROTTLE — drag the handle up/down its track (mouse + touch
// via Pointer Events); click-anywhere-on-track also jumps to
// that position
// ═══════════════════════════════════════════════════════
(function () {
  document.querySelectorAll('.throttle-track').forEach(track => {
    const handle = track.querySelector('.throttle-handle');
    let dragging = false;

    function setFromClientY(clientY) {
      const rect = track.getBoundingClientRect();
      const pct = 1 - (clientY - rect.top) / rect.height;
      handle.style.bottom = `${Math.max(0, Math.min(100, pct * 100))}%`;
    }

    track.addEventListener('pointerdown', e => {
      dragging = true;
      track.setPointerCapture(e.pointerId);
      setFromClientY(e.clientY);
    });
    track.addEventListener('pointermove', e => {
      if (dragging) setFromClientY(e.clientY);
    });
    track.addEventListener('pointerup', () => { dragging = false; });
    track.addEventListener('pointercancel', () => { dragging = false; });
  });
})();
