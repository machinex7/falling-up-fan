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
// A tag (# key: value) applies when the line it's attached to is shown,
// so put "from the start of the scene" tags on the opening line and
// "once the scene is over" tags on the closing line. Unknown keys are
// ignored.
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
//   # hull: 80      set the hull to 80%
//   # hull: -15     damage: subtract 15%
//   # hull: +10     repair: add 10%
//       Writes the `hull` variable below (clamped 0–100). The console's
//       Hull readout always shows it.
//
//   # power: 80  /  # power: -15  /  # power: +10
//       Same as hull, for the `power` variable (Power readout).
//
//   # reactor: 80  /  # reactor: -15  /  # reactor: +10
//       Same as hull, for the `reactor` variable (Reactor readout).
//
//   # movement: stopped | thruster | sideSpace
//       Writes the `movement` variable below — the ship's current
//       movement mode. Any other value is ignored (with a console
//       warning).
//
// ── VARIABLES ──────────────────────────────────────────────────────────
// Readable anywhere for branching ({ hull < 50: ... }) and writable
// with ~ as well as with the tags above — js/story.js watches all of
// them, so `~ hull -= 10` and `# hull: -10` do the same thing. Values
// written with ~ are clamped 0–100 on the readout but not in ink, so
// keep them in range yourself (the tags clamp for you).

VAR hull = 100              // 0–100, shown on the Hull readout
VAR power = 72              // 0–100, shown on the Power readout
VAR reactor = 100           // 0–100, shown on the Reactor readout
VAR movement = "stopped"    // "stopped" | "thruster" | "sideSpace"

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
