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
deliberately *not* a styled card/box, with one deliberate exception: the
`.push-btn` pushbutton face (see below) is a real visible box by explicit
user request, used for the nav keys and the toggles. Everything else —
readouts, gauges, knobs, the bar, alert lights, the throttle — stays a bare
face with no card/background, since uniform per-item boxing for *those* has
been explicitly rejected by the user; the goal for them is still "a dense
console full of mysterious controls," closer to a cluttered real instrument
panel than a UI component grid. Widget types established so far (readout,
gauge, nav pushbutton, equalizer, knob, toggle pushbutton, horizontal bar,
alert light, throttle lever) each have their own "face" styling but share
the same plain `.tile` wrapper pattern (control + caption below) — follow
that pattern for new widget types, and reach for `.push-btn` only when a
control is genuinely meant to look like a physical button, not as a
default card look for everything.

The nav links (Members/Tracks/Connections) are now visually prominent
pushbuttons — a deliberate reversal of an earlier "no more prominent than
decorative" rule, changed by explicit user request. Toggles
(Auto/Beacon/Shield/etc.) are also `.push-btn`s now: a round pushbutton you
click to latch on/off, not the sliding lever-in-a-slot design from earlier
— also an explicit user request, not an oversight if you see it differ
from older screenshots or commit history.

`.push-btn` models a real panel-mount pushbutton/indicator as two parts,
per a reference photo the user pointed to: a raised black plastic bezel
(hard, near-black — `--plastic-*` in base.css, distinct from the polished
knob metal and the bluish `--bezel` tokens) socketing a smaller, separate
`.btn-lens` — the only part that carries color and glow. Reach for that
same two-part shape for any future pushbutton-style control instead of
inventing a one-piece colored button; `.square` and `.round` are `.push-btn`'s
two bezel shapes (nav keys vs toggles), and `.btn-lens` follows automatically
via `.push-btn.round .btn-lens`. A lens's color/glow come from three
custom properties — `--lens-hi`/`--lens`/`--lens-lo` (gradient) and
`--btn-glow` (the light escaping the socket) — set together on a variant
class or state selector (`.btn-lens.amber`, `.toggle-btn.is-on .btn-lens`)
rather than redeclaring the gradient/shadow stack. Both the bezel's and the
lens's specular highlights key off the shared `--light-pos` / `--light-angle`
variables (see the light-source comment in base.css) — keep new pushbutton
variants on that system rather than hardcoding a highlight position.

The nav keys' caption went back to a plain `.tile-label` below the button
(matching every other control) rather than text printed on the button face
— the lens replaced the old pilot-light dot instead, and the bezel is too
small at phone widths to hold a word like "Connections" without crowding
its neighbors. `.tile.nav-tile` spans 3 grid columns (not the default 2,
not the old 4) specifically to give that caption enough room; the row
holding the nav buttons is one of the most crowded on the whole deck at the
narrowest supported phone widths (the three-column hull + tilted console
leave surprisingly little width for 16 grid columns), and this rework hit
two real, desktop-invisible overlap bugs there before landing on span 3 —
re-check a narrow-phone screenshot, not just desktop, if you touch nav-tile
sizing or spans again.

## Hull material: worn metal, not clean paint

`.hull` (the console face and both side walls) carries a generated worn/
scratched texture on top of its lighting gradient — the user pointed to a
reference photo of a grungy panel and asked for that realism/depth, not a
freshly-painted surface. It's layered entirely in CSS, no image assets:
two inline-SVG `feTurbulence` filters (one isotropic for fine grain, one
squashed almost flat on one axis via an anisotropic `baseFrequency` so it
reads as brushed-metal streaks) blended `overlay`, plus a few radial
gradients blended `multiply` for dark/rust stain blotches. `#console` also
got four corner `.bolt`s (reusing the same fastener element `window.css`
defines for the star window) to read as screwed into the hull, per the same
reference photo.

Getting the texture strength right took real iteration: the first pass
used a contrast-boosted `feColorMatrix` on the turbulence output, which
looked right in an isolated test swatch but washed out the actual console
— its lit `--metal-hi` zone covers much more of the panel's visible area
than the swatch did, and `overlay` blend is strongest near mid-gray, so the
same texture read as blown-out brushed aluminum instead of subtle wear,
and hurt label legibility. Landed on a plain `feColorMatrix type="saturate"
values="0"` (no added contrast) with the strength controlled by the SVG
rect's own `opacity` (0.12 grain / 0.1 streaks) instead — tune strength
there first if this needs adjusting, and always judge it on the real
`#console` at its real size, not an isolated swatch at a different size —
this material's visual weight doesn't transfer between the two.

## Selling "a room," not just a panel: light spill + glass

The window and console/walls used to be visually independent boxes — same
material language, but nothing tied them together as one lit space. Fix:
a shared `--spill` color (base.css, a cool starlight blue-white) washed
onto the surfaces nearest the window — `#console::before` (a `z-index:-1`
radial gradient anchored top-center, so it sits over `.hull`'s texture but
under the deck-grid controls) and a second `background-image` layer added
to each `.wall::before`, brightest at the edge facing the window. All
`mix-blend-mode: screen` so they only ever lighten, never fight the hull
texture or flatten it into a solid tint. Separately, `.window-glass` is an
inert (`pointer-events: none`) top layer inside `#window`, `z-index:5` —
above the canvas, HUD, reticle, *and* the corner bolts, deliberately: a
reflection lives on the outermost glass surface, in front of everything
behind it, including a HUD that's meant to be projected onto that same
glass. It's just two soft diagonal `screen`-blended gradients, not a real
reflection of anything in the scene — don't over-invest trying to make it
"reflect" the console below; it reads fine as ambient glass character.

If you push this further (more spill sources, reflections that track
something), keep reusing `--spill` and `screen` rather than inventing a
second lighting vocabulary — the point was one consistent light source,
not per-surface tinting.

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
