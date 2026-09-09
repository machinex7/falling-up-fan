// ═══════════════════════════════════════════════════════
// POWER — the ship boots unpowered (see the "unpowered" class
// already on #cockpit in index.html); LAUNCH is the only lit,
// clickable control until pressed. Tap it to flip #cockpit to
// "powered" and everything else flickers to life (css/*.css own
// the actual dimming/flicker rules, keyed off these three classes).
// ═══════════════════════════════════════════════════════
(function () {
  const cockpit = document.getElementById('cockpit');
  const launch = document.getElementById('launch-tile');
  const label = document.getElementById('launch-label');
  if (!cockpit || !launch || !label) return;

  const FLICKER_MS = 1150;
  let flickerTimer = null;

  launch.addEventListener('click', () => {
    clearTimeout(flickerTimer);
    cockpit.classList.remove('flicker');

    const poweredOn = cockpit.classList.contains('powered');
    if (poweredOn) {
      cockpit.classList.remove('powered');
      cockpit.classList.add('unpowered');
      launch.setAttribute('aria-pressed', 'false');
      label.textContent = 'Launch';
      return;
    }

    cockpit.classList.remove('unpowered');
    cockpit.classList.add('powered', 'flicker');
    launch.setAttribute('aria-pressed', 'true');
    label.textContent = 'Launched';
    flickerTimer = setTimeout(() => cockpit.classList.remove('flicker'), FLICKER_MS);
  });
})();
