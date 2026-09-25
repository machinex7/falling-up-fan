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
//   power     0–100, energy left in the pool; starts at 100. Spent at
//             the END OF EACH SCENE (see power_cost() below) — the
//             Power readout shows projected_power(), what it WILL be
//             after this scene, live as the levers move.
//   reactor   0–100 points, the reactor's output LIMIT — how much
//             energy it's allowed to put out (the pilot's Reactor
//             lever). It's what 100% on the Reactor bar means, and
//             it's what power_cost() charges for.
//   shield    0–100%, power put into the shield (the pilot's Shield
//             lever). Costs SHIELD_COST (0.5) reactor points per %.
//   drive     0–100%, the drive's charge (the pilot's Drive Charge
//             lever). Costs DRIVE_COST (0.5) reactor points per %.
//   signal    0–100, base signal strength (set from the story).
//   signal_boost  true/false, the pilot's SGNL BST button. While on,
//             adds SIGNAL_BOOST (50) to the Signal readout and draws
//             SIGNAL_BOOST_COST (5) reactor points.
//   o2        0–100 (O2 gauge + light).
//   cargo     0–100, how full the cargo hold is (Cargo bar). Set it
//             from the story only — no rules or warnings attached yet.
//               ~ set_level(cargo, 40)   or   ~ adjust(cargo, -10)
//
//   Computed from the variables above (functions, NOT variables —
//   call them with ()):
//     integrity()     hull + shield (0–200): Integrity readout + light.
//                     The readout tops out at 100 and shows "100+" when
//                     it's higher; integrity() itself returns the real
//                     sum, so the story can still tell how far over.
//                     A weak hull can be covered by more shield, at the
//                     cost of more reactor load.
//     reactor_load()  reactor points in use right now: shield + drive
//                     charge + signal boost (add future systems here).
//     signal_strength()  signal, +SIGNAL_BOOST while SGNL BST is on:
//                     the Signal readout (shows "100+" above 100).
//     power_cost()    what this scene will cost: 1 power per
//                     REACTOR_PER_POWER (4) points of the Reactor lever
//                     setting (whether or not they're used).
//     projected_power()  power - power_cost(), never below 0: the
//                     Power readout.
//     reactor_use()   reactor_load() as a % of the `reactor` limit:
//                     the Reactor bar's fill (green, yellow above 80,
//                     red at or over the limit) and the Reactor light.
//                     Goes past 100 when overloaded (e.g. 150); the bar
//                     just stays full and red.
//     overloaded()    true when reactor_load() is over the limit.
//   Branch on them like { integrity() < 50: ... } or
//   { overloaded(): The reactor is screaming. }.
//
//   The load CAN exceed the limit — the pilot is allowed to overload the
//   reactor. Nothing happens on its own when they do; any penalty is up
//   to the story (check overloaded() / reactor_use()).
//
//   Warning lights flash yellow / red; clicking one stops the flashing
//   but keeps it lit:
//     Hull, O2, Integrity   yellow below 70, red below 20
//     Reactor               yellow above 80% used, red at 100% (maxed)
//
//   The pilot can move the Shield, Reactor and Drive Charge levers and
//   press SGNL BST at any time after launch; those call set_shield(),
//   set_reactor(), set_drive() and set_signal_boost() below, so they
//   obey the same rules as the story.
//
//   Spending power: when a scene's conversation ends (no choices left,
//   -> END), js/story.js calls consume_power() below automatically,
//   which sets power to projected_power(). Don't call it yourself too,
//   or the scene is charged twice.
//
//   Change stats with the helpers at the bottom of this file, which keep
//   them in range (0–100):
//     ~ damage(15)              hull -15
//     ~ repair(10)              hull +10
//     ~ adjust(power, -20)      any stat, +/-
//     ~ set_level(reactor, 40)  any stat, exact
//     ~ set_shield(60)          same as set_level(shield, 60)
//     ~ set_reactor(80)         same as set_level(reactor, 80)
//     ~ set_drive(30)           same as set_level(drive, 30)
//     ~ set_signal_boost(true)  SGNL BST on / off
//   (A plain `~ hull = 80` works too, but skips those rules — the
//   readout caps what it shows, branches see the raw value.)
//
//   movement                the ship's movement mode, one of the LIST
//                           items: stopped, thruster, sideSpace.
//                             ~ movement = thruster
//                           Being a LIST, a misspelled mode is a compile
//                           error, not a silent no-op.

CONST SHIELD_COST = 0.5         // reactor points per shield %
CONST DRIVE_COST = 0.5          // reactor points per drive charge %
CONST SIGNAL_BOOST = 50         // signal added while SGNL BST is on
CONST SIGNAL_BOOST_COST = 5     // reactor points SGNL BST draws while on
CONST REACTOR_PER_POWER = 4     // reactor lever points per 1 power spent

VAR hull = 100
VAR power = 100
VAR reactor = 50
VAR o2 = 94
VAR shield = 0
VAR cargo = 72
VAR drive = 0
VAR signal = 40
VAR signal_boost = false
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

=== function set_shield(to)
~ set_level(shield, to)

=== function set_reactor(to)
~ set_level(reactor, to)

=== function set_drive(to)
~ set_level(drive, to)

=== function set_signal_boost(on)
~ signal_boost = on

// Called by js/story.js when each scene ends — see the header.
=== function consume_power()
~ power = projected_power()

// ── COMPUTED STATS ─────────────────────────────────────────────────────
// js/story.js calls each of these by name (its DERIVED_STATS list) to
// update the console, so the formulas live only here.

=== function integrity()
~ return hull + shield

=== function reactor_load()
~ temp load = shield * SHIELD_COST + drive * DRIVE_COST
{ signal_boost:
    ~ load += SIGNAL_BOOST_COST
}
~ return load

=== function signal_strength()
{ signal_boost:
    ~ return signal + SIGNAL_BOOST
}
~ return signal

// whole-number division: 1 power per full REACTOR_PER_POWER points
=== function power_cost()
~ return reactor / REACTOR_PER_POWER

=== function projected_power()
~ return MAX(0, power - power_cost())

// Parenthesized on purpose: ink reads `a * 100 / b` as `a * (100 / b)`
// with whole-number division, which rounds badly.
=== function reactor_use()
{ reactor <= 0:
    // any draw on a zero limit is a total overload
    { reactor_load() > 0:
        ~ return 999
    }
    ~ return 0
}
~ return FLOOR((reactor_load() * 100) / reactor)

=== function overloaded()
~ return reactor_load() > reactor
