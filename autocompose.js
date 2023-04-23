/* import this after mouseboard.js */

/* state for the autocomposer */
const COMPOSER_STATE = {
    "currentlyPlaying": false,
    "keyCenterCOFIndicesQueued": [], /* should be a list of circleOfFifthsIndex values */
    "currentKey": undefined, /* same format as targetKey */
    "barsQueued": [], /* bars of music queued up. see makeBossaHoldingPattern for generating one bar */
    // melodyplayer: todo... meowsynth player that plays melody on top of the chord progy.
    "currentlyPlayingBarName": "",
    "howManyBarsPlayed": 0, /* so that we know which Tone.Transport bar/measure is the latest to schedule new bars at */
}

const SCHEDULING_DELAY_FOR_LAG_PREVENTION = 0.05;

const centDistToCircleOfFifthsDist = c => (5*c/100) % 12 + (c < 0 ? 12 : 0);

/* random choice functions for autocomposer */
const randomlyLengthen = t => t + Math.random() * 0.2;

function makeBossaHoldingPattern(variation, voicingButton) {
    /* duration is bars:quarternotes:sixteenthnotes*/
    /* return one bar/measure of inputs */
    const patternName = "Hold (variant " + variation + ")";
    let patternEvents;
    if (variation === 1)  {
        patternEvents = [
            {"key": "z", "time": "0:0", "duration": "8n"},
            {"key": voicingButton, "time": "0:0:2", "duration": "16n"},
            {"key": "z", "time": "0:0:3", "duration": Tone.Time("16n")-0.1},
            {"key": "a", "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))},
            {"key": voicingButton, "time": "0:0:5", "duration": "16n"},
            {"key": "a", "time": "0:0:7", "duration": Tone.Time("16n")-0.1},
            {"key": "z", "time": "0:0:8", "duration": "16n"},
            {"key": voicingButton, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))},
            {"key": "z", "time": "0:0:11", "duration": Tone.Time("16n")-0.1},
            {"key": "a", "time": "0:0:12", "duration": "8n"},
            {"key": voicingButton, "time": "0:0:14", "duration": "16n"},
        ];
    }
    else if (variation === 2) {
        patternEvents = [
            {"key": "z", "time": "0:0", "duration": "8n"},
            {"key": voicingButton, "time": "0:0:2", "duration": "16n"},
            {"key": "z", "time": "0:0:3", "duration": Tone.Time("16n")-0.1},
            {"key": "a", "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))},
            {"key": voicingButton, "time": "0:0:5", "duration": "16n"},
            {"key": "a", "time": "0:0:7", "duration": Tone.Time("16n")-0.1},
            {"key": "z", "time": "0:0:8", "duration": "16n"},
            {"key": voicingButton, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))},
            {"key": "z", "time": "0:0:11", "duration": Tone.Time("16n")-0.1},
            {"key": "a", "time": "0:0:12", "duration": "8n"},
            {"key": voicingButton, "time": "0:0:12", "duration": "8n"},
            {"bassCOFshift": 5},
            {"key": voicingButton, "time": "0:0:14", "duration": "16n"},
            {"bassCOFshift": -5}
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

function queueBossaModulationPatterns(bassCOFshift, variation) {

}

function updateAutoComposerDisplay() {
    const autoComposerInfoDisplay = document.getElementById("autocomposer-info-display");
    autoComposerInfoDisplay.innerText = "";

    const currentBarInfoElem = document.createElement("span");
    const miscInfoElem = document.createElement("span");
    
    if (COMPOSER_STATE.currentlyPlaying) {
        currentBarInfoElem.append("Currently playing pattern: ", !COMPOSER_STATE.currentlyPlayingBarName ? 
            "Loading and scheduling bars..." : COMPOSER_STATE.currentlyPlayingBarName);
        miscInfoElem.append("Number of bars played: " + COMPOSER_STATE.howManyBarsPlayed);
    }
    else {
        currentBarInfoElem.innerText = "Press play to start";
    }
    autoComposerInfoDisplay.append(currentBarInfoElem, document.createElement("br"), miscInfoElem);
}

function interpretPatternEvent(event) {
    /* schedule chordtriggers and manipulate MOUSEBOARD_STATE based on our
     * pattern event data. */
    if (event.key !== undefined) {
        /* key press event, containing "key" (char representing keyboard key)
        and "duration" and "time" (number or Tone.Time) fields. */
        ChordTriggers.on(event.key, true, 
            Tone.Time(event.duration), 
            SCHEDULING_DELAY_FOR_LAG_PREVENTION + Tone.Transport.seconds + Tone.Time(event.time));
    }
    else if (event.bassCOFshift !== undefined) {
        /* bass change event, change MOUSEBOARD_STATE's selected bass. Contains
         bassCOFshift field, which is the offset (in circle of fifths index!!
         not cents!!) that is then interpreted as the amount to shift in cents
         via the circleOfFifthsQueryFn. The reason the offset is subtracted
         rather than added is because it's easier to think about moving
         counterclockwise thru the circle of fifths (resolving by fifths
         direction) */
        const newBassCOFIndex = -event.bassCOFshift + MOUSEBOARD_STATE.bassNoteSelected.cofIndex;
        /* we do not rely on the basspads array here! this lets us select cents
         * and pitches independently of what the defined basspads are, only
         * using the circleOfFifthsQueryFn (which is called inside globallySelectNewBass)  */
        globallySelectNewBass(newBassCOFIndex);
    }
}

function startAutoComposer() {
    Tone.Transport.bpm.value = 80;
    Tone.Transport.cancel(0);
    ChordTriggers.sync();
    Tone.Transport.scheduleRepeat(_ => {
        let bar = COMPOSER_STATE.barsQueued.pop();
        if (!bar) {
            /* if there is no queued bar, just go into the holding pattern */
            bar = makeBossaHoldingPattern(((COMPOSER_STATE.howManyBarsPlayed+1) % 4 === 0) ? 2 : 1, "f");
        }
        /* NOTE for future... the time passed into transport callbacks is
         * actually global time, not transport seek position. For that we can
         * use Tone.Transport.seconds. */
        for (const event of bar.events) {
            interpretPatternEvent(event);
        }
        COMPOSER_STATE.currentlyPlayingBarName = bar.name;
        COMPOSER_STATE.howManyBarsPlayed++;
        updateAutoComposerDisplay();
    }, "1m", 0);
    MOUSEBOARD_STATE.basspads.forEach(b => {
        b.element.classList.toggle("basspad-during-autocompose");
        b.hoverEventEnabled = false;
    });
    Tone.Transport.start();
}

function stopAutoComposer() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    COMPOSER_STATE.keyCenterCOFIndicesQueued = [];
    COMPOSER_STATE.howManyBarsPlayed = 0;
    ChordTriggers.unsync(); /* return manual control over trigger inputs */
    ChordTriggers.allOff(); /* force turn off any hanging notes */
    updateAutoComposerDisplay();
    updateChordDisplay();
    MOUSEBOARD_STATE.basspads.forEach(b => {
        b.element.classList.toggle("basspad-during-autocompose");
        b.hoverEventEnabled = true;
    });
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
            COMPOSER_STATE.keyCenterCOFIndicesQueued.push(circleOfFifthsIndex);
        }
    }
    for (const basspad of MOUSEBOARD_STATE.basspads) {
        basspad.element.addEventListener("click", e => {e.preventDefault(); targetNewKeyFromBasspad(basspad.circleOfFifthsIndex); });
        basspad.element.addEventListener("touchstart", e => {e.preventDefault(); targetNewKeyFromBasspad(basspad.circleOfFifthsIndex); });
    }
}