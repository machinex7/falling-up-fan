// ═══════════════════════════════════════════════════════
// CABIN LIGHT — the bulb hanging from the plaque bar (#cabin-light).
// Lit while ink's cabin_lit() is true (the CABIN LT button is on AND
// there's power left — it never spends any; see ink/story.ink), which
// js/story.js announces as 'ship:stat' { name: 'cabin_lit' }. The CABIN
// LT button itself is wired like SGNL BST (controls.js → 'control:set'
// → ink; instruments.js lights it), so this file only owns the bulb.
// Also dark until #cockpit is powered: the ship boots unpowered.
//
// While lit, the bulb IS the light source: every element that paints a
// highlight from --light-pos / --light-angle (see base.css) gets its own
// inline override aimed back at the bulb from wherever it sits on
// screen, so a knob left of center catches light on its upper right,
// one on the right on its upper left. Off, the overrides are removed
// and everything falls back to base.css's default.
// ═══════════════════════════════════════════════════════
(function () {
  const cockpit = document.getElementById('cockpit');
  const light = document.getElementById('cabin-light');
  const bulb = light && light.querySelector('.cabin-light-bulb');
  if (!cockpit || !light || !bulb) return;

  // Everything whose background reads --light-pos/--light-angle (tiles
  // cover their own screws, knobs, buttons, lenses and lever handles by
  // inheritance, so those only need the vars on the tile itself — but
  // wall knobs/buttons sit outside any .tile, and a knob's own center is
  // a better aim than its tile's, so they get their own).
  const LIT_SELECTOR = '.hull, .tile, .knob, .push-btn, .bolt, .rivet, .cabin-light-mount';
  // how far from center the radial highlight sits (base.css's 50% 20%
  // default is 30 points up from center)
  const HIGHLIGHT_OFFSET = 30;

  let cabinLit = false;
  let lit = false;

  function aim() {
    const b = bulb.getBoundingClientRect();
    const bx = b.left + b.width / 2;
    const by = b.top + b.height / 2;
    document.querySelectorAll(LIT_SELECTOR).forEach(el => {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return; // hidden (e.g. a wall tier on phones)
      const dx = r.left + r.width / 2 - bx;
      const dy = r.top + r.height / 2 - by;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      // highlight on the side facing the bulb; gradients run away from it
      // (CSS angles: 0deg = to top, 90deg = to right)
      const x = 50 - ux * HIGHLIGHT_OFFSET;
      const y = 50 - uy * HIGHLIGHT_OFFSET;
      const angle = Math.atan2(ux, -uy) * 180 / Math.PI;
      el.style.setProperty('--light-pos', `${x.toFixed(1)}% ${y.toFixed(1)}%`);
      el.style.setProperty('--light-angle', `${angle.toFixed(1)}deg`);
    });
  }

  function unaim() {
    document.querySelectorAll(LIT_SELECTOR).forEach(el => {
      el.style.removeProperty('--light-pos');
      el.style.removeProperty('--light-angle');
    });
  }

  function render() {
    const next = cabinLit && cockpit.classList.contains('powered');
    if (next === lit) return;
    lit = next;
    light.classList.toggle('is-lit', lit);
    light.setAttribute('aria-label', `Cabin light: ${lit ? 'on' : 'off'}`);
    if (lit) aim();
    else unaim();
  }

  document.addEventListener('ship:stat', e => {
    if (e.detail.name !== 'cabin_lit') return;
    cabinLit = Boolean(e.detail.value);
    render();
  });

  // js/power.js flips #cockpit to "powered" after the launch flicker
  new MutationObserver(render).observe(cockpit, { attributes: true, attributeFilter: ['class'] });

  // layout moves things around the bulb: re-aim while lit
  let raf = 0;
  new ResizeObserver(() => {
    if (!lit || raf) return;
    raf = requestAnimationFrame(() => { raf = 0; aim(); });
  }).observe(document.documentElement);
})();
