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
//   hull      0–100, remaining hull integrity (Hull readout + light).
//   power     0–100, energy left to use (Power readout).
//   reactor   0–100, how hard the reactor is running — 50 means half
//             its capacity, with room to do more (Reactor readout,
//             light, and the pilot's Reactor Out lever).
//   shield    0–100, power put into the shield (the pilot's Shield Pwr
//             lever). Drawn from the reactor, so it can never be higher
//             than `reactor`: lowering the reactor pulls the shield
//             down with it.
//   o2        0–100 (O2 gauge + light).
//
//   integrity()  NOT a variable — a function returning hull + shield
//                (0–200), shown on the Integrity readout + light. A weak
//                hull can be covered by more shield, at the cost of
//                running the reactor harder. Branch on it like
//                { integrity() < 50: ... }.
//
//   Warning lights flash yellow / red; clicking one stops the flashing
//   but keeps it lit:
//     Hull, O2, Integrity   yellow below 70, red below 20
//     Reactor               yellow above 80, red above 95 (running hot)
//
//   The pilot can move the Shield Pwr and Reactor Out levers at any time
//   after launch; those call set_shield()/set_reactor() below, so they
//   obey the same rules as the story.
//
//   Change stats with the helpers at the bottom of this file, which keep
//   them in range (0–100, and shield <= reactor):
//     ~ damage(15)              hull -15
//     ~ repair(10)              hull +10
//     ~ adjust(power, -20)      any stat, +/-
//     ~ set_level(reactor, 40)  any stat, exact
//     ~ set_shield(60)          same as set_level(shield, 60)
//     ~ set_reactor(80)         same as set_level(reactor, 80)
//   (A plain `~ hull = 80` works too, but skips those rules — the
//   readout caps what it shows, branches see the raw value.)
//
//   movement                the ship's movement mode, one of the LIST
//                           items: stopped, thruster, sideSpace.
//                             ~ movement = thruster
//                           Being a LIST, a misspelled mode is a compile
//                           error, not a silent no-op.

VAR hull = 100
VAR power = 72
VAR reactor = 50
VAR o2 = 94
VAR shield = 0
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
~ keep_shield_within_reactor()

=== function adjust(ref stat, by)
~ set_level(stat, stat + by)

=== function damage(amount)
~ adjust(hull, -amount)

=== function repair(amount)
~ adjust(hull, amount)

=== function set_shield(to)
~ set_level(shield, to)

=== function set_reactor(to)
~ set_level(reactor, to)

// The shield runs on reactor output, so it can't exceed it.
=== function keep_shield_within_reactor()
{ shield > reactor:
    ~ shield = reactor
}

// Keep in sync with js/story.js's DERIVED_STATS.integrity.
=== function integrity()
~ return hull + shield
