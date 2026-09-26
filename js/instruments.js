// ═══════════════════════════════════════════════════════
// INSTRUMENTS — everything on the console that shows a ship-state
// value (hull/power/reactor/shield/... ink VARs plus the computed
// integrity/reactor_load/reactor_use, announced by js/story.js as
// 'ship:stat' { name, value }). Found by
// id/attribute convention, so a stat just lights up whichever of these
// exist for it:
//   #ro-<name>                     readout digits ("072%"; data-unit
//                                  overrides the "%", data-max caps the
//                                  display: over it reads "100+")
//   #gauge-<name>-arc / -text      arc gauge fill + label
//   .tile.alert[data-stat=<name>]  warning light
//   .throttle-track[data-stat=<name>]  lever handle position
//   #bar-<name>                    bar fill width, colored by the same
//                                  THRESHOLDS as the warning lights
//   .tile[data-stat=<name>] .toggle-btn  on/off button (true/false
//                                  stats, e.g. signal_boost)
//
// Warning lights: flash yellow / red when a stat crosses its
// THRESHOLDS (data-level on the tile, colored in console.css) — low is
// bad for most stats, high is bad for reactor use (maxed out). Clicking a lit one acknowledges it — stops the flash,
// stays lit — until the severity changes, which flashes again.
// ═══════════════════════════════════════════════════════
(function () {
  // `below`: warn/critical when the value drops under these.
  // `above`: warn/critical when it climbs over them.
  const THRESHOLDS = {
    default: { below: { warn: 70, critical: 20 } },
    cargo: null, // a fill level, not a health stat — never warns
    // % of the reactor's limit in use: yellow above 80, red at or over
    // the limit (reactor_use is floored, so only a true 100+ is red; it
    // can exceed 100 when overloaded, but displays clamp to 100)
    reactor_use: { above: { warn: 80, critical: 99 } },
  };

  function severity(name, v) {
    const t = name in THRESHOLDS ? THRESHOLDS[name] : THRESHOLDS.default;
    if (!t) return '';
    if (t.below) return v < t.below.critical ? 'critical' : v < t.below.warn ? 'warn' : '';
    return v > t.above.critical ? 'critical' : v > t.above.warn ? 'warn' : '';
  }
  // keep in sync with the gauge <circle>s' stroke-dasharray in index.html
  const GAUGE_SWEEP = 122.5; // the 270° track's length
  const GAUGE_CIRC = 163.4;  // full circumference

  // everything is 0–100 except these
  const MAX = { integrity: 200, signal_strength: 200 };
  const clamp = (name, n) => Math.max(0, Math.min(MAX[name] ?? 100, Math.round(n)));

  function renderReadout(name, v) {
    const el = document.getElementById(`ro-${name}`);
    if (!el) return;
    const max = el.dataset.max ? Number(el.dataset.max) : null;
    el.textContent = max !== null && v > max
      ? `${max}+`
      : String(v).padStart(3, '0') + (el.dataset.unit ?? '%');
  }

  function renderBar(name, v) {
    const fill = document.getElementById(`bar-${name}`);
    if (!fill) return;
    fill.style.width = `${v}%`;
    const level = severity(name, v);
    if (level) fill.dataset.level = level;
    else delete fill.dataset.level;
  }

  function renderToggle(name, on) {
    const tile = document.querySelector(`.tile[data-stat="${name}"]`);
    const btn = tile && tile.querySelector('.toggle-btn');
    if (!btn) return;
    btn.classList.toggle('is-on', on);
    tile.classList.toggle('is-on', on);
  }

  function renderLever(name, v) {
    const handle = document.querySelector(`.throttle-track[data-stat="${name}"] .throttle-handle`);
    if (handle) handle.style.setProperty('--lever-pos', v / 100);
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
    const level = severity(name, v);
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
    if (typeof e.detail.value === 'boolean') {
      renderToggle(name, e.detail.value);
      return;
    }
    const v = clamp(name, e.detail.value);
    renderReadout(name, v);
    renderGauge(name, v);
    renderLamp(name, v);
    renderLever(name, v);
    renderBar(name, v);
  });
})();
