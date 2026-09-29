// ═══════════════════════════════════════════════════════
// KNOBS — min-to-max rotary pots, 0–100
// Each .knob carries its value in data-value. The pointer sweeps
// SWEEP degrees, centered on 12 o'clock (0 at lower-left, 100 at
// lower-right, like a real potentiometer), and a ring of printed ticks
// (one per 10, longer at 0/50/100) is generated around it here so the
// markup stays one line per knob.
//
// Turning: drag up/down (up = more) anywhere on the knob's tile — the
// whole tile, not the small knob, for the same 3D-tilt reason as
// js/throttle.js — or the mouse wheel, or arrow/Page/Home/End keys
// with the knob focused. A plain tap does nothing: a min/max knob has
// no "next position" to click to.
//
// Every change dispatches a bubbling 'knob:input' event on the .knob
// (detail: { name, value }, name = its data-name) — nothing listens
// yet; it's the hook for giving a knob a real job later.
// ═══════════════════════════════════════════════════════
(function () {
  const SWEEP = 270;      // degrees from 0 to 100
  const TICKS = 10;       // intervals, so TICKS + 1 marks
  const DRAG_PX = 150;    // vertical drag distance for the full range
  const WHEEL_STEP = 2;
  const KEY_STEP = 1;
  const PAGE_STEP = 10;

  const angleFor = value => -SWEEP / 2 + (value / 100) * SWEEP;
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

  document.querySelectorAll('.knob').forEach(knob => {
    const pointer = knob.querySelector('.knob-pointer');
    const target = knob.closest('.tile, .knob-unit') || knob;
    const label = target.querySelector('.tile-label, .side-label');
    let value = clamp(parseFloat(knob.dataset.value) || 0);

    for (let i = 0; i <= TICKS; i++) {
      const tick = document.createElement('span');
      tick.className = 'knob-tick' + (i % (TICKS / 2) === 0 ? ' major' : '');
      tick.style.transform = `rotate(${angleFor((i / TICKS) * 100)}deg)`;
      knob.appendChild(tick);
    }

    knob.tabIndex = 0;
    knob.setAttribute('role', 'slider');
    knob.setAttribute('aria-valuemin', '0');
    knob.setAttribute('aria-valuemax', '100');
    if (label) knob.setAttribute('aria-label', label.textContent.trim());

    function render() {
      pointer.style.transform = `rotate(${angleFor(value)}deg)`;
      knob.dataset.value = value;
      knob.setAttribute('aria-valuenow', value);
      knob.title = `${value}`;
    }

    function set(next) {
      next = clamp(next);
      if (next === value) return;
      value = next;
      render();
      knob.dispatchEvent(new CustomEvent('knob:input', {
        bubbles: true,
        detail: { name: knob.dataset.name, value },
      }));
    }

    render();

    let drag = null;
    target.addEventListener('pointerdown', e => {
      drag = { y: e.clientY, from: value };
      target.setPointerCapture(e.pointerId);
      knob.classList.add('is-turning');
    });
    target.addEventListener('pointermove', e => {
      if (drag) set(drag.from + ((drag.y - e.clientY) / DRAG_PX) * 100);
    });
    const end = () => { drag = null; knob.classList.remove('is-turning'); };
    target.addEventListener('pointerup', end);
    target.addEventListener('pointercancel', end);

    target.addEventListener('wheel', e => {
      e.preventDefault();
      set(value + (e.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP));
    }, { passive: false });

    knob.addEventListener('keydown', e => {
      const step = {
        ArrowUp: KEY_STEP, ArrowRight: KEY_STEP,
        ArrowDown: -KEY_STEP, ArrowLeft: -KEY_STEP,
        PageUp: PAGE_STEP, PageDown: -PAGE_STEP,
      }[e.key];
      if (step !== undefined) set(value + step);
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(100);
      else return;
      e.preventDefault();
    });
  });
})();
