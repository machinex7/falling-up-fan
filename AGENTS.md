# Agents Guide — Falling Up Fan Site

High-level orientation for future agents working on this repo. Deliberately
avoids specific colors, pixel values, and other styling details — those are
expected to keep changing and would just go stale here.

## What this is

A fan site for the band Falling Up, themed as a spacecraft flight deck /
cockpit. `index.html` is the entire site so far: plain HTML markup that
links out to separate CSS and JS files rather than inlining `<style>` /
`<script>` (no build step, no dependencies beyond a Google Fonts link) —
see "File layout" below for what lives where. Open it directly in a
browser or serve the directory with any static file server; the `css/`
and `js/` files are linked with relative paths, so serving is the safer
option if a bare `file://` open ever runs into relative-path issues.

`members.html`, `tracks.html`, and `connections.html` are linked from the
console but don't exist yet — they're the planned next pages. `Stories.md`
has narrative/world-building notes for the site's fiction if that's ever
relevant to future content.

## File layout

```
index.html          markup only — links the CSS files, loads the JS
                     files at the end of <body>
css/
  base.css           reset, :root palette/spacing variables, html/body
  cockpit.css        shell layout: plaque bar, hull walls, seams,
                     conduits, wall lamps, #forward wrapper
  window.css         the star window: bolts, HUD corner readouts,
                     reticle, canvas sizing
  console.css        the widget deck: #deck-grid, .tile and every
                     widget "face" (readout, gauge, nav-tile, knob,
                     toggle, bar, alert light, throttle, equalizer)
  animations.css     all @keyframes, shared across the files above
  responsive.css     the >=900px media query — kept last on purpose,
                     since it overrides rules defined in the files
                     above and CSS source order decides that fight
js/
  starfield.js       canvas starfield IIFE, sized to #window via
                     ResizeObserver
  controls.js        toggle/knob/alert click handling on .tile
  readouts.js        readout drift (setInterval) + cargo bar fill-in
  throttle.js        pointer-based drag on .throttle-track
```

Split for size/readability, not for reuse or bundling — there's still no
build step. When adding a new widget type, put its CSS in `console.css`
alongside the existing widget faces (don't start a new file per widget),
and give new interaction logic its own small IIFE in `js/`, following the
existing files' pattern, rather than growing one of the existing ones into
a grab-bag. `<link>` tags in `<head>` must keep `responsive.css` last; new
`<script>` tags go at the end of `<body>`, in whatever order matches their
dependencies (none of the current ones depend on each other, but keep that
in mind if a new one starts to).

## Layout architecture

- **Mobile-first.** Base CSS targets phones; `min-width` media queries add
  detail as space allows. Don't design desktop-first and shrink down.
- **Three-column hull**: a narrow angled left wall, a wide forward section,
  a narrow angled right wall — meant to feel like sitting inside a cockpit
  with peripheral walls in view. The side walls use a CSS 3D transform
  (`perspective` + `rotateY`) to look like they wrap around the viewer, at
  every screen size, not just desktop.
- **Forward section** = a star window stacked directly above a control
  console. The console itself is tilted in 3D (`rotateX`, pivoting from its
  bottom edge) so it reads as a dashboard angled up toward the pilot.
- No JS framework. A few small self-contained IIFEs handle the starfield
  canvas, tactile control interactions, and small "live" touches (readout
  drift, etc).

## The console's widget deck

The console's contents (`#deck-grid`) are a **CSS Grid**, not a `<table>`:
table columns force one shared width across every row (widest cell in a
column wins globally), which fights the intentionally dense, uneven,
non-aligned look this panel is going for. Grid gives the same row/col-span
capability via utility classes (`.span-*`, `.rowspan-*`) without that forced
alignment. `grid-auto-flow: dense` lets items pack into gaps rather than
forcing new rows.

Each control is a `.tile` — just a layout wrapper (control + caption),
deliberately *not* a styled card/box. Adding visible per-item backgrounds,
borders, or uniform sizing has been explicitly rejected twice by the user;
the goal is "a dense console full of mysterious controls," closer to a
cluttered real instrument panel than a UI component grid. Widget types
established so far (readout, gauge, nav link, equalizer, knob, toggle,
horizontal bar, alert light, throttle lever) each have their own minimal
"face" styling but share the same plain wrapper pattern — follow that
pattern for new widget types rather than reintroducing a card look.

Widgets that are actual navigation (the Members/Tracks/Connections links)
are visually no more prominent than decorative ones — that's intentional,
not an oversight.

## A real gotcha: 3D transforms break naive click targeting

Because the console is tilted in 3D, a small control's *rendered* position
can drift from its untransformed layout bounding-box center enough that
point-based hit-testing (`elementFromPoint`, and what Playwright's `.click()`
relies on) lands on a sibling or parent instead of the control itself —
this affects real users' clicks too, not just automated tests. The
established fix: bind interactive handlers to the whole `.tile` (a larger,
more reliable target) rather than the tiny inner shape, and give
interactive tiles a bit of invisible padding. If you add a new draggable or
clickable widget, sanity-check it the way prior work did: query
`elementFromPoint` at the element's own computed center and confirm it
resolves back to that element (or a descendant) before trusting it works.

## Testing approach

There's no test suite. Verification so far has been: serve the file with
`python3 -m http.server`, drive it with Playwright (already available via
`/opt/pw-browsers/chromium` + `NODE_PATH=/opt/node22/lib/node_modules`) to
screenshot at a few breakpoints (small phone, phone, tablet, desktop) and to
run small interaction scripts (click a control, check the resulting state
or that hit-testing resolves correctly). Do this before calling a visual or
interactive change done — screenshots are cheap and this UI has broken in
non-obvious ways (see the gotcha above) more than once.

## Other explicit constraints from the user

- Support only modern phones/browsers — no need to accommodate very old or
  very small devices. Modern CSS/JS (`:has()`, `ResizeObserver`, `dvh`,
  Pointer Events, etc.) is fair game.
- Keep the retro/analog "flight deck" material language (metal panels,
  bezels, knobs, toggles, LED-style readouts) consistent across whatever
  gets added next, even as exact colors and spacing continue to shift.
