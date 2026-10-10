// FALLING UP FLIGHT DECK — the story. Scenes (knots), dialogue and
// choices only; every tag, ship-state variable and helper function you
// can use here is documented at the top of ink/ship.ink. Each top-level
// knot is one scene; a scene picks the one after it with
// ~ queue(-> knot_name, seconds) — see STORY THREADS in ink/ship.ink.
//
// Split this into more files as it grows — INCLUDE another .ink file
// below (e.g. INCLUDE characters/handler.ink) and scripts/compile-ink.js
// will pull it in automatically, no changes needed there.

INCLUDE ship.ink
INCLUDE assist.ink

-> play_next

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
    Confirmed, Aeolus. Continue on your orbit to Station Zeta. After docking, they'll load you up, and I'll be in touch to let you know next steps.
-
* [Understood Control. Aeolus out.]
-
// Queue the next thread here once it's written, e.g.
~ queue(-> station_zeta, 300)
# image: clear
-> close

=== close ===
# image: clear
-> END

=== station_zeta ===
# contact: Handler
Aeolus, this is Control, come in.
* [I read you Control.]
- I read you on approach to Station Zeta. Can you confirm you have eyes on target?
# image: images/scenes/station_zeta.svg
* [Confirmed, control. He's a beaut.]
    "He", Aeolus?
    ** [Roger. Stations are boys. Ships are girls. Everyone knows that.]
        We've got to get you more time planet-side.
* [Confirmed, control. Time to dock this puppy.]
    Don't get ahead of yourself. Your part here is easy.
- You remember what to do for docking?
* [Easy enough. Turn on the autopilot and let it handle it.]
    Roger.
+ (waitwhat) [Wait, what do I do again?]
    Activate the autopilot. The button that reads as AUTO on your console.
- 
+ {!autopilot} [Wait, what do I do again?] 
    -> waitwhat
+ {autopilot} [Autopilot engaged.]
    Good. Just let the system handle this part.
- I'll be in touch after docking.
~ queue(-> station_zeta_dock, 60)
-> END

=== station_zeta_dock ===
Status?
+ [We're docked.]
    Roger. Good to hear.
+ [Locked in tighter than a... I don't know, something tight.]
    What the... alright Aeolus.
- Stand by to receive cargo.
+ [Roger.]
- Cargo loaded.
~cargo = 10
Ready to go?
+ [Control, my cargo hold is showing nowhere near capacity.]
- Hold on, checking.
Confirmed, you're good Aeolus. It's a small but critical load.
+ [Someone is chartering a hauler just for this?]
- Yep. Nice to have boatloads of money. 
Confirm autopilot is engaged and you can move on to the jumpgate. -> auto
= auto
+ {!autopilot} Re-engaging autopilot...
    Waiting on your signal. -> auto
+ {autopilot} Autopilot engaged.
- Good. I'll contact again once you're clear of Zeta.
~ queue(-> station_zeta_depart, 60)
-> END

=== station_zeta_depart ===
Clear, Aeolus?
+ [Yep, ready to go.]
+ [I'm more clear than a...]
    ++ [I'm not gonna do that again.]
        Sounds smart, Aeolus.
- I have your flightpath registered with Emerson Jumpgate. They'll be expecting you. Please proceed.
+ [NEED more story!]
    -> END
    
    
    
    
    