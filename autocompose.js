/* import this after mouseboard.js */

/* state for the autocomposer */
const COMPOSER_STATE = {
    "currentlyPlaying": false,
    "targetKey": undefined, /* should be {"label": string, "cents": number} */
    "currentKey": undefined, /* same format as targetKey */
    "barsQueued": [], /* bars of music queued up. see makeBossaHoldingPattern for generating one bar */
    // melodyplayer: todo... meowsynth player that plays melody on top of the chord progy.
    "currentlyPlayingBarName": "",
    "howManyBarsPlayed": 0, /* so that we know which Tone.Transport bar/measure is the latest to schedule new bars at */
    "transportRepeaterEvent": undefined
}

const centDistToCircleOfFifthsDist = c => (5*c/100) % 12 + (c < 0 ? 12 : 0);


function makeBossaHoldingPattern(variation, voicingButton) {
    /* duration is bars:quarternotes:sixteenthnotes*/
    /* return one bar/measure of inputs */
    const patternName = "Hold (variant " + variation + ")";
    let patternEvents;
    if (variation === 1)  {
        patternEvents = [
            {"key": "z", "time": "0:0", "duration": "8n"},
            {"key": voicingButton, "time": "0:0:2", "duration": "16n"},
            {"key": "z", "time": "0:0:3", "duration": "16n"},
            {"key": "a", "time": "0:0:4", "duration": "16n"},
            {"key": voicingButton, "time": "0:0:5", "duration": "16n"},
            {"key": "a", "time": "0:0:7", "duration": "16n"},
            {"key": "z", "time": "0:0:8", "duration": "16n"},
            {"key": voicingButton, "time": "0:0:9", "duration": "16n"},
            {"key": "z", "time": "0:0:11", "duration": "16n"},
            {"key": "a", "time": "0:0:12", "duration": "8n"},
            {"key": voicingButton, "time": "0:0:14", "duration": "16n"},
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

function startAutoComposer() {
    Tone.Transport.bpm.value = 80;
    Tone.Transport.cancel(0);
    ChordTriggers.sync();
    COMPOSER_STATE.transportRepeaterEvent = Tone.Transport.scheduleRepeat(_ => {
        let bar = COMPOSER_STATE.barsQueued.pop();
        if (!bar) {
            /* if there is no queued bar, just go into the holding pattern */
            bar = makeBossaHoldingPattern(1, "f");
        }
        /* NOTE for future... the time passed into transport callbacks is
         * actually global time, not transport seek position. For that we can
         * use Tone.Transport.seconds. */
        for (const event of bar.events) {
            ChordTriggers.on(event.key, true, Tone.Time(event.duration), Tone.Transport.seconds + Tone.Time(event.time));
        }
        COMPOSER_STATE.currentlyPlayingBarName = bar.name;
        COMPOSER_STATE.howManyBarsPlayed++;
        updateAutoComposerDisplay();
    }, "1m", 0);
    console.log("scheduled measure-filling event to repeat every measure");
    
    Tone.Transport.start();
}

function stopAutoComposer() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    COMPOSER_STATE.transportRepeaterEvent = undefined;

    COMPOSER_STATE.howManyBarsPlayed = 0;
    ChordTriggers.unsync(); /* return manual control over trigger inputs */
    ChordTriggers.allOff(); /* force turn off any hanging notes */
    updateAutoComposerDisplay();
    updateChordDisplay();
}

function setupAutoComposer() {
    /* add click events to the play/stop button */
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
    }
    const playButton = document.getElementById("autocomposer-play-button");
    playButton.addEventListener("click", e => togglePlayWithButton(playButton));

    /* add click events to the basspads */
    const targetNewKeyFromBasspad = (label, cents) => {
        COMPOSER_STATE.targetKey = {"label": label, "cents": cents};
    }
    for (const basspad of STATE.basspads) {
        basspad.element.addEventListener("click", targetNewKeyFromBasspad(basspad.label, basspad.cents));
    }
}