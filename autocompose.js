/* import this after mouseboard.js */

/* voicing keyboard dict, easier to read the voicings used in the code here  */
const __K = 
  { "b" : "z"
  , "lb": "a"
  , "m7" : "x"
  , "d7" : "c"
  , "M7": "v"
  , "s13": "b"
  , "m9": "s"
  , "d9": "d"
  , "M9": "f"
  , "d13": "g"
  , "m7b5": "h"
  , "two": "q"
  , "dim": "w"
  , "aug": "e"
  , "d7b9": "r"
  , "alt": "t"
  , "d7s5": "y"
  }


/* state for the autocomposer */
const COMPOSER_STATE = 
  { "currentlyPlaying": false
  , "lastKeyCenterCOFIndexQueued": undefined /* a circleOfFifthsIndex value */
  , "currentBarTargetingKeyCenterCOFIndex": undefined 
  /* ^^ same format as lastKeyCenterCOFIndexQueued; the key center that the
   * current playing bar will arrive at when it ends  */
  , "barsQueued": [] 
  , "preferredHoldPatternVoicing": __K.M9 /* we may prefer M7 instead of M9 for instance */
  /* ^^ bars of music queued up. see makeBossaHoldingPattern for generating one bar */
    // melodyplayer: todo... meowsynth player that plays melody on top of the chord progy.
  , "currentlyPlayingBarName": ""
  , "howManyBarsPlayed": 0 
  /* ^^ so that we know which Tone.Transport bar/measure is the latest to
   * schedule new bars at */
  };

const SCHEDULING_DELAY_FOR_LAG_PREVENTION = 0.08;

/* random choice functions for autocomposer */
const randomlyLengthen = t => t + Math.random() * 0.2;
const staccato16n = Tone.Time("16n")-0.08;
const chooseFrom = (...xs) => xs[Math.floor(Math.random() * xs.length)];

function makeBossaHoldingPattern(variation, voicingButton) {
    /* duration is bars:quarternotes:sixteenthnotes*/
    /* return one bar/measure of inputs */
    const patternName = "Hold (variant " + variation + ")";
    let patternEvents;
    if (variation === 1)  {
        patternEvents = 
          [ {"key": __K.b, "time": "0:0", "duration": "8n"}
          , {"key": voicingButton, "time": "0:0:2", "duration": "16n"}
          , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
          , {"key": __K.lb, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
          , {"key": voicingButton, "time": "0:0:5", "duration": "16n"}
          , {"key": __K.lb, "time": "0:0:7", "duration": staccato16n}
          , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
          , {"key": voicingButton, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
          , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
          , {"key": __K.lb, "time": "0:0:12", "duration": "8n"}
          , {"key": voicingButton, "time": "0:0:14", "duration": "16n"}
          ];
    }
    else if (variation === 2) {
        patternEvents = 
          [ {"key": __K.b, "time": "0:0", "duration": "8n"}
          , {"key": voicingButton, "time": "0:0:2", "duration": "16n"}
          , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
          , {"key": __K.lb, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
          , {"key": voicingButton, "time": "0:0:5", "duration": "16n"}
          , {"key": __K.lb, "time": "0:0:7", "duration": staccato16n}
          , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
          , {"key": voicingButton, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
          , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
          , {"key": __K.lb, "time": "0:0:12", "duration": "8n"}
          , {"key": voicingButton, "time": "0:0:12", "duration": "8n"}
          , {"bassCOFShift": 5}
          , {"key": voicingButton, "time": "0:0:14", "duration": "16n"}
          , {"bassCOFShift": -5}
          ];
    }
    return {
        "name": patternName,
        "netCircleOfFifthsRotation": 0, 
        /* ^^ counterclockwise. how much this bar's progression progresses the
        key around the COF */
        "events": patternEvents
    }
}

function queueBossaModulationPatterns(bassCOFShift, variation) {
    bassCOFShift = normalizeCircleOfFifthsIndex(bassCOFShift);
    if (bassCOFShift === 0) {
        COMPOSER_STATE.barsQueued.push(makeBossaHoldingPattern(1, COMPOSER_STATE.preferredHoldPatternVoicing));
    }
    if (bassCOFShift === 1) {
        const nVariations = 3;
        const variationChoice = (variation % nVariations) + 1;
        if (variationChoice === 1) {
            /* simple dominant */
            const domVoicing = chooseFrom(__K.d9, __K.d7, __K.d13);
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": __K.M9, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.lb, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.M9, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:7", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": domVoicing, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.lb, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing, "time": "0:0:14", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:15", "duration": staccato16n}
              , {"bassCOFShift": 1, "preferHoldVoicing": (domVoicing === __K.d7 ? __K.M7 : __K.M9)}
              ];
            const bar = {
                "name": "V-I (" + (domVoicing === __K.d9 ? "dom9" : 
                                  (domVoicing === __K.d7 ? "dom7" : 
                                  (domVoicing === __K.d13 ? "dom13" : "")))
                                + ")",
                "netCircleOfFifthsRotation": 1, 
                "events": patternEvents
            };
            COMPOSER_STATE.barsQueued.push(bar);
        }
        else if (variationChoice === 2) {
            /* tritone sub */
            const tritoneSubVoicing = chooseFrom(__K.m7b5, __K.d9);
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": __K.M9, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.lb, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.M9, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
              , {"bassCOFShift": 6}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": tritoneSubVoicing, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": tritoneSubVoicing, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.b, "time": "0:0:14", "duration": "16n"}
              , {"key": tritoneSubVoicing, "time": "0:0:14", "duration": "16n"}
              , {"bassCOFShift": 7, "preferHoldVoicing": __K.M9}
              ];
            const bar = {
                "name": "V-I (tritone sub)",
                "netCircleOfFifthsRotation": 1, 
                "events": patternEvents
            }
            COMPOSER_STATE.barsQueued.push(bar);
        }
        else if (variationChoice === 3) {
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": __K.M9, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.M9, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:7", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": __K.d9, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.lb, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.alt, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.d7s5, "time": "0:0:14", "duration": "8n"}
              , {"key": __K.b, "time": "0:0:14", "duration": "16n"}
              , {"bassCOFShift": 1, "preferHoldVoicing": __K.M9}
              ];
            const bar = {
                "name": "V-I (+alt)",
                "netCircleOfFifthsRotation": 1, 
                "events": patternEvents
            }
            COMPOSER_STATE.barsQueued.push(bar);
        }
    } /* end bassCOFShift === 1*/
    else if (bassCOFShift === 2) {
        const nVariations = 1;
        const variationChoice = (variation % nVariations) + 1;
        if (variationChoice === 1) {
            /* ii-V-I */
            const subdomVoicing = chooseFrom(__K.m9, __K.m7, __K.m9);
            const domVoicing0 = chooseFrom(subdomVoicing === __K.m9 ? __K.d9 : __K.d7, __K.alt, __K.d7b9); /* m7 to 7, m9 to 9 */
            const domVoicing1 = chooseFrom(__K.alt, domVoicing0, __K.d7s5);
            const domVoicing2 = domVoicing1 === __K.d7s5 ? chooseFrom(__K.d7s5, __K.d7b9) : (domVoicing1 === __K.alt ? __K.d7b9 : domVoicing1);
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": subdomVoicing, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": subdomVoicing, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
              , {"bassCOFShift": 1}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": domVoicing0, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing1, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing2, "time": "0:0:14", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:15", "duration": staccato16n}
              , {"bassCOFShift": 1, "preferHoldVoicing": (domVoicing2 === __K.m9 ? __K.M9 : __K.M7)}
              ];
            const bar = {
                "name": "ii-V-I " + (subdomVoicing === __K.m9 ? "(m9 to 9)" : "(m7 to 7)"),
                "netCircleOfFifthsRotation": 2, 
                "events": patternEvents
            };
            COMPOSER_STATE.barsQueued.push(bar);
        }
        else if (variationChoice === 2) {

        }
        else if (variationChoice === 3) {

        }
    } /* end bassCOFShift === 2 */
}

function updateAutoComposerDisplay() {
    const autoComposerInfoDisplay = document.getElementById("autocomposer-info-display");
    autoComposerInfoDisplay.innerText = "";

    const currentBarInfoElem = document.createElement("div");
    const miscInfoElem = document.createElement("div");

    currentBarInfoElem.classList.add("autocomposer-info-display-text");
    
    const makeBold = text => {
        const e = document.createElement("strong");
        e.innerText = text;
        return e;
    }
    if (COMPOSER_STATE.currentlyPlaying) {
        currentBarInfoElem.append(makeBold("Playing bar: "), !COMPOSER_STATE.currentlyPlayingBarName ? 
            "(Loading)" : COMPOSER_STATE.currentlyPlayingBarName, makeBold(" \u2192 "), circleOfFifthsQueryFn(COMPOSER_STATE.currentBarTargetingKeyCenterCOFIndex, true).label);
        miscInfoElem.append("Number of bars played: " + COMPOSER_STATE.howManyBarsPlayed);
    }
    else {
        currentBarInfoElem.innerText = "Press play to start";
    }
    autoComposerInfoDisplay.append(currentBarInfoElem, miscInfoElem);
}

function interpretPatternEvent(event) {
    /* schedule chordtriggers and manipulate MOUSEBOARD_STATE based on our
     * pattern event data. An event can contain both bassCOFShift, key, and preferHoldVoicing 
     * types at the same time. The bass shift is processed first, followed by the key event, 
     * followed by the preferHoldVoicing. */
    
    if (event.bassCOFShift !== undefined) {
        /* bass change event, change MOUSEBOARD_STATE's selected bass. Contains
         bassCOFShift field, which is the offset (in circle of fifths index!!
         not cents!!) that is then interpreted as the amount to shift in cents
         via the circleOfFifthsQueryFn. The reason the offset is subtracted
         rather than added is because it's easier to think about moving
         counterclockwise thru the circle of fifths (resolving by fifths
         direction) */
        const newBassCOFIndex = MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex - event.bassCOFShift;
        /* we do not rely on the basspads array here! this lets us select cents
         * and pitches independently of what the defined basspads are, only
         * using the circleOfFifthsQueryFn (which is called inside globallySelectNewBass)  */
        globallySelectNewBass(newBassCOFIndex);
    }
    if (event.key !== undefined) {
        /* key press event, containing "key" (char representing keyboard key)
        and "duration" and "time" (number or Tone.Time) fields. */
        ChordTriggers.on(event.key, true, 
            Tone.Time(event.duration), 
            SCHEDULING_DELAY_FOR_LAG_PREVENTION + Tone.Transport.seconds + Tone.Time(event.time));
    }
    if (event.preferHoldVoicing !== undefined) {
        COMPOSER_STATE.preferredHoldPatternVoicing = event.preferHoldVoicing;
    }
}

function startAutoComposer() {
    Tone.Transport.bpm.value = 80;
    Tone.Transport.cancel(0);
    ChordTriggers.sync();
    /* this is just for info display purposes, but the autocomposer's starting
     * key center is whatever bass note was last selected by the user in manual
     * play mode */
    COMPOSER_STATE.currentBarTargetingKeyCenterCOFIndex = 
        MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex;
    Tone.Transport.scheduleRepeat(_ => {
        let bar = COMPOSER_STATE.barsQueued.shift();
        if (!bar) {
            /* if there is no queued bar, just go into the holding pattern */
            bar = makeBossaHoldingPattern(((COMPOSER_STATE.howManyBarsPlayed+1) % 4 === 0) ? 2 : 1
                    , COMPOSER_STATE.preferredHoldPatternVoicing);
        }
        /* NOTE for future... the time passed into transport callbacks is
         * actually global time, not transport seek position. For that we can
         * use Tone.Transport.seconds. */
        for (const event of bar.events) {
            interpretPatternEvent(event);
        }
        COMPOSER_STATE.currentlyPlayingBarName = bar.name;
        COMPOSER_STATE.currentBarTargetingKeyCenterCOFIndex -= bar.netCircleOfFifthsRotation;
        COMPOSER_STATE.howManyBarsPlayed++;
        updateAutoComposerDisplay();
    }, "1m", 0);
    MOUSEBOARD_STATE.basspads.forEach(b => {
        b.element.classList.toggle("basspad-during-autocompose");
        b.hoverEventEnabled = false;
    });
    document.getElementById("autocomposer-info-display").classList.toggle("autocomposer-info-display-playhead-animated");
    Tone.Transport.start();
}

function stopAutoComposer() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    COMPOSER_STATE.lastKeyCenterCOFIndexQueued = undefined;
    COMPOSER_STATE.howManyBarsPlayed = 0;
    ChordTriggers.unsync(); /* return manual control over trigger inputs */
    ChordTriggers.allOff(); /* force turn off any hanging notes */
    updateAutoComposerDisplay();
    updateChordDisplay();
    MOUSEBOARD_STATE.basspads.forEach(b => {
        b.element.classList.toggle("basspad-during-autocompose");
        b.hoverEventEnabled = true;
    });
    document.getElementById("autocomposer-info-display").classList.toggle("autocomposer-info-display-playhead-animated");
}

function setupAutoComposer() {
    /* add click events to the play/stop button */
    const cofBg = document.getElementById("circle-of-fifths-bg");
    const togglePlayWithButton = (button) => {
        COMPOSER_STATE.currentlyPlaying = !COMPOSER_STATE.currentlyPlaying;
        if (COMPOSER_STATE.currentlyPlaying) {
            button.innerText = "\uf04d"; /* stop button */
            button.style.fontSize = "1.70rem";
            startAutoComposer();
        }
        else {
            button.innerText = "\uf04b"; /* play button */
            button.style.fontSize = "1.75rem"; 
            stopAutoComposer();
        }
        cofBg.classList.toggle("cof-bg-during-autocompose");
        cofBg.classList.toggle("cof-bg-during-manual");
    }
    const playButton = document.getElementById("autocomposer-play-button");
    playButton.addEventListener("click", _ => togglePlayWithButton(playButton));

    /* add click events to the basspads */
    const targetNewKeyFromBasspad = (circleOfFifthsIndex) => {
        if (COMPOSER_STATE.currentlyPlaying) {
            /* if there is no last-queued key center, we take the selected
                bassnote from mouseboard (which should be the last bass note the
                user selected/hovered over in manual mode (not autocomposer
                mode) as well as the last scheduled bass note in autocomposer 
                mode */
            const last = COMPOSER_STATE.lastKeyCenterCOFIndexQueued;
            /* update to the last queued key center as a circle-of-fifths index */
            COMPOSER_STATE.lastKeyCenterCOFIndexQueued = circleOfFifthsIndex;
            queueBossaModulationPatterns(
                (last === undefined ? MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex : last) - circleOfFifthsIndex
                , Math.floor(12 * Math.random()));
        }
    }
    for (const basspad of MOUSEBOARD_STATE.basspads) {
        basspad.element.addEventListener("click", e => {e.preventDefault(); targetNewKeyFromBasspad(basspad.circleOfFifthsIndex); });
        basspad.element.addEventListener("touchstart", e => {e.preventDefault(); targetNewKeyFromBasspad(basspad.circleOfFifthsIndex); });
    }
}