// ═══════════════════════════════════════════════════════
// INFO MONITOR — the Albums button (#albums-tile) slides
// #info-monitor in over #forward (css/monitor.css handles the
// actual animation) instead of navigating to tracks.html. This
// file just owns the two-view "traditional website" nav inside
// that panel — an album list and a per-album track list, swapped
// via [hidden] — and the open/close/back wiring. No routing, no
// page loads: everything lives in ALBUM_DATA below.
//
// ALBUM_DATA is filled in from memory, not checked against
// liner notes or a streaming catalog — treat titles, track
// counts/order, and release years as a first draft (the
// .monitor-flag banner in the panel says the same to anyone
// looking at it) and correct anything wrong here directly.
// ═══════════════════════════════════════════════════════
(function () {
  const ALBUM_DATA = [
    {
      title: 'Sound of Renewal',
      year: 2004,
      type: 'LP',
      tracks: [
        'Broken Heart',
        'Broken Flag',
        'Falling Up',
        'Escaped Youth',
        'Discovering Directions',
        'Vine and Branches',
      ],
    },
    {
      title: 'Dawn Escapes',
      year: 2007,
      type: 'LP',
      tracks: [
        'The Dark Horse',
        'Broken Sight',
        'Ambassador',
        'Streetlights',
        'Escape Artist',
      ],
    },
    {
      title: 'Captiva',
      year: 2009,
      type: 'LP',
      tracks: [
        'Bittersweet',
        'Weatherman',
        'Force of Nature',
        'Sad Sun',
        'Broadcasts from Eden',
      ],
    },
    {
      title: 'Your Sparkling Death Cometh',
      year: 2011,
      type: 'EP',
      tracks: [
        'Sad Songs',
        'Panic Blossom',
        'The Pressure Kids',
      ],
    },
    {
      title: 'Fangs!',
      year: 2013,
      type: 'LP',
      tracks: [
        'The Colossus',
        'Sad Cypress',
        'Choke',
        'Dagger',
        'Fevers and Sires',
      ],
    },
    {
      title: 'Hours',
      year: 2018,
      type: 'LP',
      tracks: [
        'Sad Songs, Sad Songs',
        'Panic Room',
        'Midnight',
      ],
    },
  ];

  const monitor = document.getElementById('info-monitor');
  const openBtn = document.getElementById('albums-tile');
  const closeBtn = document.getElementById('monitor-close');
  const backBtn = document.getElementById('monitor-back');
  const titleEl = document.getElementById('monitor-title');
  const albumListEl = document.getElementById('album-list');
  const trackViewEl = document.getElementById('track-view');
  const trackMetaEl = document.getElementById('track-meta');
  const trackListEl = document.getElementById('track-list');
  if (!monitor || !openBtn || !closeBtn || !backBtn || !titleEl ||
      !albumListEl || !trackViewEl || !trackMetaEl || !trackListEl) return;

  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map(word => word[0])
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }

  function renderAlbumList() {
    albumListEl.innerHTML = '';
    ALBUM_DATA.forEach(album => {
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

  function showTracks(album) {
    titleEl.textContent = album.title;
    trackMetaEl.textContent = `${album.year} · ${album.type} · ${album.tracks.length} tracks`;
    trackListEl.innerHTML = '';
    album.tracks.forEach(track => {
      const li = document.createElement('li');
      li.textContent = track;
      trackListEl.appendChild(li);
    });
    albumListEl.hidden = true;
    trackViewEl.hidden = false;
    backBtn.hidden = false;
  }

  function showAlbumList() {
    titleEl.textContent = 'Albums';
    trackViewEl.hidden = true;
    albumListEl.hidden = false;
    backBtn.hidden = true;
  }

  function openMonitor() {
    renderAlbumList();
    showAlbumList();
    monitor.classList.add('is-open');
    monitor.setAttribute('aria-hidden', 'false');
    openBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMonitor() {
    monitor.classList.remove('is-open');
    monitor.setAttribute('aria-hidden', 'true');
    openBtn.setAttribute('aria-expanded', 'false');
  }

  openBtn.addEventListener('click', openMonitor);
  closeBtn.addEventListener('click', closeMonitor);
  backBtn.addEventListener('click', showAlbumList);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && monitor.classList.contains('is-open')) closeMonitor();
  });
})();
