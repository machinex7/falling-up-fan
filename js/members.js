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
//
// The bar pinned to the screen's bottom edge (#member-filter) holds
// toggle buttons: one per instrument in the data (most-played first),
// then one per album in data/albums.json (release order, compilations
// left out). Every selected button ANDs together: anyone who hasn't
// played every selected instrument (in any band) and wasn't on every
// selected album gets their name and bars dimmed, and each selected
// album also draws a marker line at its release year. The buttons
// scroll sideways; the arrow buttons either side page through them
// and disable themselves at either end.
//
// Who was on an album is inferred from years alone (albums only have
// a year so far): a stint in the album's `band` covers it if the
// member left that year or later, and joined BEFORE that year —
// someone leaving in a release year played on it as their last
// album, someone joining that year is taken to have missed it. The
// one exception is a band's founding lineup (joined in the band's
// first year), so a debut released in that same year still counts
// them. Touring stints never count as being on an album. Release-year markers sit at the start of the year, on the
// same scale as the bars.
// ═══════════════════════════════════════════════════════
(function () {
  const DATA_URL = 'data/members.json';
  const ALBUMS_URL = 'data/albums.json';
  const TICK_EVERY = 5;

  const legendEl = document.getElementById('member-legend');
  const chartEl = document.getElementById('member-chart');
  const filterListEl = document.getElementById('member-filter-list');
  const prevBtn = document.getElementById('member-filter-prev');
  const nextBtn = document.getElementById('member-filter-next');
  if (!legendEl || !chartEl || !filterListEl || !prevBtn || !nextBtn) return;

  let loaded = null;
  // One entry per rendered person: { plays: Set, member, els: [name, ...bars] }.
  let rowEls = [];
  let bandStart = new Map(); // band name -> its first year
  let pct = () => 0;
  const selectedInstruments = new Set();
  const selectedAlbums = new Set(); // album objects from albums.json

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

  function fetchJSON(url) {
    return fetch(url).then(res => {
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      return res.json();
    });
  }

  // See the header comment for the boundary-year rule.
  function onAlbum(member, album) {
    const y = album.year;
    return member.groups.some(g => g.name === album.band && !g.touring &&
      (g.years.from < y || g.years.from === bandStart.get(g.name)) &&
      (g.years.to == null || y <= g.years.to));
  }

  function render([members, albums]) {
    const today = now();
    const earliest = m => Math.min(...m.groups.map(g => g.years.from));
    // Stable sort, so members who joined the same year keep file order.
    const rows = members.slice().sort((a, b) => earliest(a) - earliest(b));

    // Band order (and so color) by who started earliest.
    const bands = [];
    rows.forEach(m => m.groups
      .slice().sort((a, b) => a.years.from - b.years.from)
      .forEach(g => { if (!bands.includes(g.name)) bands.push(g.name); }));

    bandStart = new Map();
    rows.forEach(m => m.groups.forEach(g => {
      bandStart.set(g.name, Math.min(g.years.from, bandStart.get(g.name) ?? Infinity));
    }));

    const min = Math.min(...rows.map(earliest));
    const max = today;
    pct = year => ((year - min) / (max - min)) * 100;

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
    rowEls = [];

    rows.forEach(m => {
      const name = el('div', 'member-name', m.name);
      const track = el('div', 'member-track');
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', m.groups
        .map(g => `${g.name}${g.touring ? ' (touring)' : ''}, ${g.instruments.join(', ')}, ${yearsLabel(g.years)}`)
        .join('; '));

      const bars = m.groups.map(g => {
        const end = g.years.to ?? today;
        const bar = el('span', `member-bar group-${bands.indexOf(g.name)}`);
        if (g.touring) bar.classList.add('is-touring');
        bar.style.left = `${pct(g.years.from)}%`;
        bar.style.width = `${pct(end) - pct(g.years.from)}%`;
        bar.title = `${g.name}${g.touring ? ' (touring)' : ''}\n${g.instruments.join(', ')}\n${yearsLabel(g.years)}`;
        track.appendChild(bar);
        return bar;
      });

      chartEl.append(name, track);
      // The track itself isn't dimmed, only the bars on it, so its
      // gridlines and album markers stay unbroken down the chart.
      rowEls.push({
        member: m,
        plays: new Set(m.groups.flatMap(g => g.instruments)),
        els: [name, ...bars],
      });
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

    renderFilter(rows, albums.filter(a => a.type !== 'Compilation' && a.band));
  }

  function toggleButton(label, set, key) {
    const btn = el('button', 'filter-btn', label);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(set.has(key)));
    btn.addEventListener('click', () => {
      if (set.has(key)) set.delete(key);
      else set.add(key);
      btn.setAttribute('aria-pressed', String(set.has(key)));
      applyFilter();
    });
    return btn;
  }

  function renderFilter(rows, albums) {
    const counts = new Map();
    rows.forEach(m => new Set(m.groups.flatMap(g => g.instruments))
      .forEach(i => counts.set(i, (counts.get(i) || 0) + 1)));
    const instruments = [...counts.keys()]
      .sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b));

    filterListEl.innerHTML = '';
    instruments.forEach(instrument => {
      filterListEl.appendChild(toggleButton(instrument, selectedInstruments, instrument));
    });
    if (albums.length) filterListEl.appendChild(el('span', 'filter-divider'));
    albums
      .slice().sort((a, b) => a.year - b.year)
      .forEach(album => {
        const btn = toggleButton(album.title, selectedAlbums, album);
        btn.classList.add('is-album');
        btn.title = `${album.title} (${album.year})`;
        filterListEl.appendChild(btn);
      });
    applyFilter();
    updateArrows();
  }

  function applyFilter() {
    rowEls.forEach(({ member, plays, els }) => {
      const match = [...selectedInstruments].every(i => plays.has(i)) &&
        [...selectedAlbums].every(a => onAlbum(member, a));
      els.forEach(node => node.classList.toggle('is-dim', !match));
    });
    // A 2px stripe per selected album's release year, painted over
    // every track and the axis (css/monitor.css, .member-track::after).
    chartEl.style.setProperty('--album-lines', selectedAlbums.size
      ? [...selectedAlbums]
        .map(a => `linear-gradient(to right, transparent calc(${pct(a.year)}% - 1px), var(--album-line) 0 calc(${pct(a.year)}% + 1px), transparent 0)`)
        .join(', ')
      : 'none');
  }

  function updateArrows() {
    const { scrollLeft, scrollWidth, clientWidth } = filterListEl;
    prevBtn.disabled = scrollLeft <= 1;
    nextBtn.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
  }

  function page(dir) {
    filterListEl.scrollBy({ left: dir * filterListEl.clientWidth * 0.75, behavior: 'smooth' });
  }

  prevBtn.addEventListener('click', () => page(-1));
  nextBtn.addEventListener('click', () => page(1));
  filterListEl.addEventListener('scroll', updateArrows, { passive: true });
  // Covers resizes and the bar being unhidden (it measures 0 while hidden).
  new ResizeObserver(updateArrows).observe(filterListEl);

  function showStatus(message) {
    legendEl.innerHTML = '';
    chartEl.innerHTML = '';
    chartEl.appendChild(el('p', 'monitor-status', message));
  }

  document.addEventListener('monitor:mode', e => {
    if (e.detail.mode !== 'members' || loaded) return;
    showStatus('ACCESSING CREW MANIFEST…');
    loaded = Promise.all([fetchJSON(DATA_URL), fetchJSON(ALBUMS_URL)])
      .then(render)
      .catch(err => {
        loaded = null; // let the next open retry
        showStatus('CREW MANIFEST UNAVAILABLE.');
        console.error('members/albums data failed to load', err);
      });
  });
})();
