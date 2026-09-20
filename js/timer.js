// ═══════════════════════════════════════════════════════
// MISSION TIMER — reads 00:00:15:00 (dd:hh:mi:ss) at rest, then
// counts down once js/power.js dispatches 'ship:launch'. Reaching
// zero dispatches 'timer:complete' for js/cutscenes.js to pick up —
// same loose, no-shared-state event pattern as 'ship:launch'.
//
// The countdown isn't strictly one-shot: js/cutscenes.js can restart
// it partway through a mission (a scene's own `countdown` field, once
// that scene is done) by dispatching 'timer:start' with a new
// duration in seconds. startCountdown() is the one place both
// 'ship:launch' and 'timer:start' funnel through, so a restart is
// exactly "the same countdown, from a different number" rather than
// separate code paths.
// ═══════════════════════════════════════════════════════
(function () {
  const el = document.getElementById('ro-timer');
  if (!el) return;

  const START_S = 15 * 60;
  let remaining = START_S;
  let intervalId = null;

  function render() {
    const pad = n => String(n).padStart(2, '0');
    const d = Math.floor(remaining / 86400);
    const h = Math.floor((remaining % 86400) / 3600);
    const m = Math.floor((remaining % 3600) / 60);
    const s = remaining % 60;
    el.textContent = `${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`;
  }
  render();

  function startCountdown(seconds) {
    clearInterval(intervalId); // no-op the first time (ship:launch), guards a scene restarting mid-tick
    remaining = seconds;
    render();
    intervalId = setInterval(() => {
      remaining -= 1;
      render();
      if (remaining <= 0) {
        clearInterval(intervalId);
        document.dispatchEvent(new CustomEvent('timer:complete'));
      }
    }, 1000);
  }

  document.addEventListener('ship:launch', () => startCountdown(START_S));
  document.addEventListener('timer:start', e => startCountdown(e.detail.seconds));
})();
