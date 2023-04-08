
/* like autokalimba () but compatible with mouse, and has more affordances
 * based on the mouse and keyboard interface. */

const BASE_FREQ = 261.625/2;
const N_VOICES_PER_INSTRUMENT = 4;
const VOICE_LEADING_OCTAVE_SHIFT_MAX_NTIMES = 4;

/* "application state", things that can change over the course of execution */
const STATE = {
    "basspads":  undefined,
    "chordplayers": undefined,
    "info_bassNoteSelected": "C", /* this isn't shown in chorddisplay but is used in setting the other ones correctly */
    "info_bassNotePlaying": "",
    "info_bassNoteImpliedByVoicing": "",
    "info_voicing": "",
    "basspadLayout": "circle",
};

function centsToRatio(c) {
    return Math.pow(2, (c / 1200));
}

function updateChordDisplay() {
    const chordSymbolDisplay = document.getElementById("chord-symbol-display");
    chordSymbolDisplay.textContent = "";
    
    const selectedBassElem = document.createElement("strong"); /* hovered upon; updated via bass pads */
    const playingBassElem = document.createElement("strong"); /* clicked via the bass-only key */
    const impliedBassElem = document.createElement("strong"); /* activated whenever a voicing plays (the bass note implied by that voicing) */
    const voicingElem = document.createElement("span");
    
    /* the selected bass is the most recently hovered-on bass note. It also is the bass note of the
    currently playing voicing/last selected voicing. It may be different from the bass note that is
    actually playing (which may have been held from earlier), stored in STATE.info_bassNotePlaying.
    STATE.info_voicing is empty is no voicing is currently played.
    */
    // selectedBassElem.append(STATE.info_bassNoteSelected);
    impliedBassElem.append(STATE.info_bassNoteImpliedByVoicing);
    playingBassElem.append(STATE.info_bassNotePlaying);
    voicingElem.append(STATE.info_voicing);

    if (STATE.info_bassNoteImpliedByVoicing === STATE.info_bassNotePlaying) {
        chordSymbolDisplay.append(playingBassElem, voicingElem);
    }
    else {
        chordSymbolDisplay.append(impliedBassElem, voicingElem, (STATE.info_bassNotePlaying === "" ? "" : "/"), playingBassElem);
    }
    
    playingBassElem.style.color = STATE.info_bassNotePlaying === "" ? "lightgray" : "mediumslateblue";
    voicingElem.style.color = STATE.info_voicing === "" ? "lightgray" : "mediumslateblue";
    impliedBassElem.style.color = STATE.info_bassNoteImpliedByVoicing === "" ? "lightgray": "lightblue";
    // selectedBassElem.style.color = STATE.info_voicing === "" ? "lightgray" : "lightblue";

}


/* timbre */
/* useful docs about time https://github.com/Tonejs/Tone.js/wiki/Time 
  changing envelope of Synth(): https://tonejs.github.io/docs/14.7.77/Synth#envelope
  https://tonejs.github.io/docs/14.7.77/AmplitudeEnvelope 
*/

/* */
class Voice {
    constructor(autoVoiceLeadingMode="updown") {
        /* ddd more nodes to change the sound */
        this.volumeNode = new Tone.Volume(-12).toDestination();
        this.filterNode = new Tone.Filter(1400, "lowpass").connect(this.volumeNode);
        this.synth = new Tone.Synth().connect(this.filterNode); 
        this.synth.oscillator.type = "sawtooth";

        this.synth.envelope.attack = 0.02;
        this.synth.envelope.decay = 0;
        this.synth.envelope.sustain = 0.1;
        this.synth.envelope.release = 0.08;

        this.lastPlayedCents = undefined;
        this.autoVoiceLeadingMode = autoVoiceLeadingMode;
        this.timesOctaveShifted = 0; 
        /* if we octave shifted in the same direction for too long we'll reset voiceleading */
        /* can change envelope settings here maybe */
    }
    autoVoiceLeading(cents) {
        if (this.lastPlayedCents === undefined) {
            this.lastPlayedCents = cents;
            return cents;
        }
        /* allow +-1200 range in the given cents, whichever one is closest
         * to the last played value. However, clamp to be between -2400 and 
         * +2400  of the original requested cents */
        let tries;
        if (this.autoVoiceLeadingMode === "updown") {
            tries = [cents, cents-1200, cents+1200];
        } 
        else if (this.autoVoiceLeadingMode === "down") {
            tries = [cents, cents-1200];
        } 
        else {
            return cents;
        }
        
        const distancesToLastPlayedCents = tries.map(c => Math.abs(c - this.lastPlayedCents));
        const result = tries[distancesToLastPlayedCents.indexOf(Math.min(...distancesToLastPlayedCents))];
        if (result < cents) {
            this.timesOctaveShifted--;
        }
        else if (result > cents) {
            this.timesOctaveShifted++;
        }
        if (Math.abs(this.timesOctaveShifted) > VOICE_LEADING_OCTAVE_SHIFT_MAX_NTIMES) {
            this.resetVoiceLeadingMemory()
            return cents;
        }
        return Math.min(Math.max(result, cents - 2400), cents + 2400);
    }

    on(cents, velocity=1, doAutoVoiceLeading=true) {
        cents = doAutoVoiceLeading ? this.autoVoiceLeading(cents) : cents;
        this.lastPlayedCents = cents;
        this.synth.triggerAttack(BASE_FREQ * centsToRatio(cents), "0", velocity);
    }
    off() {
        this.synth.triggerRelease();
    }
    resetVoiceLeadingMemory() {
        this.lastPlayedCents = undefined;
    }
}

/* a Chordplayer is a set of voices that are triggered at the same time  */
class Chordplayer {
    constructor(nVoices=N_VOICES_PER_INSTRUMENT, autoVoiceLeadingMode) {
        /* voice leading modes include "updown" and "down". "updown" mode 
         * can pick a voice either an octave above or below the requested frequency;
         * "down" mode can only pick the frequency below. Good for bass voices. */
        this.nVoices = nVoices;
        this.voices = new Array(nVoices);
        this.bassCents = 0;
        for (let i = 0; i < nVoices; i++) {
            this.voices[i] = new Voice(autoVoiceLeadingMode);
        }
        this.currentlyPlayingDueToTrigger = undefined; 
        /* can be a keyboard key name or maybe touch button ID if present. 
        * Needed to know which chordplayers to turn off when a key is released.  */
    }
    on(triggeredBy, intervals, bassCents=undefined, velocity=1, doAutoVoiceLeading=true) {
        if (intervals.length === 0 || this.currentlyPlayingDueToTrigger !== undefined) {
            /* still playing, suppress new input */
            return false;
        }
        this.currentlyPlayingDueToTrigger = triggeredBy;
        /* bassCents: bass note pitch, given in terms of cents relative to BASE_FREQ.
         * this class stores its "current" bass pitch but this function can also be
         * called with something other than this.bassCents for flexibility */
        if (bassCents === undefined) {
            bassCents = this.bassCents;
        }
        for (let i = 0; i < this.nVoices; i++) {
            const interval = intervals[i];
            if (interval !== undefined) {
                this.voices[i].on(bassCents + interval, velocity, doAutoVoiceLeading);
            }
        }
        return true;
    }
    off(triggeredBy) {
        /* returns true if this turned off due to this input trigger event */
        if (triggeredBy === this.currentlyPlayingDueToTrigger) {
            for (const i in this.voices) {
                this.voices[i].off();
            }
            this.currentlyPlayingDueToTrigger = undefined;
            return true;
        }
        return false;
    }
}


/* A basspad represents a hoverable pad labeled with a bass note. On hover it 
 will change the bass note of the chordplayers to the labeled note. */
class Basspad {
    constructor(label, cents, element) {
        this.label = label;
        this.cents = cents;
        this.element = element;  /* the html element for this basspad*/
        this.element.addEventListener("mouseenter", (_=>this.hover(this)));
        this.element.addEventListener("touchstart", (_=>this.hover(this)));
    }
    hover(self) {
        /* activates on hover... changes the current bass note of the chordplayers to the pad's cents */
        STATE.chordplayers.bass.bassCents = self.cents;
        STATE.chordplayers.chord.bassCents = self.cents;
        STATE.info_bassNoteSelected = self.label;
        updateChordDisplay()
    }
}

const KEYBOARD_TO_VOICING_MAP = 
  { "z": {"name": "", "bass": [-1200], "chord": [], "voicelead": undefined}
  , "x": {"name": "m7", "bass": [], "chord": [0, 300, 700, 1000], "voicelead":true} /* m7 */
  , "c": {"name": "7", "bass": [], "chord": [0, undefined, 1000, 1600], "voicelead": true} /* dom7 */
  , "v": {"name": "M7", "bass": [], "chord": [0, 400, 700, 1100], "voicelead": true} /* M7 */
  , "s": {"name": "m9", "bass": [], "chord": [1000, 1400, 1500, 1900-1200], "voicelead": true} /* m9 */
  , "d": {"name": "9", "bass": [], "chord": [0, 400, 1000, 1400-1200], "voicelead": true} /* 9 */
  , "f": {"name": "M9", "bass": [], "chord": [1100, 1400, 1600, 1900-1200], "voicelead": true} /*  M9 */
  , "g": {"name": "sus7", "bass": [], "chord": [0, 1000, 1400, 1700], "voicelead": true}
  , "w": {"name": "aug", "bass": [], "chord": [0, 400, 800, 1200], "voicelead": false}
  , "e": {"name": "dim", "bass": [], "chord": [0, 300, 600, 900], "voicelead": true}
  , "r": {"name": "alt", "bass": [], "chord": [undefined, 400, 1000, 1500], "voicelead": false}
  , "t": {"name": "7♯5", "bass": [], "chord": [0, 800, 1000, 1200+400], "voicelead": true}
  }

class ChordTriggers {
    /* handles lsitening to both keyboard and touchscreen button events (todo) to 
      trigger chords... also defines the mapping from keyboard button/touchj button to voicings (maj7, min7, dom7, etc)
       Also also handles info display based on the bass and chords selected
     */
    static init() {
        console.log("initialized keyboard chord triggers");
        document.addEventListener("keydown", ChordTriggers.on);
        document.addEventListener("keyup", ChordTriggers.off);
        updateChordDisplay();
    }

    static on(e) {
        /* call this on the keydown/touchstart events */
        if (e.type === "keydown" && !(e.repeat)) {
            const triggerSpec = KEYBOARD_TO_VOICING_MAP[e.key];
            if (triggerSpec) {
                const bassTurnedOn = STATE.chordplayers.bass.on(e.key, triggerSpec.bass);
                const chordTurnedOn = STATE.chordplayers.chord.on(e.key, triggerSpec.chord, undefined, 0.8, triggerSpec.voicelead); /* lower velocity so we dont clip so horribly*/
                if (chordTurnedOn) {
                    STATE.info_voicing = triggerSpec.name;
                    STATE.info_bassNoteImpliedByVoicing = STATE.info_bassNoteSelected;
                }
                
                if (bassTurnedOn) {
                    STATE.info_bassNotePlaying = STATE.info_bassNotePlaying === "" ? STATE.info_bassNoteSelected : STATE.info_bassNotePlaying;
                }
                
                updateChordDisplay();
            }
            else {
                if (e.key === "`") {
                    /* reset voice leading */
                    STATE.chordplayers.chord.voices.forEach(voice => voice.resetVoiceLeadingMemory());
                    STATE.chordplayers.bass.voices.forEach(voice => voice.resetVoiceLeadingMemory());
                }
            }
        }
        /* TODO handle touch trigger button event */
        
    }
    static off(e) {
        /* if the keyup off event is for STATE.chordplayers.bass then it should
         * clear the STATE.info_bassNotePlaying value */
        if (STATE.chordplayers.bass.off(e.key) === true) {
            STATE.info_bassNotePlaying = "";
        }
        if (STATE.chordplayers.chord.off(e.key) === true) {
            STATE.info_voicing = "";
            STATE.info_bassNoteImpliedByVoicing = "";
        }
        updateChordDisplay();
    }
}

const CIRCLE_OF_FIFTHS_12EDO = [
    {"label": "F", "cents": 500},
    {"label": "C", "cents": 0},
    {"label": "G", "cents": 700},
    {"label": "D", "cents": 200},
    {"label": "A", "cents": 900},
    {"label": "E", "cents": 400},
    {"label": "B", "cents": 1100},
    {"label": "F♯", "cents": 600},
    {"label": "C♯", "cents": 100},
    {"label": "A♭", "cents": 800},
    {"label": "E♭", "cents": 300},
    {"label": "B♭", "cents": 1000}
];

/* circle-of-fifths function... by default cycles through the 12-note circle,
 * but we can reimplement this function later to do exotic microtonal stuff.
 * the call signature should be i -> {"label":str, "cents":int}*/
function queryCircleOfFifths12EDO(i) {
    return CIRCLE_OF_FIFTHS_12EDO[i % 12];
}

let circleOfFifthsQueryFn = queryCircleOfFifths12EDO; /* change this out */


/* lay out the basspads in either a circle of fifths or a tonnetz grid */
function layoutBasspads(style=undefined) {
    const n_basspads = STATE.basspads.length;

    if (!style) {
        /* toggle depending on the style stored in STATE */
        style = STATE.basspadLayout === "circle" ? "tonnetz" : "circle";
        STATE.basspadLayout = style;
    }
    if (style === "circle") {
        const arc = 2 * Math.PI / n_basspads;
        const startAngle = 0.5 * Math.PI;
        const radiusPercentage = 35;

        for (const i in STATE.basspads) {
            const angle = startAngle + (-i) * arc;
            const basspadElem = STATE.basspads[i].element;
            
            basspadElem.classList.remove("basspad-tonnetz");
            basspadElem.classList.add("basspad-circle");
            
            basspadElem.style.top = (40 - Math.sin(angle) * radiusPercentage) + "%";
            basspadElem.style.left = (50 + Math.cos(angle) * radiusPercentage) + "%";
        }
    }
    else if (style === "tonnetz") {
        const gapPercentage = 3;
        const sepPercentage = 20;
        const topOffset = 20;
        const leftOffset = 20;
        for (const i in STATE.basspads) {
            const gridCol = i % 4;
            const gridRow = Math.floor(i / 4);
            const basspadElem = STATE.basspads[i].element;
            
            basspadElem.classList.remove("basspad-circle");
            basspadElem.classList.add("basspad-tonnetz");

            basspadElem.style.top = topOffset + (gridRow * sepPercentage + (gridRow - 1) * gapPercentage) + "%";
            basspadElem.style.left = leftOffset + (gridRow - 1)*(sepPercentage/2 + gapPercentage/4) + (gridCol * sepPercentage + (gridCol - 1) * gapPercentage) + "%";
        }
    }
}

function setupBasspads() {
    const cof = document.getElementById("circle-of-fifths");
    cof.innerText = ""; /* clear children */
    const n_basspads = 12;
    const basspads = Array(n_basspads);
    
    for (let i = 0;  i < n_basspads; i++) {
        const basspadElem = document.createElement("div");
        basspadElem.classList = "basspad";
        
        const basspad_spec = circleOfFifthsQueryFn(i);
        

        basspadElem.append((e => {e.textContent = (basspad_spec.label); return e;})(document.createElement("b")), document.createElement("br"), basspad_spec.cents);
        cof.appendChild(basspadElem);

        /* initialize it as an object and put it in the state */
        const basspad = new Basspad(basspad_spec.label, basspad_spec.cents, basspadElem);
        basspads[i] = basspad;
    }

    STATE.basspads = basspads;
    
    layoutBasspads(STATE.basspadLayout);
}

function setup() {
    const start_prompt_screen = document.getElementById("start-prompt-screen");
    start_prompt_screen?.addEventListener("click", async () => {
        await Tone.start()
        console.log("tonejs ready");
        STATE.chordplayers = {
            "chord": new Chordplayer(N_VOICES_PER_INSTRUMENT, "updown"),
            "bass": new Chordplayer(1, "down") /* this is just a bass note, played an octave below the 'chord' chordplayer */
        };
        start_prompt_screen.remove();

        setupBasspads();
        ChordTriggers.init(); /* start listening for keyboard triggers to actually play chords */
    })

    /* show chord voicing keymap in the instructions  */
    const listChordKeyboardMapping = document.getElementById("list-chord-keyboard-mapping");
    for (const [key, voicing] of Object.entries(KEYBOARD_TO_VOICING_MAP)) {
        listChordKeyboardMapping.append((e=> {e.append(key + ": " + (voicing.name === "" ? "(bass only)" : voicing.name)); return e;})(document.createElement("li")));
    }   
}
