// ═══════════════════════════════════════════════════════
// INSTRUMENTS — everything on the console that shows a ship-state
// percentage (hull/power/reactor/o2, ink VARs announced by js/story.js
// as 'ship:stat' { name, value }). Found by id/attribute convention, so
// a stat just lights up whichever of these exist for it:
//   #ro-<name>                     readout digits ("072%")
//   #gauge-<name>-arc / -text      arc gauge fill + label
//   .tile.alert[data-stat=<name>]  warning light
//
// Warning lights: flash yellow below WARN_BELOW, red below
// CRITICAL_BELOW, off otherwise (data-level on the tile, colored in
// console.css). Clicking a lit one acknowledges it — stops the flash,
// stays lit — until the severity changes, which flashes again.
// ═══════════════════════════════════════════════════════
(function () {
  const WARN_BELOW = 70;
  const CRITICAL_BELOW = 20;
  // keep in sync with the gauge <circle>s' stroke-dasharray in index.html
  const GAUGE_SWEEP = 122.5; // the 270° track's length
  const GAUGE_CIRC = 163.4;  // full circumference

  const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

  function renderReadout(name, v) {
    const el = document.getElementById(`ro-${name}`);
    if (el) el.textContent = String(v).padStart(3, '0') + '%';
  }

  function renderGauge(name, v) {
    const arc = document.getElementById(`gauge-${name}-arc`);
    const text = document.getElementById(`gauge-${name}-text`);
    if (text) text.textContent = `${v}%`;
    if (!arc) return;
    const set = () => {
      const len = GAUGE_SWEEP * v / 100;
      arc.style.animation = 'none';
      arc.style.strokeDasharray = `${len} ${GAUGE_CIRC - len}`;
    };
    // let the page-load power-up fill (a CSS animation, which would
    // override an inline value) finish before taking the arc over
    const running = arc.getAnimations();
    if (running.length) Promise.all(running.map(a => a.finished)).then(set, set);
    else set();
  }

  function renderLamp(name, v) {
    const tile = document.querySelector(`.tile.alert[data-stat="${name}"]`);
    if (!tile) return;
    const level = v < CRITICAL_BELOW ? 'critical' : v < WARN_BELOW ? 'warn' : '';
    if ((tile.dataset.level || '') === level) return; // same severity: keep any ack
    if (level) tile.dataset.level = level;
    else delete tile.dataset.level;
    tile.classList.remove('is-acked');
  }

  document.querySelectorAll('.tile.alert[data-stat]').forEach(tile => {
    tile.addEventListener('click', () => {
      if (tile.dataset.level) tile.classList.add('is-acked');
    });
  });

  document.addEventListener('ship:stat', e => {
    const { name } = e.detail;
    const v = clamp(e.detail.value);
    renderReadout(name, v);
    renderGauge(name, v);
    renderLamp(name, v);
  });
})();
