// FALLING UP FLIGHT DECK — the story. Scenes (knots), dialogue and
// choices only; every tag, ship-state variable and helper function you
// can use here is documented at the top of ink/ship.ink. Each top-level
// knot is one scene, played in the order js/story.js's SCENE_KNOTS lists.
//
// Split this into more files as it grows — INCLUDE another .ink file
// below (e.g. INCLUDE characters/handler.ink) and scripts/compile-ink.js
// will pull it in automatically, no changes needed there.

INCLUDE ship.ink

-> game_start

=== game_start ===
# contact: Handler
# image: images/scenes/relay-probe.svg
Come in, Hauler Aeolus. Aeolus, do you read me?
* [Reading you loud and clear.]
    Good. Signal is clear on my end as well.
- How was launch?
* [A little bumpy, but nothing I'm not used to.]
    That ship's getting old.
* [Smooth as butter, Control.]
    Good to hear, considering how many flights that hauler has done.
- <> Ever consider doing an upgrade?
* [Negative, Control. This is my baby.]
    Haha, roger that, Aeolus.
-
* (q1) [So what's the job today, m'am?]
- {Easy haul. Custom machinery.|Any more questions?}
* [How far away is the drop?]
    Not far. Couple days and you'll be done. -> q1
* [Big load?]
    Negative. Should be no problem even for a small hauler like yours. -> q1
* [Let's go!]
    Confirmed, Aeolus. Continue on your orbit to Station Beta. After docking, they'll load you up, and I'll be in touch to let you know next steps.
-
* [Understood Control. Aeolus out.]
-
# countdown: 300
# image: clear
-> close

=== close ===
# countdown: 300
# image: clear
-> END
