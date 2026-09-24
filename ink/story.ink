// FALLING UP FLIGHT DECK — story source, compiled to data/story.json by
// scripts/compile-ink.js (via npm run compile:ink, or the GitHub Action in
// .github/workflows/compile-ink.yml). Never hand-edit data/story.json —
// edit here and recompile. See AGENTS.md's "The cutscene system" for more
// detail and how js/story.js drives this file's knots.
//
// Split into more files as this grows — INCLUDE another .ink file (e.g.
// INCLUDE characters/handler.ink) and scripts/compile-ink.js will pull it
// in automatically, no changes needed there.
//
// ── TAGS ───────────────────────────────────────────────────────────────
// Tags are for per-line presentation cues. A tag (# key: value) applies
// when the line it's attached to is shown, so put "from the start of the
// scene" tags on the opening line and "once the scene is over" tags on
// the closing line. Unknown keys are ignored.
//
//   # contact: Handler
//       Who the comms panel is talking to — header title and speaker
//       label for every line until changed.
//
//   # image: images/scenes/relay-probe.svg
//   # image: clear
//       Fades an image (path under images/scenes/) in over the
//       starfield. No value, or `clear`, fades it back out.
//
//   # countdown: 300
//       Seconds until the next scene. Starts once the conversation
//       ends, so put it on the scene's closing line.
//
// ── SHIP STATE (variables) ─────────────────────────────────────────────
// Ongoing ship state lives in the variables below, not in tags.
// js/story.js watches each one, so the console updates the moment the
// story changes it — no tag needed. Branch on them anywhere
// ({ hull < 50: ... }, { movement == sideSpace: ... }).
//
//   hull, power, reactor, o2
//                           0–100. hull/power/reactor show on their
//                           readouts, o2 on the O2 gauge. hull, reactor
//                           and o2 also drive their warning lights:
//                           flashing yellow below 70, flashing red below
//                           20 (clicking the light stops the flashing).
//                           Change them with the helpers at the bottom
//                           of this file, which keep them in range:
//                             ~ damage(15)              hull -15
//                             ~ repair(10)              hull +10
//                             ~ adjust(power, -20)      any stat, +/-
//                             ~ set_level(reactor, 40)  any stat, exact
//                           (A plain `~ hull = 80` works too, but isn't
//                           clamped — the readout caps what it shows,
//                           branches see the raw value.)
//
//   movement                the ship's movement mode, one of the LIST
//                           items: stopped, thruster, sideSpace.
//                             ~ movement = thruster
//                           Being a LIST, a misspelled mode is a compile
//                           error, not a silent no-op.

VAR hull = 100
VAR power = 72
VAR reactor = 100
VAR o2 = 94
LIST movement = (stopped), thruster, sideSpace

-> handler_checkin

=== handler_checkin ===
# contact: Handler
# image: images/scenes/relay-probe.svg
Handler to [ship]. Comms check — you still with me out there?
* [Reading you loud and clear.]
    Good. Numbers on my end look nominal. How's the crew holding up?
    * * [Holding steady.]
        -> close
    * * [Ask me again in a week.]
        -> close
* [...Barely. Signal's rough.]
    Copy that — we'll keep this short, then. Flag it if it degrades further.
    * * [Will do.]
        -> close

=== close ===
# countdown: 300
# image: clear
Copy. Handler out — check in again next relay.
-> END

// ── SHIP STATE HELPERS ─────────────────────────────────────────────────
// Clamp every write to 0–100. `ref` means the function changes the
// variable you pass in, e.g. ~ adjust(power, -20).

=== function set_level(ref stat, to)
~ stat = MAX(0, MIN(100, to))

=== function adjust(ref stat, by)
~ set_level(stat, stat + by)

=== function damage(amount)
~ adjust(hull, -amount)

=== function repair(amount)
~ adjust(hull, amount)
