// ═══════════════════════════════════════════════════════
// HUD — the text projected in the window's corners (index.html's
// .hud blocks; the values live in #hud-* spans). Flavor, not
// instruments: nothing here is clickable or warns.
//
//   #hud-waypoint   ink `waypoint` (where we're headed), from 'ship:stat'
//   #hud-proximity  ink `proximity` (what we're near), from 'ship:stat' —
//                   js/story.js holds it back while a launch is pending,
//                   the same way it holds a scene image
//   #hud-velocity   VELOCITY text for the ENGAGED flight mode
//                   ('ship:movement')
//   #hud-coords     made-up galactic longitude/latitude: hashes of the
//                   last scan lock's target phase/freq (ink lock_phase /
//                   lock_freq). Same target, same coordinates; they mean
//                   nothing beyond that.
// ═══════════════════════════════════════════════════════
(function () {
  const el = id => document.getElementById(id);
  const waypoint = el('hud-waypoint');
  const proximity = el('hud-proximity');
  const velocity = el('hud-velocity');
  const coords = el('hud-coords');

  const VELOCITY = {
    stopped: '0.000 AU/HR',
    thruster: '0.842 AU/HR',
    sideSpace: 'Off Scale',
  };

  // a small integer mixer (murmur3's finalizer) so neighboring targets
  // land far apart instead of reading as a sequence
  function hash(n, salt) {
    let h = Math.imul(n + 1, 0x9e3779b1) ^ salt;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    return (h ^ (h >>> 16)) >>> 0;
  }

  const target = { lock_phase: 0, lock_freq: 0 };
  function renderCoords() {
    if (!coords) return;
    const l = (hash(target.lock_phase, 0x2c1b) % 36000) / 100;        // 0–359.99
    const b = (hash(target.lock_freq, 0x51ed) % 18001) / 100 - 90;    // -90–+90
    const sign = b < 0 ? '-' : '+';
    coords.textContent =
      `L ${l.toFixed(2).padStart(6, '0')}° B ${sign}${Math.abs(b).toFixed(2).padStart(5, '0')}°`;
  }
  renderCoords();

  document.addEventListener('ship:stat', e => {
    const { name, value } = e.detail;
    if (name === 'waypoint' && waypoint) waypoint.textContent = value;
    else if (name === 'proximity' && proximity) proximity.textContent = value;
    else if (name in target) {
      target[name] = Math.round(Number(value)) || 0;
      renderCoords();
    }
  });

  document.addEventListener('ship:movement', e => {
    if (velocity) velocity.textContent = VELOCITY[e.detail.mode] ?? VELOCITY.stopped;
  });
})();
