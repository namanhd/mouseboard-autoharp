# mouseboard-autoharp

An "autoharp" (chord-playing instrument with chord buttons), inspired by the
touch autokalimba https://foldr.moe/harp. Featuring automatic voice leading!!
Easily play jazzed-up progressions and accompany your singing or whistling.

---
*Instructions are also available in-app, but here are some more detailed notes.*

---

## **New**: Bossa Nova Autocomposer mode
The mouseboard now features an Autocomposer feature which generates bossa nova
music ad infinitum.
- When the Autocomposer plays, the bass note pads become clickable (tappable).
  Clicking on a pad while the Autocomposer plays will "request" a new key for
  the Autocomposer to try to smoothly move to. It will queue up bars with chord
  progressions in order to modulate to each requested key in order.
- This queue is displayed, showing new bars calculated each time the user
  requests a key center. Every four beats, one queued bar is popped from the
  queue and played. If there is nothing queued, a holding pattern plays.
  Detailed info on the current bar's progression type and voicings is displayed
  also.
- A Random button is available for requesting random keys without having to
  click around on the circle of fifths layout. This makes the Autocomposer
  surprisingly addictive... (where will the Autocomposer take me next!!)
- This definitely would not be complete without a bossa nova drum track. The
  drum instruments used are from SNES games! (specifically, the kick is from
  "Waterworld", the shaker is from "Ken Griffey Jr's Winning Run", and the stick
  is from "Super Bomberman 3".)

Other new things added since Manual mode:
- New timbres. The chord sound is now an FM electric piano, and the bass an AM
  bass that somewhat resembles an acoustic bass.
- A piano layout for the bass note pads
- Onscreen voicing buttons for touch displays, plus responsive-design CSS
  gymnastics (everything should look and feel passable on most phone/tablet
  screens now hopefully!)

### Autocomposer technical notes
- All rules-based, no AI/ML needed 😋
- I hand-wrote a handful of **individual patterns**, incorporating randomness
where multiple chord voicings, bass shifts, or rhythm patterns may be
compatible. These choices were my own and greatly inform how the music sounds,
so you could probably call this an "interactive composition" rather than an
"automatic composer".
- The **sequencing of modulating patterns** to reach arbitrary key centers is
automated, but rules-based; the handwritten patterns cover only a few possible
key transitions, so the code takes over and breaks the requested key transitions
into appropriate smaller blocks that do have written patterns and modifies them
to fit each possible key transition, taking care to insert resolutions where
natural. The main algorithm for producing bars given a key shift is pretty
hefty, pretty much a recursive, 550-line chunk of music theory; very fun to
peruse.
- **Automatic voice leading** works wonders in making this sound convincing. The
latest auto voice leading algorithm is done by the chordplayers, and not
individual voices, so oversight of all playing voices is available for the
smoothest possible voice leading. There are lots of heuristics to make the voice
leading work well, and more tweaking is called for.
- My personal record for leaving this thing playing continuously in the
background is somewhere over 1200 bars.

## Manual mode: Basic usage
- Select a bass note by hovering your mouse over the note pads. Play that bass and premade chords built on it using the computer keyboard.

- Press **z** to play the selected bass note; press one of the voicing buttons (currently available: **x, c, v, b, s, d, f, g, h, q, w, e, r, t, y**) to play a chord voicing (a set of intervals) on top of that bass note. The **z** bass button can be held or released independently from the voicing buttons.
    - For instance, **s** alone plays the minor 9th chord voicing of the current bass (which plays four tones: a minor 3rd, perfect 5th, minor 7th, major 9th above the root). Pressing **z+s** plays the minor 9th with the bass note (an octave below) included too. 
    - A full list of voicings is available in the instrument's interface.
    - *Recommended finger position*: ring or pinky on the **z**, and the rest of the fingers pivot around it to reach the voicing buttons, which are nearby.


- Suggested chord progressions to try are in the in-app on-screen instructions. Moving the mouse around the circle of fifths (counterclockwise) and playing chords at each step is almost sure to result in a satisfying progression; however, playing more complicated music is possible and encouraged 😼

- The current bass note does not change if you hover away from its note pad (unless the cursor touches another bass note pad.) Hovering over a different bass will also not change any pitches already playing; it will affect the next triggered bass note or chord voicing.

- The circle-of-fifths layout can be toggled between a circle (default) and a Tonnetz grid (also in circle-of-fifths order but in staggered rows such that triads are in a triangle).

## Technical notes; inspiration
- Inspired by [the autokalimba](https://foldr.moe/harp), whose bass-and-voicing-buttons model is a great tool that fits how I create music and think about music theory. That instrument was intended to be used on phone screens; I wanted to explore ways to bring this interface to the mouse and keyboard.
    - In adapting it to mouse and keyboard, I found that separating the two-part interface into a hover component (the mouse) and a button component (the keyboard) makes it slightly easier to coordinate finding bass notes and hitting chord voicings, compared to having to position fingers and press buttons independently on both hands. The mouseboard's interface is more similar to how we already navigate computers; with a mouse to seek on the screen, and by touch on the keyboard.
    
    - Mouse-and-keyboard use is associated with larger screens. Exploiting this, I'm able to lay out the bass note pads in a full circle-of-fifths or tonnetz grid arrangement. This lets the instrument work as a music theory learning tool of sorts. The user can see relations between root notes and chords in the circle of fifths as they move the mouse across the pads and play chords. For instance, one can see that a tritone is to reach the note on the opposite side of the circle of fifths.

- I also wanted to improve on the autokalimba by featuring basic automatic voice leading. Voice leading is choosing the right octaves for the notes in a chord such that they smoothly transition from a previous chord's notes (i.e. voices). Automating voice leading makes it easier to get natural-sounding progressions using otherwise pre-made chord voicings with no control over the individual notes.
    - Each chord here is at most 4 voices (each voice a Tone.js monophonic synth). A naive implementation octave-shifts each voice on trigger so that they play the requested note in the octave that would be closest to their last-played note.
    - However, this can quickly cascade to subsequent triggers, causing all voices to stray too low or too high. Thus, there is some thresholding to make sure to reset when too many consecutive octave shifts in the same direction have been done.
    - One can also manually reset voice leading with the backtick (`) button.
- I've also incorporated a chord symbol display, to show what chord the user is playing. 
    - Getting this to work correctly, accounting for all the different ways a user could hold and release the voicing buttons independently from the bass button, was a challenge.
    - Each voicing need not contain its bass note (that's on the **z** button only), but aurally it still *implies* a bass root note. The instrument keeps track of the bass note associated with/implied by each playing voicing, and shows the user that they're playing a slash chord if the **z**-button bass note is not the same as the implied bass note.
    - The ability to hold down voicings but still move the mouse to a different bass note (or vice versa) is very powerful for getting more complicated harmony than would be possible with the premade voicings alone.
- Because the selected bass note switches as soon as the cursor enters a note pad, the user is free to flick their mouse *across* it as long as it makes contact. This allows using agile mouse movements to switch bass notes and play chords really quickly. This, along with the ability to independently hold or release the **z** bass while choosing different voicings, gives this instrument surprisingly large room for complicated maneuvers and techniques.
