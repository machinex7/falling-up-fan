// ═══════════════════════════════════════════════════════
// POWER — the ship boots unpowered (see the "unpowered" class
// already on #cockpit in index.html); LAUNCH is the only lit,
// clickable control until pressed. Tap it to flip #cockpit to
// "powered", flicker everything else to life (css/*.css own the
// actual dimming/flicker rules, keyed off these classes), and fire
// 'ship:launch' for js/window-scenes.js to play the silo-to-space
// ascent. Launching is one-way for now — there's no shutdown/relaunch
// behavior wired up yet — so the button disables itself right after,
// rather than toggling back to "Launch". Revisit this once there's
// somewhere for a second press to go.
// ═══════════════════════════════════════════════════════
(function () {
  const cockpit = document.getElementById('cockpit');
  const launch = document.getElementById('launch-tile');
  const label = document.getElementById('launch-label');
  if (!cockpit || !launch || !label) return;

  const FLICKER_MS = 1150;

  launch.addEventListener('click', () => {
    cockpit.classList.remove('unpowered');
    cockpit.classList.add('powered', 'flicker');
    launch.disabled = true;
    label.textContent = 'Launched';
    setTimeout(() => cockpit.classList.remove('flicker'), FLICKER_MS);

    document.dispatchEvent(new CustomEvent('ship:launch'));
  });
})();
