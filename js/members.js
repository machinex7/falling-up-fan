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
// two rows of toggle buttons: one per instrument in the data
// (most-played first), and below it one per album in data/albums.json
// (release order, compilations left out). Every selected button ANDs
// together: anyone who hasn't played every selected instrument (in any
// band) and wasn't on every selected album gets their name and bars
// dimmed, and each selected album also draws a marker line at its
// release year. Each row scrolls sideways on its own; the arrow
// buttons either side page through it and disable themselves at
// either end.
//
// Dates can be a plain year (2006) or, where known, a "YYYY-MM" or
// "YYYY-MM-DD" string: a stint's `from`/`to` in members.json, and an
// album's optional `released` in albums.json. An exact `from` starts
// at the start of that month/day, an exact `to` runs to the END of it
// (so "2006-08" means "still in the band through August"). A plain
// `to` year keeps the old convention of ending at the start of that
// year, so back-to-back year stints meet.
//
// Who was on an album: a non-touring stint in the album's `band`
// counts if it covers the release. Each end is compared exactly when
// both that end and the album are exact; otherwise by year, where
// someone leaving in a release year played on it as their last album
// and someone joining that year is taken to have missed it — except
// a band's founding lineup (joined in the band's first year), so a
// debut released in that same year still counts them. Album markers
// sit at the release date, or the start of the year without one, on
// the same scale as the bars.
// ═══════════════════════════════════════════════════════
(function () {
  const DATA_URL = 'data/members.json';
  const ALBUMS_URL = 'data/albums.json';
  const TICK_EVERY = 5;

  const legendEl = document.getElementById('member-legend');
  const chartEl = document.getElementById('member-chart');
  const instrumentListEl = document.getElementById('member-filter-instruments');
  const albumListEl = document.getElementById('member-filter-albums');
  if (!legendEl || !chartEl || !instrumentListEl || !albumListEl) return;

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

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // A plain year or a "YYYY-MM[-DD]" string -> { year, exact, start, end }
  // where start/end are fractional years bounding that day/month/year.
  function when(value) {
    if (typeof value === 'number') return { year: value, exact: false, start: value, end: value };
    const [y, m, d] = value.split('-').map(Number);
    const frac = (mo, day) => {
      const t = new Date(y, mo, day);
      return y + (t - new Date(y, 0, 1)) / (new Date(y + 1, 0, 1) - new Date(y, 0, 1));
    };
    return d
      ? { year: y, exact: true, start: frac(m - 1, d), end: frac(m - 1, d + 1) }
      : { year: y, exact: true, start: frac(m - 1, 1), end: frac(m, 1) };
  }

  function dateLabel(value) {
    if (typeof value === 'number') return String(value);
    const [y, m, d] = value.split('-').map(Number);
    return `${d ? d + ' ' : ''}${MONTHS[m - 1]} ${y}`;
  }

  function yearsLabel(years) {
    return `${dateLabel(years.from)}–${years.to == null ? 'present' : dateLabel(years.to)}`;
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

  function releasedAt(album) {
    return album.released ? when(album.released).start : album.year;
  }

  // See the header comment for the rule.
  function onAlbum(member, album) {
    const y = album.year;
    const rel = album.released ? when(album.released) : null;
    return member.groups.some(g => {
      if (g.name !== album.band || g.touring) return false;
      const from = when(g.years.from);
      const joined = rel && from.exact
        ? from.start <= rel.start
        : from.year < y || from.year === bandStart.get(g.name);
      if (g.years.to == null) return joined;
      const to = when(g.years.to);
      const stayed = rel && to.exact ? rel.start < to.end : y <= to.year;
      return joined && stayed;
    });
  }

  function render([members, albums]) {
    const today = now();
    const earliest = m => Math.min(...m.groups.map(g => when(g.years.from).start));
    // Stable sort, so members who joined the same year keep file order.
    const rows = members.slice().sort((a, b) => earliest(a) - earliest(b));

    // Band order (and so color) by who started earliest.
    const bands = [];
    rows.forEach(m => m.groups
      .slice().sort((a, b) => when(a.years.from).start - when(b.years.from).start)
      .forEach(g => { if (!bands.includes(g.name)) bands.push(g.name); }));

    bandStart = new Map();
    rows.forEach(m => m.groups.forEach(g => {
      bandStart.set(g.name, Math.min(when(g.years.from).year, bandStart.get(g.name) ?? Infinity));
    }));

    const min = Math.floor(Math.min(...rows.map(earliest)));
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
        const from = when(g.years.from).start;
        const end = g.years.to == null ? today
          : when(g.years.to).exact ? when(g.years.to).end : g.years.to;
        const bar = el('span', `member-bar group-${bands.indexOf(g.name)}`);
        if (g.touring) bar.classList.add('is-touring');
        bar.style.left = `${pct(from)}%`;
        bar.style.width = `${pct(end) - pct(from)}%`;
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

    instrumentListEl.innerHTML = '';
    instruments.forEach(instrument => {
      instrumentListEl.appendChild(toggleButton(instrument, selectedInstruments, instrument));
    });
    albumListEl.innerHTML = '';
    albums
      .slice().sort((a, b) => releasedAt(a) - releasedAt(b))
      .forEach(album => {
        const btn = toggleButton(album.title, selectedAlbums, album);
        btn.classList.add('is-album');
        btn.title = `${album.title} (${album.released ? dateLabel(album.released) : album.year})`;
        albumListEl.appendChild(btn);
      });
    applyFilter();
    strips.forEach(s => s.update());
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
        .map(a => `linear-gradient(to right, transparent calc(${pct(releasedAt(a))}% - 1px), var(--album-line) 0 calc(${pct(releasedAt(a))}% + 1px), transparent 0)`)
        .join(', ')
      : 'none');
  }

  // Wires one .filter-row: its two arrows page the strip between them
  // and disable themselves at either end.
  function strip(listEl) {
    const row = listEl.closest('.filter-row');
    const prev = row.querySelector('.filter-arrow[data-dir="-1"]');
    const next = row.querySelector('.filter-arrow[data-dir="1"]');
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = listEl;
      prev.disabled = scrollLeft <= 1;
      next.disabled = scrollLeft + clientWidth >= scrollWidth - 1;
    };
    [prev, next].forEach(btn => btn.addEventListener('click', () => {
      listEl.scrollBy({ left: Number(btn.dataset.dir) * listEl.clientWidth * 0.75, behavior: 'smooth' });
    }));
    listEl.addEventListener('scroll', update, { passive: true });
    // Covers resizes and the bar being unhidden (it measures 0 while hidden).
    new ResizeObserver(update).observe(listEl);
    return { update };
  }
  const strips = [strip(instrumentListEl), strip(albumListEl)];

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
