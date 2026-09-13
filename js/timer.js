// ═══════════════════════════════════════════════════════
// MISSION TIMER — reads 00:00:15:00 (dd:hh:mi:ss) at rest, then
// counts down once js/power.js dispatches 'ship:launch'. Reaching
// zero is meant to unlock a story event that isn't built yet, so for
// now it just stops ticking there — nothing more to wire up until
// that event exists.
// ═══════════════════════════════════════════════════════
(function () {
  const el = document.getElementById('ro-timer');
  if (!el) return;

  const START_S = 15 * 60;
  let remaining = START_S;

  function render() {
    const pad = n => String(n).padStart(2, '0');
    const d = Math.floor(remaining / 86400);
    const h = Math.floor((remaining % 86400) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    el.textContent = `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  render();

  document.addEventListener('ship:launch', () => {
    const intervalId = setInterval(() => {
      remaining -= 1;
      render();
      if (remaining <= 0) clearInterval(intervalId);
    }, 1000);
  });
})();
