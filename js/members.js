// ═══════════════════════════════════════════════════════
// MEMBERS TIMELINE — the info monitor's members mode. When
// js/monitor.js switches the panel to it ('monitor:mode' with
// mode 'members'), this draws #member-chart: one row per person
// down the side, years along the bottom, and a solid bar per band
// stint showing when they were in it.
//
// Data is data/members.json (one entry per person, each with a
// `groups` array of { name, instruments, years: { from, to } },
// `to: null` meaning "present"). Fetched on the first open only
// and rendered once; later opens just show what's already there.
//
// Bars are positioned in % of the year range, so the chart scales
// with the monitor at any width with no measuring. A stint covers
// from the start of its `from` year to the start of its `to` year
// (so 2001–2024 and 2024–present meet rather than overlap); a
// "present" stint runs to today. On a narrow monitor (phones) each
// name stacks above its bar instead of beside it — see the
// @container rule in css/monitor.css. Each band gets a color by order of
// first appearance (.group-0, .group-1 in css/monitor.css); touring
// stints are drawn hatched instead of solid.
// ═══════════════════════════════════════════════════════
(function () {
  const DATA_URL = 'data/members.json';
  const TICK_EVERY = 5;

  const legendEl = document.getElementById('member-legend');
  const chartEl = document.getElementById('member-chart');
  if (!legendEl || !chartEl) return;

  let loaded = null;

  function now() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const end = new Date(d.getFullYear() + 1, 0, 1);
    return d.getFullYear() + (d - start) / (end - start);
  }

  function yearsLabel(years) {
    return `${years.from}–${years.to ?? 'present'}`;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function render(members) {
    const today = now();
    const earliest = m => Math.min(...m.groups.map(g => g.years.from));
    // Stable sort, so members who joined the same year keep file order.
    const rows = members.slice().sort((a, b) => earliest(a) - earliest(b));

    // Band order (and so color) by who started earliest.
    const bands = [];
    rows.forEach(m => m.groups
      .slice().sort((a, b) => a.years.from - b.years.from)
      .forEach(g => { if (!bands.includes(g.name)) bands.push(g.name); }));

    const min = Math.min(...rows.map(earliest));
    const max = today;
    const pct = year => ((year - min) / (max - min)) * 100;

    legendEl.innerHTML = '';
    bands.forEach((band, i) => {
      const li = el('li');
      li.append(el('span', `legend-swatch group-${i}`), band);
      legendEl.appendChild(li);
    });
    if (rows.some(m => m.groups.some(g => g.touring))) {
      const li = el('li');
      li.append(el('span', 'legend-swatch group-0 is-touring'), 'Touring');
      legendEl.appendChild(li);
    }

    // Year gridlines: one 1px stripe per tick, painted as the
    // background of every track row (and the axis) via --grid-lines.
    const ticks = [];
    for (let y = Math.ceil(min / TICK_EVERY) * TICK_EVERY; y <= max; y += TICK_EVERY) ticks.push(y);
    chartEl.style.setProperty('--grid-lines', ticks
      .map(y => `linear-gradient(to right, transparent calc(${pct(y)}% - 0.5px), var(--grid) 0 calc(${pct(y)}% + 0.5px), transparent 0)`)
      .join(', '));

    chartEl.innerHTML = '';

    rows.forEach(m => {
      const name = el('div', 'member-name', m.name);
      const track = el('div', 'member-track');
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', m.groups
        .map(g => `${g.name}${g.touring ? ' (touring)' : ''}, ${g.instruments.join(', ')}, ${yearsLabel(g.years)}`)
        .join('; '));

      m.groups.forEach(g => {
        const end = g.years.to ?? today;
        const bar = el('span', `member-bar group-${bands.indexOf(g.name)}`);
        if (g.touring) bar.classList.add('is-touring');
        bar.style.left = `${pct(g.years.from)}%`;
        bar.style.width = `${pct(end) - pct(g.years.from)}%`;
        bar.title = `${g.name}${g.touring ? ' (touring)' : ''}\n${g.instruments.join(', ')}\n${yearsLabel(g.years)}`;
        track.appendChild(bar);
      });

      chartEl.append(name, track);
    });

    const axis = el('div', 'member-axis');
    ticks.forEach(y => {
      const tick = el('span', 'member-tick', String(y));
      tick.style.left = `${pct(y)}%`;
      axis.appendChild(tick);
    });
    // The spacer keeps the axis under the bars (column 2) in the
    // side-by-side layout; it's hidden when names stack above bars.
    chartEl.append(el('div', 'member-axis-spacer'), axis);
  }

  function showStatus(message) {
    legendEl.innerHTML = '';
    chartEl.innerHTML = '';
    chartEl.appendChild(el('p', 'monitor-status', message));
  }

  document.addEventListener('monitor:mode', e => {
    if (e.detail.mode !== 'members' || loaded) return;
    showStatus('ACCESSING CREW MANIFEST…');
    loaded = fetch(DATA_URL)
      .then(res => {
        if (!res.ok) throw new Error(`${DATA_URL}: HTTP ${res.status}`);
        return res.json();
      })
      .then(render)
      .catch(err => {
        loaded = null; // let the next open retry
        showStatus('CREW MANIFEST UNAVAILABLE.');
        console.error('members.json failed to load', err);
      });
  });
})();
