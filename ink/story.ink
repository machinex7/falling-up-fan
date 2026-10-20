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
* (q1) [So what's the job today?]
- {Easy haul. Custom machinery. Class D stuff, nothing fancy.|Any more questions?}
* [How far away is the drop?]
    Not far. Couple days and you'll be done. -> q1
* [Big load?]
    Negative. Should be no problem even for a small hauler like yours. -> q1
* [Let's get to work.]
    Confirmed, Aeolus. Continue on your orbit to Station Zeta. After docking, they'll load you up, and I'll be in touch to let you know next steps.
-
* [Understood Control. Aeolus out.]
-
// Queue the next thread
~ queue(-> station_zeta, 300)
~ waypoint = "Station Zeta"
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
~ proximity = "Station Zeta"
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
# contact: Handler
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
Confirm autopilot is engaged, then you can move on to the jumpgate. -> auto
= auto
+ {!autopilot} [Re-engaging autopilot...]
    Waiting on your signal. -> auto
+ {autopilot} [Autopilot engaged.]
- Good. I'll contact again once you're clear of Zeta.
~ queue(-> station_zeta_depart, 60)
-> END

=== station_zeta_depart ===
# contact: Handler
Clear, Aeolus?
+ [Yep, ready to go.]
+ [I'm more clear than a...]
    ++ [I'm not gonna do that again.]
        Sounds smart, Aeolus.
- I have your flightpath registered with Emerson Jumpgate. They'll be expecting you. -> disengageauto
= disengageauto
{autopilot} Disenage your autopilot before proceesing.
+ {autopilot} [Roger] -> disengageauto
Now charge your thrusters and get going.
~ waypoint = "Emerson Jumpgate"
~ proximity = "Clear"
~movement=thruster
-> getmoving
=getmoving
+ {getmoving < 3} [Uh, Control?]
    Yep?
    ++ [I stayed up too late last night... How do I get moving again?]
    Sigh. I got you.
    Move your Drive Charge into the max position.
    If your reactor shows red, then be sure to increase it as well. No point straining your ship right from the start.
    Then hit the Launch button.
    -> getmoving
+ {drive < 100} [Checking Drive Charge. One moment, Control.]
    Take your time. -> getmoving
+ {drive == 100 || engaged_movement == thruster} [Fully charged and good to go.]
- Hit it. Over and out.
# image: clear
~ queue(-> emerson_jumpgate, 60*60)
-> END

=== emerson_jumpgate ===
# contact: Emerson Jumpgate
~ proximity = "Emerson Jumpgate"
A22404. Come in, A22404. This is Jumpgate Emerson Coordination.
+ [I read you Emerson. This is Hauler A22404, callsign Aeolus.]
- Got you, Aeolus. Confirming flight manifest.
Processing...
Please confirm your cargo.
+ [Light Cargo. Machinery. Class D only.]
- Roger. You are instructed to move to all stop.
~movement=stopped
+ [Wait, what?]
+ [Is there a problem, Emerson?]
- You are ordered to full stop, Aeolus.
Immediately. -> ejstop
= ejstop
+ {movement!=stopped} [Understood, stopping now.]
    -> ejstop
Over and out.
~ queue(-> emerson_jumpgate_control, 2*60)
-> END


=== emerson_jumpgate_control ===
#contact: Handler
Come in, Aelous.
+ [Aelous here. Glad to hear a friendly voice.]
- I read you sitting just outside range of Emerson Jumpgate, can you confirm?
+ [Confirmed. I'm a ways out still, but I can see it. Big old circle thingy.]
- Yes.
"Big old circle thingy."
+ [Control, I was on approach to the jumpgate when I was ordered to hold position. What gives?]
- I just learned of it myself.
+ [Am I in trouble?]
- Negative. Priority transport coming through. ALL ships are being ordered to hold position.
Be happy, Aelous. Some ships that didn't have their manifest filed yet were ordered to return planetside.
+ [Whoa. Any idea who's getting the golden treatment?]
- Transport Zagan. Should be coming into view soon.
#image: zagan
+ [WHOA. That's the Capitol's own personal hauler!]
    ++ [I get it now.]
- Yep. They're undoubtedly carrying priceless cargo. Or cargo worth more than we can imagine.
Once they're through, the jumpgate will return to normal operation and you'll be one of the first in line.
Let this be a lesson: always get your paperwork in quick.
+ [You're the best, control.]
- Roger. Over and out.
~ queue(-> emerson_jumpgate_launch, 10*60)
-> END


=== emerson_jumpgate_launch ===
# contact: Emerson Jumpgate
# image: emerson_jumpgate
Hauler Aeolus, A22404. Come in, A22404.
+ [This is A22404, responding.]
- Jump gate clear. Manifest registered for Sector 74 Delta. You are clear to engage drive for side space.
+ [Roger, Emerson. I'll be out of your hair in a jiffy.]
- Uh, roger that A22404.
~ queue(-> emerson_jumpgate_launch_help, 30)
-> END
=== emerson_jumpgate_launch_help ===
# contact: Handler
Aeolus, this is Control. You've got clearance to launch.
~ start_lock(0, 40, 50) //difficulty, phase, freq
Why are you still sitting there? -> scanning
= scanning
* [Uh, Control?]
    Yeah, Aeolus?
    ++ [How do I do that again?]
        You're kidding.
        You're lucky you got me, Aelous. You need to scan for the homing signal on 74D.
        +++ [I say that every day.]
            Adjust your Phase and Frequency knobs until you're locked in.
            You can increase your Scan intensity, but you probably don't need to waste the power this time. Should be pretty close to the center.
            ++++ [Roger. Thanks Control.]
                -> scanning
+ {!locked_on() && scanning} [Look good, Control?]
    {locked_on():
        Not yet. Keep adjusting your Phase and Frequency until they are both locked in. -> scanning
    - else:
        Good work. -> launch
    }
+ {locked_on()} [Got the scan in Control.]
    Good work. -> launch
= launch
~ end_lock()
Don't forget, while you are traveling through side space I'll have a harder time contacting you.
All that's left is to max out your drive charge and hit Launch.
+ [See you on the other side, Control.]
- Godspeed, Aeolus
~movement=sideSpace
~ queue(-> TODO, 24*60*60)
-> END


=== TODO ===
+ [MORE STORY coming!]
    -> END
//start_lock(3, 62, 18)     difficulty 3, target phase 62, freq 18
//locked_on():
//             ~ end_lock()
    
    
    
    
    