// FALLING UP FLIGHT DECK — the ship's AI assistant. Not a story thread:
// js/story.js plays the `assist` knot from the top every time the pilot
// presses the ASSIST button (it's disabled while a COMMS conversation is
// still going), in the same comms panel COMMS uses. INCLUDEd from
// ink/story.ink.
//
// Rules for this file:
//   - `assist` is the one entry point; keep its name (js/story.js's
//     ASSIST_KNOT). Add more knots here for it to divert to.
//   - Never call queue() here. Ending an assist conversation never
//     starts the mission timer, and a queue() call would replace
//     whatever scene the story has lined up next.
//   - No `# image:` tags. The window belongs to the story.
//   - Ship state is fair game to read ({ shield }, { launch_ready() }).
//     Change it only if helping the pilot really calls for it.
//   - An incoming COMMS scene cuts an assist conversation off, so don't
//     count on it being finished.

=== assist ===
# contact: Assist
Ship assistant online. What do you need?
- (menu)
+ [How do I launch?]
    -> launch_help
+ [Ship status?]
    -> status_report
+ [Nothing, thanks.]
    Standing by.
    -> END

= launch_help
{ launch_ready():
    Drive charge is full. Press LAUNCH when you're ready.
- else:
    { launch_pending():
        Push the Drive Charge lever all the way up, then press LAUNCH.
    - else:
        Nothing to launch for right now. Control will tell you where to go.
    }
}
-> menu

= status_report
Hull at {hull}%. Power at {power}%. Shield at {shield}%.
{ overloaded():
    Warning: the reactor is overloaded. Lower the Shield or Drive Charge, or raise the Reactor lever.
}
-> menu
