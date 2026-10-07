// ═══════════════════════════════════════════════════════
// STARS — favorite albums and tracks, remembered in a cookie.
// Purely a fan-site convenience: nothing in the story reads them.
//
// Any `.star-btn` carrying `data-star` is a star. js/monitor.js
// renders them (album rows, track rows, and #monitor-star in the
// header) and sets `data-star` to an identity string — "album:<title>"
// or "track:<album title>/<track title>" — and this file does the
// rest: click to toggle, `aria-pressed` reflects the saved state.
// A MutationObserver on #info-monitor syncs stars as monitor.js
// renders rows or re-points the header star, so the two files never
// call each other.
//
// The cookie holds short hashes of those identity strings, not the
// titles: starring the whole catalog by title would blow past a
// cookie's ~4KB limit, while hashes stay ~7 chars each. Hashing the
// titles (not list positions) keeps stars attached to the right
// album/track if albums.json is reordered or extended; renaming a
// title in albums.json does drop its star.
// ═══════════════════════════════════════════════════════
(function () {
  const COOKIE = 'fu_stars';
  const MAX_AGE = 400 * 24 * 60 * 60; // browsers cap cookie lifetime at 400 days
  const monitor = document.getElementById('info-monitor');
  if (!monitor) return;

  // FNV-1a, 32-bit, as base36 — short, stable, cookie-safe.
  function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(36);
  }

  function readCookie() {
    try {
      const pair = document.cookie.split('; ').find(c => c.startsWith(COOKIE + '='));
      const value = pair ? pair.slice(COOKIE.length + 1) : '';
      return new Set(value ? value.split('.') : []);
    } catch (err) {
      return new Set();
    }
  }

  const starred = readCookie();

  // Rewritten on every toggle, which also renews the expiry, so stars
  // only lapse after 400 days without a change. Scoped to this site's
  // own directory so it doesn't leak to sibling sites on a shared host.
  function writeCookie() {
    const path = location.pathname.replace(/[^/]*$/, '') || '/';
    try {
      document.cookie = starred.size
        ? `${COOKIE}=${[...starred].join('.')}; Max-Age=${MAX_AGE}; Path=${path}; SameSite=Lax`
        : `${COOKIE}=; Max-Age=0; Path=${path}; SameSite=Lax`;
    } catch (err) {
      // cookies blocked: stars still work for this page view
    }
  }

  function sync(btn) {
    btn.setAttribute('aria-pressed', String(starred.has(hash(btn.dataset.star))));
  }

  function syncAll() {
    monitor.querySelectorAll('.star-btn[data-star]').forEach(sync);
  }

  document.addEventListener('click', e => {
    const btn = e.target.closest('.star-btn[data-star]');
    if (!btn) return;
    const key = hash(btn.dataset.star);
    if (starred.has(key)) starred.delete(key);
    else starred.add(key);
    writeCookie();
    // every star for the same album/track, wherever it is on screen
    monitor.querySelectorAll('.star-btn[data-star]').forEach(b => {
      if (b.dataset.star === btn.dataset.star) sync(b);
    });
  });

  new MutationObserver(syncAll).observe(monitor, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-star'],
  });
  syncAll();
})();
