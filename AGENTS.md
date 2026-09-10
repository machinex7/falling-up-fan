# Agents Guide — Falling Up Fan Site

High-level orientation for future agents working on this repo. Deliberately
avoids specific colors, pixel values, and other styling details — those are
expected to keep changing and would just go stale here.

## What this is

A fan site for the band Falling Up, themed as a spacecraft flight deck /
cockpit. `index.html` is the entire site so far: plain HTML markup that
links out to separate CSS and JS files rather than inlining `<style>` /
`<script>` (no build step, no dependencies beyond a Google Fonts link) —
see "File layout" below for what lives where. Serving the directory with
a static file server (e.g. `python3 -m http.server`) is no longer just
the safer option, it's required: `js/monitor.js` fetches `data/albums.json`,
and `fetch()` against a local file fails in most browsers under a bare
`file://` open.

`members.html` and `connections.html` are linked from the console but
don't exist yet — they're the planned next pages. The former `tracks.html`
link is gone: what was going to be a Tracks page is now the Albums info
monitor described below, built in-page rather than as a separate site.
`Stories.md` has narrative/world-building notes for the site's fiction if
that's ever relevant to future content.

## File layout

```
index.html          markup only — links the CSS files, loads the JS
                     files at the end of <body>
data/
  albums.json        the info monitor's Albums content — plain array
                      of { title, year, type, tracks }, fetched by
                      js/monitor.js; hand-edit this file directly to
                      correct or extend the catalog, nothing else
                      references it
css/
  base.css           reset, :root palette/spacing variables, html/body
  cockpit.css        shell layout: plaque bar, hull walls, seams,
                     conduits, wall lamps, #forward wrapper
  window.css         the star window: bolts, HUD corner readouts,
                     reticle, canvas sizing
  console.css        the widget deck: #deck-grid, .tile and every
                     widget "face" (readout, gauge, nav-tile, knob,
                     toggle, bar, alert light, throttle, equalizer,
                     LAUNCH)
  monitor.css        #info-monitor: the slide-out "second screen"
                     the Albums nav button opens over #window/#console
                     — see "The info monitor" section below
  scenes.css         the window's swappable backgrounds — #scene-layer,
                     .scene, and every scene's own art (currently just
                     .scene-ascent's silo/ground/sky/space strip;
                     .scene-space is just a plain wrapper around the
                     existing starfield canvas)
  animations.css     all @keyframes, shared across the files above
  responsive.css     the >=900px media query — kept last on purpose,
                     since it overrides rules defined in the files
                     above and CSS source order decides that fight
js/
  starfield.js       canvas starfield IIFE, sized to #window via
                     ResizeObserver — now mounted inside #scene-space
                     rather than being #window's only background, but
                     otherwise unchanged
  controls.js        toggle/knob/alert click handling on .tile
  readouts.js        readout drift (setInterval) + cargo bar fill-in
  throttle.js        pointer-based drag on .throttle-track
  parallax.js        device-tilt drift on stars/console/armrests via
                     DeviceOrientation; also owns the #motion-enable
                     iOS-permission pill (button lives in index.html,
                     styled in cockpit.css)
  window-scenes.js   the scene switch (crossfades .scene elements via
                     .is-active) plus the one scene transition that
                     exists so far — silo -> ascent -> space, played
                     once on the 'ship:launch' DOM event
  power.js           the ship's powered/unpowered state (LAUNCH
                     button, a one-way press that disables itself);
                     dispatches 'ship:launch' on that press
  monitor.js         opens/closes #info-monitor and swaps its
                     album-list/track-list views; also owns
                     ALBUM_DATA — see "The info monitor" below
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

Each control is a `.tile` — a layout wrapper (control + caption) that is
now ALSO its own small mount plate (background + 2 corner screws), per a
second reference photo: every real component in it sat on its own little
plate bolted to the dashboard, not straight onto it. This is a full
reversal of an *earlier* rule recorded in this file ("deliberately not a
styled card/box... uniform per-item boxing has been explicitly rejected
twice") — that rule is gone now, superseded by explicit user request, so
don't "fix" tiles back to bare/boxless if you find old screenshots or
history suggesting otherwise. What's preserved from the old goal: the
plate still hugs whatever control it holds rather than imposing one fixed
card size — a bare readout's plate is short and wide, the throttle's is
tall, a knob's is small and square — so the deck still reads as cluttered/
uneven hardware, not a spreadsheet of identical cards. Widget types
established so far (readout, gauge, nav pushbutton, equalizer, knob,
toggle pushbutton, horizontal bar, alert light, throttle lever) each have
their own "face" styling on top of that shared plate — follow that pattern
for new widget types: a `.tile` for the plate, then whatever face the
control needs inside it.

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

## Every tile is a mount plate now

`.tile`'s own background/padding/box-shadow *is* the mount plate — no
wrapper element, no per-widget-type CSS. `.tile::before`/`::after` are the
2 corner screws (top-left/top-right), added once on the shared selector so
every current and future widget type gets them for free. The plate is
deliberately a plainer, cleaner metal gradient (plain `--metal-hi`/`--metal`/
`--metal-lo`, no grain/scratch texture) than `.hull` underneath it — it
reads as a separate, less-weathered part bolted onto the dash, which is
also just cheaper (no repeated SVG turbulence backgrounds on ~25 tiles).
If a new widget needs to opt out of the plate look entirely, that's a
one-off override on that widget's selector, not a reason to touch the
shared `.tile` rule.

This ate the old "invisible touch-target padding" hack
(`.tile:has(.knob)`/`.tile:has(.toggle-btn)`/`.tile.nav-tile`/`.tile.alert`
used to get `padding` cancelled out by an equal negative `margin`, so the
hit area was bigger than the visible box with no visual size change). The
plate's own padding is bigger than that hack's was and is no longer
cancelled — it's supposed to be visible now — so those selectors were
trimmed back to just `cursor: pointer`. Don't re-add the negative-margin
trick on top of the plate; it would just make the plate crooked relative
to its own content.

## Hull material: worn metal, not clean paint

`.hull` (the console face and both side walls) carries a generated worn/
scratched texture on top of its lighting gradient — the user pointed to a
reference photo of a grungy panel and asked for that realism/depth, not a
freshly-painted surface. It's layered entirely in CSS, no image assets:
two inline-SVG `feTurbulence` filters (one isotropic for fine grain, one
squashed almost flat on one axis via an anisotropic `baseFrequency` so it
reads as brushed-metal streaks) blended `overlay`; a third inline SVG of a
handful of explicit `<line>` strokes (real scratches read as discrete
catches of light, not just noise) blended `screen`, tiled at a large,
irregular size so the repeat isn't obvious at a glance and kept faint —
scratches are meant to be a subtle catch of light, not the dominant
feature; and several radial gradients for rust/oil stain blotches, a thin
elongated one among them standing in for a drip stain, plus a large soft
radial vignette darkening the plate's edges for accumulated grime.
`#console` also got four corner `.bolt`s (reusing the same fastener
element `window.css` defines for the star window) to read as screwed into
the hull, per the same reference photo.

**Rust stains must be `normal`-blended, not `multiply`.** The first pass
blended every stain `multiply`, which is wrong on this hull's dark,
fairly desaturated palette: multiplying an already-dark, low-chroma stain
color into an already-dark, low-chroma backdrop barely shifts either
channel, so the stains were essentially invisible even at real console
size — this was reported back as "I don't see any wear/rust." Switched
every colored stain to plain alpha compositing (`normal`), which actually
mixes the warm stain hue into the backdrop instead of just trying (and
failing) to darken it further. The one exception: the pure-black
grease/oil blotch and the edge grime vignette keep `multiply`, because
darkening-only is exactly what a black stain or a vignette should do —
only *colored* stains need `normal`. If a future stain still doesn't show
up, check its blend mode before touching its opacity or color.

Every corner fastener gets its own rust strength via a `--bolt-rust`
custom property set per corner class (`.bolt.tl`/`.tr`/`.bl`/`.br`) rather
than one halo style reused identically on all four — real hardware on the
same panel doesn't age evenly, so the four corners of any one `#window`
or `#console` read as different ages/exposure rather than a matched,
deliberate set. Keep that spread (one clearly heavier, one clearly
fainter, two in between) if you add more fasteners elsewhere, rather than
giving every bolt the same halo.

Getting the texture strength right took real iteration: the first pass
used a contrast-boosted `feColorMatrix` on the turbulence output, which
looked right in an isolated test swatch but washed out the actual console
— its lit `--metal-hi` zone covers much more of the panel's visible area
than the swatch did, and `overlay` blend is strongest near mid-gray, so the
same texture read as blown-out brushed aluminum instead of subtle wear,
and hurt label legibility. Landed on a plain `feColorMatrix type="saturate"
values="0"` (no added contrast) with the strength controlled by the SVG
rect's own `opacity` (grain/streaks) instead — tune strength there first if
this needs adjusting, and always judge it on the real `#console` at its
real size, not an isolated swatch at a different size — this material's
visual weight doesn't transfer between the two. The scratch layer's first
pass used a small tile (~220px), which looked fine in isolation but read as
an obviously-repeating wallpaper pattern across the wide desktop console;
landed on a bigger, sparser, less symmetric tile instead — if this needs
more wear, add more rust blotches or lengthen the vignette before growing
the scratch layer back up.

## Worn touch points: wear isn't uniform

`.hull` gives the console and both walls the same generated grime/rust
everywhere — realistic for a surface nobody touches, but a ship someone
has piloted for days at a time also shows *where hands actually go*:
specific controls worn lighter/duller from repeated contact, contrasting
against the grimy hull around them, plus a broad forearm-rest sheen low
on the console where a pilot leans in to work the throttle and the row of
knobs above it. This is layered on top of everything in the "Hull
material" section above, not a replacement for it — uniform grime plus
pointed wear is what reads as lived-in; either alone doesn't.

Two reusable modifier classes carry this: `.knob.worn` and
`.push-btn.worn` (console.css, near each control's base rule), applied in
the markup only to controls the story treats as constantly handled — the
Nav/Comm console knobs and the wall's main power knob, and the toggles
that stay engaged day-to-day (Auto, Shield, Cabin Lt) — not every knob or
button on the deck. The throttle handle gets its own one-off treatment on
`.throttle-handle::after` rather than a shared class, since it's the
single most-handled control on the whole panel (every course correction
goes through it) and earns being the most obvious wear on the deck.

Two things worth knowing if you add more worn controls:
- **The wear color must contrast in hue, not just add shine.** The first
  pass used a white highlight blended `soft-light`, which just added more
  of the same cool specular shine these controls already have baked into
  their base gradient — it disappeared into the existing highlight
  instead of reading as separate wear. What actually shows up: a warm,
  slightly desaturated tone blended `normal` at real opacity — visually a
  *different material* (bare/dulled metal, worn plastic) rather than more
  polish on the same material.
- **Check what's actually visible before placing it.** `.push-btn`'s lens
  (`.btn-lens`) covers the center ~56% of the button — a centered worn
  patch mostly hides behind it and reads as nothing. The fix was moving
  the patch fully into the exposed ring outside the lens circle (do the
  distance-vs-radius math, don't eyeball it), off to one corner, the way
  a thumb brushes the bezel's edge reaching for the button rather than
  landing dead center on the lens.

The two side walls also stopped being mirror copies of each other: each
now gets an extra grime patch low near the floor (per `.wall.left::before`
/ `.wall.right::before` in cockpit.css) at a different position, size, and
strength — asymmetric on purpose, since two walls that wore identically
over the same missions would read as a matched, manufactured set rather
than two sides of a room that happened to age differently.

## Human presence: sticky notes and the pilot's chair

Everything above this section is wear on the *ship* — grime, rust, worn
touch points. None of it, by itself, proves anyone actually lives here.
Two more elements (both in cockpit.css, near the end) exist purely to put
a person in the room:

`.sticky-note` is personal clutter — scraps of paper someone actually
stuck to the dash, which reads as "lived in" faster than any amount of
hull texture. Two on purpose, deliberately not matching (`.on-console` is
a fresh yellow one hanging off `#console`'s own top edge into the gap
toward the window; `.on-wall`, inside `.wall.right`, is a smaller
`.faded` blue-gray one that also inherits the wall's own
`filter: brightness(0.62)` for free) — a whole drawer of identically-worn
notes would read as set dressing, not a habit. Every note is
`pointer-events: none` and deliberately allowed to overlap a tile's
corner slightly — that's where a real note would actually get stuck, not
a bug to route around. `.on-console` relies on `#console` having no
`overflow` clipping (unlike `.wall`, which does — that's why `.on-wall`
stays inside its box instead of also hanging off an edge).

`.armrest` (`.left`/`.right`) is different in kind from everything else
in this file: it belongs to the *viewer*, not the ship. Two shapes fixed
to the viewport's own bottom corners (not `#cockpit` or `#console` — the
chair doesn't move if the console layout reflows), deliberately
overlapping the hull/console a little at every breakpoint, since a real
armrest photographed from a seated POV would partially occlude whatever's
directly behind it. `pointer-events: none` so they never block a control
they happen to sit in front of. The worn patch on each pad reuses the
exact worn-touch-point language from the section above (a warm,
hue-contrasting patch, not more shine) since forearms rest here more than
on anything else on the ship — keep reaching for that shared language
rather than inventing a third way to render "worn" if this area grows.

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

## Selling depth: the console has a front face, armrests reach forward

Two follow-ups after the room started reading as "flat" despite the 3D
transforms already in place: the console's `rotateX` was only 9deg (too
subtle to read as an angled dash rather than a picture of a slightly-
tilted wall), and `.armrest` was a tall, narrow rectangle merely leaned a
few degrees — it read as a post standing up in the corner, not an arm
extending forward.

`#console` is now tilted to 18deg (see the comment on that rule for why
not further — a real ceiling from the click-hit-testing gotcha below,
not just eyeballing it) and gained a sibling, `.console-riser`
(`console.css`, markup in `index.html` right after `#console` closes): a
short vertical "kick panel" that picks up exactly where the angled top's
bottom edge sits on screen (that edge doesn't move under `rotateX`
around `transform-origin: bottom center`, so no explicit positioning
math is needed) and renders with NO rotation of its own — flat, facing
the pilot. One tilted plane plus one flat plane sharing a lit crease
reads as a wedge with real thickness; one tilted plane alone reads as a
picture of a tilted plane. It reuses `.hull` for the same worn-metal
material, dimmed like the side walls.

`.armrest` went from a single flat, leaned rectangle to a small 3D
construction: `.armrest` is now just the fixed-corner stage (it owns the
`perspective`), and a child `.armrest-pad` is the actual visible
surface — wide and short rather than tall and narrow (a wide low shape
reads as "reaching out," a tall narrow one reads as "upright"), tapered
with `clip-path` into a wedge wide at the seat and narrower toward the
console, and tilted back with its own `rotateX` around the corner
pinned to the seat — the same "flat sibling below a hinge that doesn't
move" logic as `.console-riser`, just used to foreshorten a receding
surface instead of add a front face. The outer `rotate()` then points
that already-foreshortened plane diagonally in toward the console.

## The ship's power state

The ship boots **unpowered**: `#cockpit` carries an `unpowered` class in
the raw HTML (not added by JS) so the dimmed look is what a `file://`
open or a JS-disabled load shows too, not something that flashes on
after the page paints. Three files read that class (and its sibling
`powered`/`flicker` classes, all toggled only by `js/power.js`) to dim
their own corner of the ship, rather than one central place owning every
dimmed element directly:

- `console.css`: `#cockpit.unpowered #deck-grid > .tile:not(.launch):not(.nav-tile)`
  gets `filter: brightness(0.3) saturate(0.4)` and `pointer-events: none`
  — every deck control goes dark AND stops responding to clicks (a dead
  console shouldn't be operable), except `.tile.launch` and the three
  `.nav-tile`s (Members/Albums/Connections — explicit user call: reading
  about the band shouldn't require launching the ship first, since
  that's "the point of the site"), which stay lit and clickable at
  every power state. `.nav-tile` still plays the `.flicker` power-up
  animation below, purely decorative since it was never actually dimmed.
- `cockpit.css`: `.wall-light` goes fully dark (`background:
  var(--bezel-lo)`, animation stopped) instead of just dimming — it's a
  bare glowing dot with no surrounding material to fade, so a dimmed
  version would just look like a smaller glow, not "off."
- `window.css`: `.hud` and `#reticle` drop to `opacity: 0.04` — the
  window's own projected instrument overlay, not the view of space
  itself (the starfield canvas is deliberately NOT dimmed here — see
  its own comment in window.css — space doesn't need the ship's power).

`#cockpit.flicker` plays `power-flicker` (animations.css) on those same
selectors for ~1.15s when power comes on, before the classes settle into
their final `powered` state — the one-time "systems coming online"
moment. All three files independently keying off the same three classes
is the pattern to follow for any future ship-wide state (e.g. a "red
alert" mode): pick the class names once, add them in one place
(`js/power.js` here), and let each file that owns a dimmable element
react to them locally rather than centralizing the dimming logic
somewhere that would need to know about every other file's elements.

**LAUNCH** (console.css, markup in index.html's `#deck-grid`) is the
one control still lit and clickable while unpowered. It's deliberately
the SAME `.push-btn.round` + `.btn-lens` component every toggle button
uses (explicit user request — an earlier version was a bespoke button
shape, which was reverted), just sized up (`.launch-btn`) with a bigger
`.tile-label` caption, and explicitly `grid-column`/`grid-row` placed
so `#deck-grid`'s dense auto-flow routes every other tile around this
one reserved block instead of needing manual placement for the rest of
the deck (its footprint went from a 3-row block to today's 2-row one
after the first version read as too large). Its lens starts on the
shared idle `.btn-lens.amber` pulse (the same idle language as the nav
buttons) rather than off, since it's the only lit thing in the whole
cockpit at rest; `#cockpit.powered .tile.launch .btn-lens` overrides
that to a steady green glow (the `.toggle-btn.is-on` "systems nominal"
color), and the caption switches from "Launch" to "Launched" to match.

Pressing it is **one-way**: `js/power.js` sets the button's own
`disabled` attribute right after the first press, rather than toggling
back to an unpowered state on a second press (an earlier version did
toggle both ways). There's nothing yet for a second press to do —
revisit this once shutdown/relaunch or some other post-launch action
is actually wired up, rather than re-adding a toggle with no real
second state behind it. `disabled` also is what makes power.js's
`ship:launch` dispatch (below) safe to fire unconditionally on click,
with no "did this already happen" guard needed in JS: the browser
itself won't deliver a second `click` event to a disabled button, not
even a synthetic/forced one.

## The window's scene system

The view through `#window` is not one fixed starfield — it's a stack of
swappable **scenes**, since the plan is for it to eventually show all kinds
of different backgrounds (other ships, constellations, effects) as the
site's fiction develops, not just the launch. `#scene-layer` holds every
`.scene`, each an absolutely-positioned full-bleed layer; `js/window-scenes.js`
shows one at a time by toggling `.is-active`, which crossfades via a plain
CSS `opacity` transition. A future scene is just another element added to
`#scene-layer` plus whatever code decides to call `showScene()` on it —
this file doesn't need to know about it in advance, the same way `.tile`
widgets on the deck don't need console.css to know about every future
widget type.

The one scene transition that exists so far — `.scene-ascent`'s silo
interior scrolling up into `.scene-space`'s starfield on launch — is built
as **one continuous tall strip** (`.ascent-strip`, `height: 1200%` of the
scene's own box, so it scales with `#window` at any breakpoint with zero
JS measurement) rather than several separately-timed effects. Reading it
bottom-to-top: silo shaft, ground/treeline, sky+clouds, upper atmosphere,
space+stars. A single `translateY` scroll animation (`ascent-scroll` in
animations.css, `23s`) is most of the sequence — "gradually brighter,"
"trees pass below," and "clouds pass below" all fall straight out of
scrolling past different painted bands of one world, not out of
separately animating brightness/position for each element. If a future
scene needs its own multi-stage transition, prefer this "one strip, bands
do the work" trick over hand-timing a pile of individual elements — it's
what kept this one from turning into a mess of `setTimeout`s.

`ascent-scroll` plays under `animation-timing-function: linear`
(scenes.css), but the keyframe itself is NOT a plain from/to — it has 9
explicit stops, 6 of them pinned to an exact per-level duration the user
gave directly (LEVEL 6 passes in 3.5s, LEVEL 5 in 3s, down to LEVEL 1 in
1s — "passing" defined as that level's `.level-marker` scrolling out the
window's bottom edge, i.e. `translateY% = 100 - <that level's absolute
strip position>`), with 3 more hand-picked stops pacing what comes after
(ground, sky, fade-to-black). Because the timing-function is linear,
interpolation BETWEEN each pair of stops is straight, so a stop's
(time%, distance%) pair is exactly when that much of the strip has
scrolled — no timing-function easing further distorting it. To retune a
level's own duration, change only that stop's time% (its translateY% is
fixed by the level's actual position, not a free choice); to retune
post-silo pacing, move the last 3 stops' time%s. Every stop just needs
both its time% and its translateY% to keep increasing from the one
before it. Reach for this same "explicit keyframe stops under a linear
timing-function" trick for any future scene that needs a hand-shaped pace
curve — it keeps the stops' numbers meaning exactly what they say, which
a bezier easing on top would quietly break.

The scroll deliberately does NOT run all the way to the strip's true top
(`translateY(91.667%)`, where `.band-space`'s baked art would be fully
revealed) — it stops at `90%`, the moment the view is solid black, per
explicit feedback that painted-in stars sliding past at ascent speed
looks wrong: real stars are far enough away that they shouldn't
noticeably move at all on this timescale. `.band-space` is now just flat
black (`#05060a`), never meant to be fully scrolled into view; instead,
`js/window-scenes.js`'s `SCROLL_MS` timeout (kept equal to this
animation's total duration) fires right as that final stop is reached,
and crossfades to `.scene-space` — the REAL starfield canvas — over the
existing `.scene` opacity transition, reading as stars gradually becoming
visible once it's dark enough, not a scene cut. If a future scene needs a
similar "painted approximation hands off to a live/real element" moment,
trigger the handoff at the exact time the painted version stops adding
anything (here: "already solid black"), not at the animation's literal
end — the two aren't the same thing once the strip's own final stretch
is blank.

Band sizing (the height% values) is a separate knob from this curve and
still works the same way it always did: it sets how much of the strip's
total DISTANCE each band covers, not directly how much time — with a
non-uniform curve, a band's share of time depends on where its distance
range falls across the stops above, not purely on its own height%. Silo
depth isn't sold by darkness alone: six `.level-marker` labels ("LEVEL
1"–"LEVEL 6") are spaced through `.band-silo` at fixed intervals
(`(2L-1)/12 * 100%`, independent of the strip's overall scale) so the
descent has a legible sense of scale, not just an abstractly-long dark
scroll. `.level-seam` adds a second, physical layer to that same idea: 5
thin highlight/shadow lines at the boundaries BETWEEN the 6 level slots
(1/6 through 5/6 of `.band-silo`'s own height — the marker positions are
each slot's center, so the seams fall naturally between them), reading as
poured-concrete floor joints rather than lit signage — deliberately a
plain white-over-black pair, not the amber HUD language `.level-marker`
uses, so it's legible as the shaft's own material rather than an
instrument. Its highlight alpha (`0.4`) is well above what would look
right on an undimmed surface, because it sits inside `.ascent-strip`,
which carries its own animated dimming (see the light-level curve below)
— budget similar headroom for any future subtle-highlight element placed
inside an already-dimmed/filtered container, or it'll render essentially
invisible. Similarly, `.band-ground` layers two tree SVGs instead of one —
`.tree-line.far` (short, hazy, desaturated) behind `.tree-line.near`
(tall, near-black, tall enough to poke past `.band-ground`'s own edge
into the sky band above via `overflow: visible`) — since a single
distant tree line reads as "flying over a forest," while the near layer
is what sells "hidden close in the woods."

**The ascent's light level is one animated curve, not a per-band
constant.** `.ascent-strip` (not any individual band) carries `filter:
brightness()` (plus a `sepia()` warm tint that only applies underground)
as part of `ascent-scroll`'s own keyframes, riding along on the same
timeline as the scroll itself — dark at rest, climbing steadily through
the silo, reaching neutral (`brightness(1)`, no dimming) right as the
ground band arrives so it doesn't fight the sky's already-correct
colors, holding there through the sky, then dropping again over the
final stretch into black. This replaced an earlier version where
`.band-silo` alone carried a flat `brightness(0.4)` (plus a static
depth-darkening overlay that compounded with it) — constant regardless
of how far the climb had progressed, which per feedback made the first
few seconds of the climb hard to even perceive as movement, since
nothing about the shaft's appearance actually changed as it passed. The
fix generalizes: for anything that should visibly change over the
course of the ascent (or a future scene's own timeline), animate it on
the element carrying the scroll's own keyframes, in the same keyframe
rule, rather than hanging a static rule off whichever band happens to
contain it — a static per-band property can't express "changes over
time" no matter how it's tuned, only "changes when a different band
scrolls into view." `.ascent-strip`'s base (non-`.is-launching`) filter
must match `ascent-scroll`'s `0%` stop exactly, since nothing else dims
the shaft before the animation takes over.

The strip is **bottom-anchored** (`bottom: 0`), so it shows the silo at
rest with no transform needed, and scrolls **down** (positive `translateY`)
as the ship climbs — the ground sliding down and out of the window while
the sky above stays in place is what an ascending window view actually
looks like, and matches the "scroll down" the user originally described.
Getting the sign of that transform backwards was the one real bug during
development: it looked like the scene just went to black and stayed there,
because the strip scrolled UP off the top of its own artwork into empty
space instead of down through it — if a future scene's scroll transition
seems to "do nothing," check the transform's sign against which edge the
strip is anchored to before anything else.

`js/power.js` triggers the sequence by dispatching a plain `'ship:launch'`
DOM event on `document` — safe to fire unconditionally on every click
LAUNCH actually receives, since (per "The ship's power state" above) the
button disables itself after that one click, so there is no second click
to guard against — rather than calling into window-scenes.js directly,
the same loose, no-shared-state coupling every other feature file in this
codebase already uses. Reach for that same event-dispatch pattern for any
future cross-file trigger instead of adding direct references between
`js/*.js` files.

## The info monitor: a second screen, not a second page

`members.html`/`connections.html` are still meant to be real separate
pages once they exist, but the planned Tracks page turned into something
different once it was actually being built: instead of navigating away,
the **Albums** nav button (`#albums-tile`, a `<button>` now rather than an
`<a>` — see the `button.tile` reset in console.css) opens `#info-monitor`,
a panel that slides in from the side to cover `#window`/`#console` and
shows an album list; picking an album swaps to that album's track list in
the same panel. Both views are plain content swapped via the `hidden`
attribute (`js/monitor.js`'s `showAlbumList`/`showTracks`) — there's no
router, no history entries, no page load, just two `<div>`s toggling
visibility the same way `js/window-scenes.js` toggles `.scene`s.

**Why a slide-out panel instead of a real page:** the user's own framing
was "a slot or additional monitor to the side" — an in-universe second
screen the ship already has, not a link out of the cockpit. `#info-monitor`
lives inside `#forward` (which needed `position: relative` added in
cockpit.css for this to anchor to), sized via `position: absolute; inset:
0`, so it automatically covers exactly the window+console box at any
breakpoint with zero measurement — the same trick `.console-riser` and
`.armrest` use elsewhere in this file. It's parked at `translateX(106%)`
until `.is-open` slides it to `translateX(0)` (css/monitor.css); `pointer-
events` are off while parked so a closed, off-screen panel can never
intercept a click meant for the console underneath it, and the screen's
own `crt-flicker` animation (below) is scoped to `.is-open` too, so
nothing is even animating while it's parked — genuinely off, not just
out of view. Unlike every other tile, `#albums-tile` (and the other two
`.nav-tile`s) is explicitly EXCLUDED from `#cockpit.unpowered`'s
dimming/`pointer-events:none` rule in console.css — explicit user call:
band info shouldn't require launching the ship first, so the monitor
opens at any power state, not just once `#cockpit` is `.powered`.

**Why the panel's own screen looks nothing like the rest of the ship:**
originally this was styled as a plain light "traditional website," then
deliberately reworked into an old green CRT terminal (Fallout/Pip-Boy
territory — scanlines, phosphor glow, all-caps blocky text) per explicit
user request. Both versions share the same underlying split, and it's
worth keeping if this changes again: `.monitor-bezel` (the physical frame
around the screen) reuses `.hull` + corner `.bolt`s, same as
`#window`/`#console`, so the *hardware* always stays ship-consistent;
`.monitor-screen` — the display surface inside that frame — is free to
look like whatever the content on it is supposed to be, independent of
the ship's own metal/amber-and-cyan-LED language. Currently that's a
terminal: `--led-green`/`--green-glow` (the same tokens the console's own
green LED readouts already use, so the color itself still ties back into
the ship's instrument family) plus `var(--font-led)` (VT323) and
`text-transform: uppercase` throughout `.monitor-screen`, a
`repeating-linear-gradient` + radial vignette on `.monitor-screen::after`
for scanlines (opacity kept low — "faint" was explicit), and a
`crt-flicker` keyframe (animations.css, applied only via
`.info-monitor.is-open .monitor-screen` so it's not running at all while
closed) that sits at full brightness almost the whole cycle with just two
brief ~5% dips, not a steady pulse — a real tube holds steady far more
than it flickers. Selection/hover on
`.album-card`/`.monitor-back`/`.monitor-close` inverts to solid green on
near-black rather than just changing a border color, matching how a real
terminal highlights the selected line. The `.monitor-flag` data-accuracy
warning stays on the amber/`--led-amber` language instead of green, so it
reads as a distinct system warning rather than blending into the normal
green readout.

**A `[hidden]`-vs-`display` gotcha worth knowing before adding a third
view here:** `.album-list` and `.track-view` each need their own
non-default `display` for layout (`flex` / block-with-children), and at
equal specificity an author rule for `display` beats the browser's own
`[hidden] { display: none }` UA rule — so without the explicit
`.album-list[hidden], .track-view[hidden] { display: none; }` override
near the top of monitor.css, toggling the `hidden` attribute did nothing
and both views rendered stacked on top of each other. Any future view
swapped the same way needs that same explicit `[hidden]` override the
moment it sets its own `display`.

**`data/albums.json` is a first draft, not sourced data** — titles, years,
and tracklists were filled in from memory rather than checked against
liner notes or a streaming catalog, and the panel says so via the
`.monitor-flag` banner visible under the header in both views. Correct
entries directly in that JSON file rather than treating anything currently
in it as verified canon. `js/monitor.js` fetches it once on the album
button's first `click` (`dataPromise`, module-scoped so later opens reuse
the same resolved promise instead of re-fetching) and shows an
`ACCESSING CATALOG…` placeholder row in the meantime — on a fast local
server that placeholder is only visible for a frame, but it's there for
slower hosting and for the fetch-failure path (a `CATALOG DATA
UNAVAILABLE.` row plus a console error) rather than a silent blank panel.

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
