// ═══════════════════════════════════════════════════════
// INFO MONITOR — the Albums (#albums-tile) and Members
// (#members-tile) buttons slide #info-monitor in over #forward
// (css/monitor.css handles the actual animation) instead of
// navigating to separate pages. This file owns the panel's views,
// swapped via [hidden] — an album list, a per-album track list, a
// per-track lyrics view, and the members timeline — plus the
// open/close/back wiring. No routing, no page loads.
//
// Which button opened the panel is its MODE ('albums' | 'members').
// Entering the members mode dispatches 'monitor:mode' ({ mode })
// so js/members.js can render its timeline into #member-view; this
// file only shows/hides that view and never builds the chart.
//
// Album/track content lives in data/albums.json, not inline
// here, so it's a plain data file to hand-edit — fetched once
// (this needs the site served over http(s); a bare file:// open
// will fail fetch() for a local JSON file in most browsers, per
// AGENTS.md) and cached in `dataPromise` for every open after
// the first. Each track is `{ title, lyrics }`; lyrics are
// placeholder `"TODO"` strings until the real words get filled
// in by hand — this file just displays whatever string is there,
// it doesn't know or care whether it's a placeholder.
// ═══════════════════════════════════════════════════════
(function () {
  const DATA_URL = 'data/albums.json';
  const dataPromise = fetch(DATA_URL).then(res => {
    if (!res.ok) throw new Error(`${DATA_URL}: HTTP ${res.status}`);
    return res.json();
  });

  const monitor = document.getElementById('info-monitor');
  const openBtn = document.getElementById('albums-tile');
  const membersBtn = document.getElementById('members-tile');
  const flagEl = document.getElementById('monitor-flag');
  const memberViewEl = document.getElementById('member-view');
  const memberFilterEl = document.getElementById('member-filter');
  const closeBtn = document.getElementById('monitor-close');
  const backBtn = document.getElementById('monitor-back');
  const titleEl = document.getElementById('monitor-title');
  const albumListEl = document.getElementById('album-list');
  const trackViewEl = document.getElementById('track-view');
  const trackMetaEl = document.getElementById('track-meta');
  const trackListEl = document.getElementById('track-list');
  const lyricsViewEl = document.getElementById('lyrics-view');
  const lyricsMetaEl = document.getElementById('lyrics-meta');
  const lyricsBodyEl = document.getElementById('lyrics-body');
  if (!monitor || !openBtn || !closeBtn || !backBtn || !titleEl ||
      !albumListEl || !trackViewEl || !trackMetaEl || !trackListEl ||
      !lyricsViewEl || !lyricsMetaEl || !lyricsBodyEl ||
      !membersBtn || !flagEl || !memberViewEl || !memberFilterEl) return;

  const VIEWS = [albumListEl, trackViewEl, lyricsViewEl, memberViewEl];
  const FLAGS = {
    albums: 'Catalog cross-checked against public release listings — flag any discrepancy you spot.',
    members: 'Lineup compiled from public band histories — flag any discrepancy you spot.',
  };

  // Hides every view except `el`. The instrument filter bar pinned
  // to the screen's bottom edge belongs to the members view.
  function showView(el) {
    VIEWS.forEach(v => { v.hidden = v !== el; });
    memberFilterEl.hidden = el !== memberViewEl;
  }

  // Which view goBack() should treat as "current" — set at the end of
  // each showX() below rather than inferred from [hidden] state, so
  // goBack doesn't have to re-derive it from the DOM.
  let view = 'albums';
  let currentAlbum = null;

  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }

  function renderAlbumList(albums) {
    albumListEl.innerHTML = '';
    albums.forEach(album => {
      const li = document.createElement('li');
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'album-card';
      card.innerHTML = `
        <span class="album-art" aria-hidden="true">${initials(album.title)}</span>
        <span class="album-info">
          <span class="album-title">${album.title}</span>
          <span class="album-meta">${album.year} &middot; ${album.type} &middot; ${album.tracks.length} tracks</span>
        </span>
      `;
      card.addEventListener('click', () => showTracks(album));
      li.appendChild(card);
      albumListEl.appendChild(li);
    });
  }

  function showStatus(message) {
    albumListEl.innerHTML = `<li class="monitor-status">${message}</li>`;
  }

  function showTracks(album) {
    currentAlbum = album;
    titleEl.textContent = album.title;
    trackMetaEl.textContent = `${album.year} · ${album.type} · ${album.tracks.length} tracks`;
    trackListEl.innerHTML = '';
    album.tracks.forEach(track => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'track-button';
      btn.textContent = track.title;
      btn.addEventListener('click', () => showLyrics(album, track));
      li.appendChild(btn);
      trackListEl.appendChild(li);
    });
    showView(trackViewEl);
    backBtn.hidden = false;
    backBtn.textContent = '← Albums';
    view = 'tracks';
  }

  function showLyrics(album, track) {
    titleEl.textContent = track.title;
    lyricsMetaEl.textContent = album.title;
    lyricsBodyEl.textContent = track.lyrics;
    showView(lyricsViewEl);
    backBtn.hidden = false;
    backBtn.textContent = `← ${album.title}`;
    view = 'lyrics';
  }

  function showAlbumList() {
    titleEl.textContent = 'Albums';
    showView(albumListEl);
    backBtn.hidden = true;
    view = 'albums';
  }

  function showMembers() {
    titleEl.textContent = 'Members';
    showView(memberViewEl);
    backBtn.hidden = true;
    view = 'members';
    document.dispatchEvent(new CustomEvent('monitor:mode', { detail: { mode: 'members' } }));
  }

  function goBack() {
    if (view === 'lyrics') showTracks(currentAlbum);
    else showAlbumList();
  }

  function openMonitor(mode) {
    flagEl.textContent = FLAGS[mode];
    monitor.classList.add('is-open');
    monitor.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', String(mode === 'albums'));
    membersBtn.setAttribute('aria-expanded', String(mode === 'members'));

    if (mode === 'members') {
      showMembers();
      return;
    }
    showAlbumList();
    showStatus('ACCESSING CATALOG…');
    dataPromise
      .then(albums => renderAlbumList(albums))
      .catch(err => {
        showStatus('CATALOG DATA UNAVAILABLE.');
        console.error('albums.json failed to load', err);
      });
  }

  function closeMonitor() {
    monitor.classList.remove('is-open');
    monitor.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
    membersBtn.setAttribute('aria-expanded', 'false');
  }

  openBtn.addEventListener('click', () => openMonitor('albums'));
  membersBtn.addEventListener('click', () => openMonitor('members'));
  closeBtn.addEventListener('click', closeMonitor);
  backBtn.addEventListener('click', goBack);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && monitor.classList.contains('is-open')) closeMonitor();
  });
})();
