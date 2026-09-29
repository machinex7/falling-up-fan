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
//       If the scene has ordered a flight mode the pilot hasn't engaged
//       yet (see FLIGHT MODES), the image waits until they press
//       LAUNCH/STOP — set `movement` in the same beat as the tag
//       (before or after it, either works). `clear` always applies
//       right away.
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
//   power     0–100, energy left in the pool; starts at 100. Spent only
//             when the pilot presses LAUNCH to engage thruster or
//             sideSpace (see power_cost() and FLIGHT MODES below) — the
//             Power dial shows projected_power(), what it WILL be after
//             that launch, live as the levers move. It's a dial: a faint
//             arc for power now, a bright arc + number for
//             projected_power(); yellow below 30, red below 10.
//   reactor   0–100 points, the reactor's output LIMIT — how much
//             energy it's allowed to put out (the pilot's Reactor
//             lever). It's what 100% on the Reactor bar means, and
//             it's what power_cost() charges for at launch.
//   shield    0–100%, power put into the shield (the pilot's Shield
//             lever). Costs SHIELD_COST (0.5) reactor points per %.
//   drive     0–100%, the drive's charge (the pilot's Drive Charge
//             lever). Costs DRIVE_COST (0.5) reactor points per %.
//   scan      0–100%, the scanner's sweep (the pilot's Scan knob).
//             Costs SCAN_COST (0.1) reactor points per %.
//   signal    0–100, base signal strength (set from the story).
//   signal_boost  true/false, the pilot's SGNL BST button. While on,
//             adds SIGNAL_BOOST (50) to the Signal readout and draws
//             SIGNAL_BOOST_COST (5) reactor points.
//   cabin_light  true/false, the pilot's CABIN LT button (starts off). The cabin
//             bulb (top of the screen) only glows while cabin_lit() —
//             the switch is on AND there's power left (power > 0). It
//             doesn't draw any power or reactor points.
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
//                     charge + scan + signal boost (add future systems
//                     here).
//     signal_strength()  signal, +SIGNAL_BOOST while SGNL BST is on:
//                     the Signal readout (shows "100+" above 100).
//     power_cost()    what pressing LAUNCH will cost right now: 1 power
//                     per REACTOR_PER_POWER (4) points of the Reactor
//                     lever setting (whether or not they're used) —
//                     0 unless a thruster/sideSpace launch is pending.
//     projected_power()  power - power_cost(), never below 0: the
//                     Power dial.
//     launch_pending()   the story has ordered a mode the pilot hasn't
//                     engaged yet.
//     launch_ready()  launch_pending() AND the criteria are met — the
//                     big button is only pressable while this is true.
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
//     cabin_lit()     cabin_light and power > 0: whether the cabin
//                     bulb is actually glowing.
//   Warning lights flash yellow / red; clicking one stops the flashing
//   but keeps it lit:
//     Hull, Integrity       yellow below 70, red below 20
//     Reactor               yellow above 80% used, red at 100% (maxed)
//
//   The pilot can move the Shield, Reactor and Drive Charge levers, turn
//   the Scan knob and press SGNL BST / CABIN LT at any time after
//   launch; those call set_shield(), set_reactor(), set_drive(),
//   set_scan(), set_signal_boost() and set_cabin_light() below, so they
//   obey the same rules as the story.
//
//   Spending power: only engage() below spends it, when the pilot
//   presses LAUNCH for thruster or sideSpace. Scenes cost nothing.
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
//     ~ set_scan(50)            same as set_level(scan, 50)
//     ~ set_signal_boost(true)  SGNL BST on / off
//     ~ set_cabin_light(false)  CABIN LT on / off
//   (A plain `~ hull = 80` works too, but skips those rules — the
//   readout caps what it shows, branches see the raw value.)
//
// ── FLIGHT MODES ───────────────────────────────────────────────────────
//   movement                the flight mode the story ORDERS, one of the
//                           LIST items: stopped, thruster, sideSpace.
//                             ~ movement = thruster
//                           Setting it does NOT engage the mode — it
//                           tells the pilot what to engage. Being a
//                           LIST, a misspelled mode is a compile error,
//                           not a silent no-op.
//   engaged_movement        the flight mode the ship is ACTUALLY in. Only
//                           the pilot changes it, via the big button
//                           (engage() below). Branch on this for "are we
//                           moving yet": { engaged_movement == thruster: }
//
//   While the two differ, the big button asks the pilot to engage the
//   ordered mode:
//     thruster / sideSpace  reads LAUNCH, pressable only once the Drive
//                           Charge lever is all the way up (drive 100);
//                           set the other levers (reactor etc.) as
//                           desired first — pressing it spends
//                           power_cost() power and drains the drive
//                           charge back to 0.
//     stopped               reads STOP, always pressable, costs nothing.
//   The very first press (the launch out of the silo) is the exception:
//   no criteria, no power, and it doesn't touch either variable.

CONST SHIELD_COST = 0.5         // reactor points per shield %
CONST DRIVE_COST = 0.5          // reactor points per drive charge %
CONST SCAN_COST = 0.1           // reactor points per scan %
CONST SIGNAL_BOOST = 50         // signal added while SGNL BST is on
CONST SIGNAL_BOOST_COST = 5     // reactor points SGNL BST draws while on
CONST REACTOR_PER_POWER = 4     // reactor lever points per 1 power spent

VAR hull = 100
VAR power = 100
VAR reactor = 50
VAR shield = 0
VAR cargo = 72
VAR drive = 0
VAR scan = 0
VAR signal = 40
VAR signal_boost = false
VAR cabin_light = false
LIST movement = (stopped), thruster, sideSpace
VAR engaged_movement = stopped

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

=== function set_scan(to)
~ set_level(scan, to)

=== function set_signal_boost(on)
~ signal_boost = on

=== function set_cabin_light(on)
~ cabin_light = on

// ── FLIGHT MODES ───────────────────────────────────────────────────────
// See the header. js/story.js calls engage() when the pilot presses the
// big button after the initial launch; returns whether it engaged.

=== function launch_pending()
~ return engaged_movement != movement

=== function launch_ready()
{ not launch_pending():
    ~ return false
}
{ movement == stopped:
    ~ return true
}
~ return drive >= 100

=== function engage()
{ not launch_ready():
    ~ return false
}
~ power = projected_power()
// a launch spends the drive's charge; STOP leaves it alone
{ movement != stopped:
    ~ set_drive(0)
}
~ engaged_movement = movement
~ return true

// ── COMPUTED STATS ─────────────────────────────────────────────────────
// js/story.js calls each of these by name (its DERIVED_STATS list) to
// update the console, so the formulas live only here.

=== function integrity()
~ return hull + shield

// the bulb needs power in the pool, but never spends any
=== function cabin_lit()
~ return cabin_light && power > 0

=== function reactor_load()
~ temp load = shield * SHIELD_COST + drive * DRIVE_COST + scan * SCAN_COST
{ signal_boost:
    ~ load += SIGNAL_BOOST_COST
}
~ return load

=== function signal_strength()
{ signal_boost:
    ~ return signal + SIGNAL_BOOST
}
~ return signal

// whole-number division: 1 power per full REACTOR_PER_POWER points.
// Only a pending thruster/sideSpace launch costs anything.
=== function power_cost()
{ not launch_pending() || movement == stopped:
    ~ return 0
}
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
