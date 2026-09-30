// ═══════════════════════════════════════════════════════
// KNOBS — min-to-max rotary pots, 0–100
// Each .knob carries its value in data-value and shows it through
// --knob-pos (0–1), which console.css turns into the pointer's angle:
// a SWEEP-degree arc centered on 12 o'clock (0 at lower-left, 100 at
// lower-right, like a real potentiometer). The ring of printed ticks
// (one per 10, longer at 0/50/100) is generated here so the markup
// stays one line per knob.
//
// Turning: click/tap anywhere on the knob's tile for +CLICK_STEP
// (wrapping from 100 back to 0), or drag up/down (up = more) — the
// whole tile, not the small knob, for the same 3D-tilt reason as
// js/throttle.js — or the mouse wheel, or arrow/Page/Home/End keys with
// the knob focused.
//
// A knob with data-stat="<name>" is ship state (e.g. Scan), like a
// data-stat lever: it doesn't move itself, it asks for the value via
// 'control:set' (detail: { name, value }) — js/story.js runs it through
// ship.ink's set_<name>() and js/instruments.js then turns the knob to
// wherever the value actually landed. Every other knob keeps its own
// value and dispatches a bubbling 'knob:input' event on the .knob
// (detail: { name, value }, name = its data-name) — nothing listens yet.
// ═══════════════════════════════════════════════════════
(function () {
  const SWEEP = 270;      // degrees from 0 to 100 — matches .knob-pointer
  const TICKS = 10;       // intervals, so TICKS + 1 marks
  const DRAG_PX = 150;    // vertical drag distance for the full range
  const TAP_PX = 4;       // a press that moves less than this is a click
  const CLICK_STEP = 10;
  const WHEEL_STEP = 2;
  const KEY_STEP = 1;
  const PAGE_STEP = 10;

  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

  document.querySelectorAll('.knob').forEach(knob => {
    const target = knob.closest('.tile, .knob-unit') || knob;
    const label = target.querySelector('.tile-label, .side-label');
    const stat = knob.dataset.stat;
    let lastSent = null;

    for (let i = 0; i <= TICKS; i++) {
      const tick = document.createElement('span');
      tick.className = 'knob-tick' + (i % (TICKS / 2) === 0 ? ' major' : '');
      tick.style.transform = `rotate(${-SWEEP / 2 + (i / TICKS) * SWEEP}deg)`;
      knob.appendChild(tick);
    }

    knob.tabIndex = 0;
    knob.setAttribute('role', 'slider');
    knob.setAttribute('aria-valuemin', '0');
    knob.setAttribute('aria-valuemax', '100');
    if (label) knob.setAttribute('aria-label', label.textContent.trim());

    // data-value is the one place the current value lives — for a
    // data-stat knob js/instruments.js keeps it in sync with the story
    const current = () => clamp(parseFloat(knob.dataset.value) || 0);

    function render(value) {
      knob.dataset.value = value;
      knob.style.setProperty('--knob-pos', value / 100);
      knob.setAttribute('aria-valuenow', value);
      knob.title = `${value}`;
    }

    function set(next) {
      next = clamp(next);
      if (stat) {
        if (next === lastSent && next === current()) return;
        lastSent = next;
        document.dispatchEvent(new CustomEvent('control:set', { detail: { name: stat, value: next } }));
        return;
      }
      if (next === current()) return;
      render(next);
      knob.dispatchEvent(new CustomEvent('knob:input', {
        bubbles: true,
        detail: { name: knob.dataset.name, value: next },
      }));
    }

    if (!stat) render(current());

    let drag = null;
    target.addEventListener('pointerdown', e => {
      drag = { y: e.clientY, from: current(), moved: false };
      target.setPointerCapture(e.pointerId);
      knob.classList.add('is-turning');
    });
    target.addEventListener('pointermove', e => {
      if (!drag) return;
      const dy = drag.y - e.clientY;
      if (!drag.moved && Math.abs(dy) < TAP_PX) return;
      drag.moved = true;
      set(drag.from + (dy / DRAG_PX) * 100);
    });
    target.addEventListener('pointerup', () => {
      if (drag && !drag.moved) {
        const from = drag.from;
        set(from >= 100 ? 0 : from + CLICK_STEP);
      }
      drag = null;
      knob.classList.remove('is-turning');
    });
    target.addEventListener('pointercancel', () => {
      drag = null;
      knob.classList.remove('is-turning');
    });

    target.addEventListener('wheel', e => {
      e.preventDefault();
      set(current() + (e.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP));
    }, { passive: false });

    knob.addEventListener('keydown', e => {
      const step = {
        ArrowUp: KEY_STEP, ArrowRight: KEY_STEP,
        ArrowDown: -KEY_STEP, ArrowLeft: -KEY_STEP,
        PageUp: PAGE_STEP, PageDown: -PAGE_STEP,
      }[e.key];
      if (step !== undefined) set(current() + step);
      else if (e.key === 'Home') set(0);
      else if (e.key === 'End') set(100);
      else return;
      e.preventDefault();
    });
  });
})();
