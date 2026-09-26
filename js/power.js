// ═══════════════════════════════════════════════════════
// POWER + FLIGHT — the big button (#launch-tile). The ship boots
// unpowered (see the "unpowered" class already on #cockpit in
// index.html); LAUNCH is the only lit, clickable control until pressed.
//
// The FIRST press is the initial launch out of the silo: no criteria,
// no power spent. It flips #cockpit to "powered", flickers everything
// else to life (css/*.css own the actual dimming/flicker rules, keyed
// off these classes), and fires 'ship:launch' for js/window-scenes.js
// (the ascent) and js/timer.js (the countdown).
//
// After that the button engages flight modes (see ink/story.ink's
// "FLIGHT MODES" header). js/story.js announces 'ship:flight'
// { ordered, engaged, ready }; while the story has ordered a mode the
// ship isn't in, the button asks for it — LAUNCH (thruster/sideSpace,
// pressable once ink's launch_ready() says so: drive charge full) or
// STOP (always pressable) — and a press sends 'control:engage' back to
// story.js, which engages it in ink (and spends the power there). With
// nothing ordered it sits disabled, captioned with the engaged mode
// ("Stopped" right after the ascent — the initial launch doesn't set
// a flight mode).
// data-flight on the tile ("charging" | "ready" | "stop") drives the
// lens color in console.css.
// ═══════════════════════════════════════════════════════
(function () {
  const cockpit = document.getElementById('cockpit');
  const launch = document.getElementById('launch-tile');
  const label = document.getElementById('launch-label');
  const modeEl = document.getElementById('launch-mode');
  if (!cockpit || !launch || !label || !modeEl) return;

  const FLICKER_MS = 1150;
  const MODE_NAMES = { stopped: 'Stopped', thruster: 'Thruster', sideSpace: 'Side Space' };

  let launched = false;
  let flight = null; // last 'ship:flight' detail

  function render() {
    if (!launched || !flight) return;
    const { ordered, engaged, ready } = flight;
    const pending = ordered !== engaged;
    let state = '';
    if (pending) state = ordered === 'stopped' ? 'stop' : ready ? 'ready' : 'charging';

    launch.disabled = !(pending && ready);
    if (state) launch.dataset.flight = state;
    else delete launch.dataset.flight;
    label.textContent = !pending ? MODE_NAMES[engaged] : state === 'stop' ? 'Stop' : 'Launch';
    modeEl.textContent = pending ? `▸ ${MODE_NAMES[ordered]}` : '';
    launch.setAttribute('aria-label', !pending
      ? `Engaged: ${MODE_NAMES[engaged]}`
      : state === 'stop' ? 'Stop'
      : `Launch ${MODE_NAMES[ordered]}${ready ? '' : ' (charge the drive fully first)'}`);
  }

  document.addEventListener('ship:flight', e => {
    flight = e.detail;
    render();
  });

  launch.addEventListener('click', () => {
    if (launched) {
      document.dispatchEvent(new CustomEvent('control:engage'));
      return;
    }
    launched = true;
    cockpit.classList.remove('unpowered');
    cockpit.classList.add('powered', 'flicker');
    launch.disabled = true;
    label.textContent = 'Launched';
    setTimeout(() => cockpit.classList.remove('flicker'), FLICKER_MS);
    render();

    document.dispatchEvent(new CustomEvent('ship:launch'));
  });
})();
