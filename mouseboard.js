
/* like autokalimba but specifically for mouse and keyboard
  rather than touch, and has automatic voice leading */

const BASE_FREQ = 261.625/2;
const N_VOICES_PER_INSTRUMENT = 4;
const VOICE_LEADING_OCTAVE_SHIFT_MAX_NTIMES = [-6, 2];

/* "application state", things that can change over the course of execution */
const MOUSEBOARD_STATE = 
  { "basspads":  undefined
  , "chordplayers": undefined
  , "drummer": undefined /* NEW (after autocomposer) a bossa nova drum kit */
  , "bassNoteSelected": {"label": "C", "cents": 0, "circleOfFifthsIndex": 1}
    /* ^ this isn't shown in chorddisplay but is used in setting the other ones
     * correctly. This will also be edited live by the autocomposer to play its
     * chords. */
  , "info_bassNotePlaying": ""
  , "info_bassNoteImpliedByVoicing": ""
  , "info_voicing": ""
    /* layout config */
  , "basspadLayout": "circle"
    /* this is just for disabling transform transitions on touch, bc theyre laggy */
  , "isTouchscreen": false
  };

function centsToRatio(c) {
    return Math.pow(2, (c / 1200));
}

function updateChordDisplay() {
    const chordSymbolDisplay = document.getElementById("chord-symbol-display");
    chordSymbolDisplay.textContent = "";
    
    const playingBassElem = document.createElement("strong"); /* clicked via the bass-only key */
    const impliedBassElem = document.createElement("strong"); /* activated whenever a voicing plays (the bass note implied by that voicing) */
    const voicingElem = document.createElement("span");
    
    /* the selected bass is the most recently hovered-on bass note. 
    It may be different from the bass note that is actually playing (which may 
    have been held from earlier), stored in MOUSEBOARD_STATE.info_bassNotePlaying, and
    different from the bass note implied by the voicing that is playing (which
    is the selected bass note from when the voicing was triggered, stored in 
    MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing.)
    MOUSEBOARD_STATE.info_voicing is empty when no voicing is currently played.
    */
    impliedBassElem.append(MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing);
    playingBassElem.append(MOUSEBOARD_STATE.info_bassNotePlaying);
    voicingElem.append(MOUSEBOARD_STATE.info_voicing);
    let longVoicing = false;
    if (MOUSEBOARD_STATE.info_voicing.length > 3) {
        voicingElem.style.fontSize = "calc(min(80pt, 7vw))";
        longVoicing = true;
    }

    if (MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing === MOUSEBOARD_STATE.info_bassNotePlaying) {
        chordSymbolDisplay.append(playingBassElem, voicingElem);
    }
    else {
        if (longVoicing) {
            playingBassElem.style.fontSize = "calc(min(80pt, 7vw))";
        }
        chordSymbolDisplay.append(impliedBassElem, voicingElem, (MOUSEBOARD_STATE.info_bassNotePlaying === "" ? "" : "/"), playingBassElem);
    }
    
    playingBassElem.style.color = MOUSEBOARD_STATE.info_bassNotePlaying === "" ? "lightgray" : "mediumslateblue";
    voicingElem.style.color = MOUSEBOARD_STATE.info_voicing === "" ? "lightgray" : "mediumslateblue";
    impliedBassElem.style.color = "lightgray";
}


/* timbre */
/* useful docs about time https://github.com/Tonejs/Tone.js/wiki/Time 
  changing envelope of Synth(): https://tonejs.github.io/docs/14.7.77/Synth#envelope
  https://tonejs.github.io/docs/14.7.77/AmplitudeEnvelope 
*/
// const BASE_MEOW_FILTER = 400;
// const MEOW_FILTER_MAX_INCREASE = 600;
/*
class Meowsynth {
    constructor() {
        this.volumeNode = new Tone.Volume(-12).toDestination();
        this.filterNode = new Tone.Filter(BASE_MEOW_FILTER, "lowpass").connect(this.volumeNode);
        this.synth = new Tone.Synth().connect(this.filterNode); 
        this.synth.oscillator.type = "sawtooth";
        
        const mult = new Tone.Multiply();
        const add = new Tone.Add();
        this.filterFreqBase = new Tone.Signal(BASE_MEOW_FILTER, "frequency");
        this.filterFreqIncrease = new Tone.Signal(MEOW_FILTER_MAX_INCREASE, "frequency"); // updated by tilt
        this.meowEnvelopeNode = new Tone.Envelope(0.001, 0, 1, 0.08); // triggered by touch/click

        this.filterFreqIncrease.connect(mult);
        this.meowEnvelopeNode.connect(mult.factor);

        mult.connect(add);
        this.filterFreqBase.connect(add.addend);
        
        add.connect(this.filterNode.frequency);

        this.synth.envelope.attack = 0.001;
        this.synth.envelope.decay = 0;
        this.synth.envelope.sustain = 1.0;
        this.synth.envelope.release = 0.08; // long release

    }
    on(f, velocity, scheduledDuration=undefined, scheduledTime=undefined) {
        if ((scheduledDuration === undefined) || (scheduledTime === undefined)) {
            this.synth.triggerAttack(f, "+0", velocity);
            this.meowEnvelopeNode.triggerAttack("+0");
        }
        else {
            this.synth.triggerAttackRelease(f, scheduledDuration, scheduledTime, velocity);
            this.meowEnvelopeNode.triggerAttackRelease(scheduledDuration, scheduledTime);
        }
    }
    off() {
        this.synth.triggerRelease();
        this.meowEnvelopeNode.triggerRelease("0");
    } 
    sync() {
        this.synth.sync();
        this.meowEnvelopeNode.sync();
    }
    unsync() {
        this.synth.unsync();
        this.meowEnvelopeNode.unsync();
    }
}
*/
class ToneInstrument {
    on(f, velocity, scheduledDuration=undefined, scheduledTime=undefined) {
        if ((scheduledDuration === undefined) || (scheduledTime === undefined)) {
            this.synth.triggerAttack(f, "+0", velocity);    
        }
        else {
            this.synth.triggerAttackRelease(f, scheduledDuration, scheduledTime, velocity);
        }
        
    }
    off() {
        this.synth.triggerRelease("+0");
    }
    sync() {
        this.synth.sync();
    }
    unsync() {
        this.synth.unsync();
    }
}

class ElecPiano extends ToneInstrument {
    constructor() {
        super();
        this.volumeNode = new Tone.Volume(-2).toDestination();
        this.synth = new Tone.FMSynth({
            "harmonicity":3,
            "modulationIndex": 14,
            "oscillator" : {
                "type": "sine"
            },
            "envelope": {
                "attack": 0.001,
                "decay": 1.6,
                "sustain": 0.2,
                "release": 2
            },
            "modulation" : {
                "type" : "sine"
            },
            "modulationEnvelope" : {
                "attack": 0.002,
                "decay": 0.2,
                "sustain": 0,
                "release": 0.2
            }
        }).connect(this.volumeNode);
    }
} 

class SawBass extends ToneInstrument {
    constructor() {
        super();
        this.volumeNode = new Tone.Volume(-11).toDestination();
        this.filterNode = new Tone.Filter(500, "lowpass").connect(this.volumeNode);
        this.synth = new Tone.Synth().connect(this.filterNode); 
        this.synth.oscillator.type = "sawtooth";

        this.synth.envelope.attack = 0.01;
        this.synth.envelope.decay = 0.8;
        this.synth.envelope.sustain = 0.5;
        this.synth.envelope.release = 0.1;
    }
}

class AMBass extends ToneInstrument {
    constructor() {
        super();
        this.volumeNode = new Tone.Volume(9.5).toDestination();
        this.synth = new Tone.AMSynth({
            "harmonicity": 2,
            "oscillator": {
                "type": "amsine2",
                  "modulationType" : "sine",
                  "harmonicity": 3
            },
            "envelope": {
                "attack": 0.006,
                "decay": 4,
                "sustain": 0.04,
                "release": 0.5
            },
            "modulation" : {
                  "volume" : 12,
                "type": "amsine2",
                  "modulationType" : "sine",
                  "harmonicity": 2
            },
            "modulationEnvelope" : {
                "attack": 0.006,
                "decay": 0.2,
                "sustain": 0.2,
                "release": 0.4
            }
        }).connect(this.volumeNode);
    }
}

class BossaDrumKit extends ToneInstrument {
    constructor() {
        super();
        this.loaded = false;
        this.volumeNode = new Tone.Volume(-12).toDestination();
        this.synth = new Tone.Sampler({
            "urls": {
                "A1": __DATAURL_PERC_KICK_ELEC,
                "A2": __DATAURL_PERC_SHAKER,
                "A3": __DATAURL_PERC_
            },
            "onload": () => { this.loaded = true; }
        }).connect(this.volumeNode);
        this.keys = {
            "kick": "A1",
            "shaker": "A2",
            "stick": "A3"
        };
    }
    on(f, velocity, scheduledDuration=undefined, scheduledTime=undefined) {
        const samplerNote = this.keys[f];
        return super.on(samplerNote, velocity, scheduledDuration, scheduledTime);
    }
}


class Voice {
    constructor(instrument, autoVoiceLeadingMode="updown") {
        this.instrument = instrument;

        this.lastPlayedCents = undefined;
        this.autoVoiceLeadingMode = autoVoiceLeadingMode;
        this.timesOctaveShifted = 0; 
        /* if we octave shifted in the same direction for too long we'll reset
        voiceleading */
        /* can change envelope settings here maybe */
    }
    autoVoiceLeading(cents, overrideVoiceLeadingMode=undefined) {
        if (this.lastPlayedCents === undefined) {
            this.lastPlayedCents = cents;
            return cents;
        }
        // if (cents === 0) {
        //     /* don't voicelead whenever the root note is requested */
        //     return cents;
        // }
        /* allow +-1200 range in the given cents, whichever one is closest
         * to the last played value. However, clamp to be between -2400 and 
         * +2400  of the original requested cents */
        let tries;
        if (overrideVoiceLeadingMode === "updown" || this.autoVoiceLeadingMode === "updown") {
            tries = [cents, cents-1200, cents+1200];
        } 
        else if (overrideVoiceLeadingMode === "down" || this.autoVoiceLeadingMode === "down") {
            tries = [cents, cents-1200];
        } 
        else {
            return cents;
        }
        
        const distancesToLastPlayedCents = tries.map(c => Math.abs(c - this.lastPlayedCents));
        let result = tries[distancesToLastPlayedCents.indexOf(Math.min(...distancesToLastPlayedCents))];
        result = Math.min(Math.max(result, cents - 1200), cents + 2400);
        if (result < 0 || result > 2100) {
            return cents;
        }
        if (result < cents) {
            this.timesOctaveShifted--;
        }
        else if (result > cents) {
            this.timesOctaveShifted++;
        }
        if (this.timesOctaveShifted > VOICE_LEADING_OCTAVE_SHIFT_MAX_NTIMES[1] ||
            this.timesOctaveShifted < VOICE_LEADING_OCTAVE_SHIFT_MAX_NTIMES[0]) {
            this.resetVoiceLeadingMemory()
            return cents;
        }
        return result;
    }

    on(cents, velocity=1, doAutoVoiceLeading=true, scheduledDuration=undefined, scheduledTime=undefined) {
        if (!doAutoVoiceLeading) {
            this.timesOctaveShifted = 0;
        }
        cents = doAutoVoiceLeading ? this.autoVoiceLeading(cents, doAutoVoiceLeading) : cents;
        this.lastPlayedCents = cents;
        this.instrument.on(BASE_FREQ * centsToRatio(cents), velocity, scheduledDuration, scheduledTime);
    }
    off() {
        this.instrument.off();
    }
    resetVoiceLeadingMemory() {
        this.lastPlayedCents = undefined;
        this.timesOctaveShifted = 0;
    }
}

/* a Chordplayer is a set of voices that are triggered at the same time  */
class Chordplayer {
    constructor(synthName, nVoices=N_VOICES_PER_INSTRUMENT, autoVoiceLeadingMode) {
        /* voice leading modes include "updown" and "down". "updown" mode can
         * pick a voice either an octave above or below the requested frequency;
         * "down" mode can only pick the frequency below. Good for bass voices.
         * */
        
        this.nVoices = nVoices;
        this.voices = new Array(nVoices);
        this.bassCents = 0;
        for (let i = 0; i < nVoices; i++) {
            let synth;
            if (synthName === "meowsynth") {
                synth = new Meowsynth();
            }
            else if (synthName === "elecpiano") {
                synth = new ElecPiano();
            }
            else if (synthName === "sawbass") {
                synth = new SawBass();
            }
            else if (synthName === "ambass") {
                synth = new AMBass();
            }
            this.voices[i] = new Voice(synth, autoVoiceLeadingMode);
        }
        this.currentlyPlayingDueToTrigger = undefined; 
        /* can be a keyboard key name or maybe touch button ID if present.
        * Needed to know which chordplayers to turn off when a key is released.
        * */
    }
    on(triggeredBy, intervals, bassCents=undefined, velocity=1, doAutoVoiceLeading=true, scheduledDuration=undefined, scheduledTime=undefined) {
        if (intervals.length === 0 || this.currentlyPlayingDueToTrigger !== undefined) {
            /* still playing, suppress new input */
            return false;
        }
        /* the "currentlyPlayingDueToTrigger" is only relevant if triggered by
         * keyboard, NOT when scheduled via other code (related to calledManually) */
        if (scheduledDuration === undefined || scheduledTime === undefined) {
            this.currentlyPlayingDueToTrigger = triggeredBy;
        }
        
        /* bassCents: bass note pitch, given in terms of cents relative to
         * BASE_FREQ. this class stores its "current" bass pitch but this
         * function can also be called with something other than this.bassCents
         * for flexibility */
        if (bassCents === undefined) {
            bassCents = this.bassCents;
        }
        for (let i = 0; i < this.nVoices; i++) {
            const interval = intervals[i];
            if (interval !== undefined) {
                this.voices[i].on(bassCents + interval, velocity, doAutoVoiceLeading, scheduledDuration, scheduledTime);
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
    sync() {
        for (const i in this.voices) {
            this.voices[i].instrument.sync();
        }
    }
    unsync() {
        for (const i in this.voices) {
            this.voices[i].instrument.unsync();
        }
    }
}

function globallySelectNewBass(circleOfFifthsIndex) {
    const {label, cents} = circleOfFifthsQueryFn(circleOfFifthsIndex);
    MOUSEBOARD_STATE.chordplayers.bass.bassCents = cents;
    MOUSEBOARD_STATE.chordplayers.chord.bassCents = cents;
    
    MOUSEBOARD_STATE.bassNoteSelected.label = label;
    MOUSEBOARD_STATE.bassNoteSelected.cents = cents; 
    MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex = normalizeCircleOfFifthsIndex(circleOfFifthsIndex);
    return MOUSEBOARD_STATE.bassNoteSelected;
}

/* A basspad represents a hoverable pad labeled with a bass note. On hover it 
 will change the bass note of the chordplayers to the labeled note. */
class Basspad {
    constructor(circleOfFifthsIndex, label, cents, element) {
        this.circleOfFifthsIndex = circleOfFifthsIndex;
        this.label = label;
        this.cents = cents;
        this.element = element;  /* the html element for this basspad*/
        this.element.addEventListener("mouseenter", (e => {e.preventDefault(); this.hover(this)}));
        this.element.addEventListener("touchstart", (e => {e.preventDefault(); this.hover(this)}));
        /* while autocomposer is playing, hovering should not do anything, only
        click and touchstart should */
        this.hoverEventEnabled = true; 
    }
    hover(self) {
        if (!self.hoverEventEnabled) {
            return;
        }
        /* activates on hover... changes the current bass note of the
        chordplayers to the pad's cents */
        const {label, cents, _} = globallySelectNewBass(self.circleOfFifthsIndex);
        self.label = label;
        self.cents = cents;
        /* The idea is that a basspad can have its label and cents be
        dynamically changed depending on what the circle-of-fifths query
        function returns (i.e. can dynamically adjust cents based on last played
        bass or voices for instance), but the basspad's circle-of-fifths index
        should never change (i.e. its meaning and position in the circle of
        fifths stays constant, only its label and cent value may change.) This
        all relies on how the circleOfFifthsQueryFn is implemented of course,
        but it should give consistency of some form to the same basspad selected
        at different points in time */
    }
}

/* hidden:true means that the voicing is not available for manual key triggering 
 * (but is available for invoking via code)*/
const KEYBOARD_TO_VOICING_MAP = 
  { "z": {"name": "", "bass": [-1200], "chord": [], "voicelead": false, "hidden": false}
  , "a": {"name": "", "bass": [-1700], "chord": [], "voicelead": false, "hidden": true}
  , "x": {"name": "m7", "bass": [], "chord": [0, 300, 700, 1000], "voicelead":true, "hidden": false}
  , "c": {"name": "7", "bass": [], "chord": [0, undefined, 1000, 1600], "voicelead": true, "hidden": false}
  , "v": {"name": "M7", "bass": [], "chord": [0, 400, 700, 1100], "voicelead": true, "hidden": false}
  , "b": {"name": "sus13", "bass": [], "chord": [-200, 0, 1700-1200, 2100-1200], "voicelead": "down", "hidden": false}
  , "n": {"name": "M7c", "bass": [], "chord": [-100, 0, 400, 700], "voicelead": true, "hidden": false} /* inverted M7 with fifth on top */
  , "s": {"name": "m9", "bass": [], "chord": [1900-1200, 1000, 1400, 1500 ], "voicelead": true, "hidden": false}
  , "d": {"name": "9", "bass": [], "chord": [0,400, 1000, 1400-1200], "voicelead": true, "hidden": false}
  , "f": {"name": "M9", "bass": [], "chord": [1900-1200, 1100, 1400, 1600 ], "voicelead": true, "hidden": false}
  , "g": {"name": "13", "bass": [], "chord": [0, 1000, 1600, 2100], "voicelead": true, "hidden": false}
  , "h": {"name": "m7♭5", "bass": [], "chord": [0, 600, 1000, 300+1200], "voicelead": true, "hidden": false}
  , "q": {"name": "(II/)", "bass": [], "chord": [0, 600, 900, 1400], "voicelead": true, "hidden": false}
  , "w": {"name": "dim", "bass": [], "chord": [0, 300, 600, 900], "voicelead": true, "hidden": false}
  , "e": {"name": "aug", "bass": [], "chord": [0, 400, 800, 1200], "voicelead": false, "hidden": false}
  , "r": {"name": "7♭9", "bass": [], "chord": [0, 400, 1000, 1300], "voicelead": false, "hidden": false}
  , "t": {"name": "7♯9", "bass": [], "chord": [undefined, 400, 1000, 1500], "voicelead": true, "hidden": false} /* alt */
  , "y": {"name": "7♯5", "bass": [], "chord": [0, 800, 1000, 1200+400], "voicelead": true, "hidden": false}
  }

class ChordTriggers {
    /* handles listening to both keyboard and touchscreen button events (todo)
      to trigger chords... also defines the mapping from keyboard button/touchj
      button to voicings (maj7, min7, dom7, etc) Also also handles info display
      based on the bass and chords selected
    */
    static init() {
        console.log("initialized keyboard chord triggers");
        document.addEventListener("keydown", ChordTriggers.on);
        document.addEventListener("keyup", ChordTriggers.off);
        updateChordDisplay();
    }

    static on(e, calledManually=false, scheduledDuration=undefined, scheduledTime=undefined) {
        /* call this on the keydown/touchstart events */
        let eKey, eType, eRepeat;
        if (calledManually) {
            /* called from code, not from an event. manually fudge an obj that
             * looks like an event object, bc the "e" now contains just a 
             * key identifier! */
            eKey = e;
            eType = "keydown";
            eRepeat = false;
        }
        else {
            eKey = e.key;
            eType = e.type;
            eRepeat = e.repeat;
        }

        if (eType === "keydown" && !(eRepeat)) {
            const triggerSpec = KEYBOARD_TO_VOICING_MAP[eKey];
            if (triggerSpec && ((!calledManually && !triggerSpec.hidden) || (calledManually))) {
                const bassTurnedOn = MOUSEBOARD_STATE.chordplayers.bass.on(eKey, triggerSpec.bass, undefined, 1.0, false, scheduledDuration, scheduledTime);
                const chordTurnedOn = MOUSEBOARD_STATE.chordplayers.chord.on(eKey, triggerSpec.chord, undefined, 0.8, triggerSpec.voicelead, scheduledDuration, scheduledTime); /* lower velocity so we dont clip so horribly*/
                if (chordTurnedOn) {
                    /* chord info updates as a callback. If this on() call is to
                     * schedule a future note-On, then we also schedule the
                     * callback in the Transport. If not (i.e. called via
                     * keyboard event) then we just call it immediately. The
                     * reason we have to do the gymnastics with the partial
                     * applications is because the values in the chorddisplay
                     * should reflect the MOUSEBOARD_STATE at the time of
                     * scheduling (not the state after all the scheduling is
                     * done), and so we should do partial application to "pass
                     * in" the local scope at this instant where the on() call
                     * is used for scheduling. */

                    const onFn = (n, l) => {
                        MOUSEBOARD_STATE.info_voicing = n;
                        MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing = l;
                    };
                    /* if this on() call is for scheduling w/ t and duration */                    
                    if (calledManually) {
                        const offFn = () => {
                            MOUSEBOARD_STATE.info_voicing = "";
                            MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing = "";
                        }
                        Tone.Transport.scheduleOnce(((n, l) => (() => {onFn(n, l); updateChordDisplay();}))(triggerSpec.name, MOUSEBOARD_STATE.bassNoteSelected.label), scheduledTime);
                        Tone.Transport.scheduleOnce(() => {offFn(); updateChordDisplay();}, scheduledTime + scheduledDuration);
                    }
                    else {
                        onFn(triggerSpec.name, MOUSEBOARD_STATE.bassNoteSelected.label);
                    }
                }
                
                if (bassTurnedOn) {
                    const onFn = (l) => {
                        MOUSEBOARD_STATE.info_bassNotePlaying = l;
                    };
                    if (calledManually) {
                        const offFn = () => {
                            MOUSEBOARD_STATE.info_bassNotePlaying = "";
                        }
                        Tone.Transport.scheduleOnce(((l) => (() => {onFn(l); updateChordDisplay();}))(MOUSEBOARD_STATE.bassNoteSelected.label), scheduledTime);
                        Tone.Transport.scheduleOnce(() => {offFn(); updateChordDisplay();}, scheduledTime + scheduledDuration);
                    }
                    else {
                        onFn(MOUSEBOARD_STATE.bassNoteSelected.label);
                    }
                }
                if (!calledManually){
                    updateChordDisplay();
                }
            }
            else {
                if (eKey === "`") {
                    /* reset voice leading */
                    MOUSEBOARD_STATE.chordplayers.chord.voices.forEach(voice => voice.resetVoiceLeadingMemory());
                    MOUSEBOARD_STATE.chordplayers.bass.voices.forEach(voice => voice.resetVoiceLeadingMemory());
                }
            }
        }
        /* TODO handle touch trigger button event */
        
    }
    static off(e, calledManually=false) {
        let eKey;
        if (calledManually) {
            /* called from code, not from an event. manually fudge an obj that
             * looks like an event object, bc the "e" now contains just a 
             * key identifier! */
            eKey = e;
        }
        else {
            eKey = e.key;
        }
        /* if the keyup off event is for MOUSEBOARD_STATE.chordplayers.bass then it should
         * clear the MOUSEBOARD_STATE.info_bassNotePlaying value */
        if (MOUSEBOARD_STATE.chordplayers.bass.off(eKey) === true) {
            MOUSEBOARD_STATE.info_bassNotePlaying = "";
        }
        if (MOUSEBOARD_STATE.chordplayers.chord.off(eKey) === true) {
            MOUSEBOARD_STATE.info_voicing = "";
            MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing = "";
        }
        updateChordDisplay();
    }

    static allOff() {
        MOUSEBOARD_STATE.chordplayers.bass.off(MOUSEBOARD_STATE.chordplayers.bass.currentlyPlayingDueToTrigger);
        MOUSEBOARD_STATE.chordplayers.chord.off(MOUSEBOARD_STATE.chordplayers.chord.currentlyPlayingDueToTrigger);
        MOUSEBOARD_STATE.info_voicing = "";
        MOUSEBOARD_STATE.info_bassNoteImpliedByVoicing = "";
        MOUSEBOARD_STATE.info_bassNotePlaying = "";
    }

    static sync() {
        MOUSEBOARD_STATE.chordplayers.bass.sync();
        MOUSEBOARD_STATE.chordplayers.chord.sync();
    }
    static unsync() {
        MOUSEBOARD_STATE.chordplayers.bass.unsync();
        MOUSEBOARD_STATE.chordplayers.chord.unsync();
    }
}

class DrumTriggers {
    /* very barebones static class but to match ChordTriggers. Might be nice to
    leave room for manual drum input later on maybe. */
    static on(drumSampleName, velocity, scheduledDuration=undefined, scheduledTime=undefined) {
        /* probably won't need "key off" handling for a drum machine input
         * trigger handler, so this will always take a duration argument.
         * (actually we just don't need it in this current state of the proj) */
        MOUSEBOARD_STATE.drummer.on(drumSampleName, velocity, scheduledDuration, scheduledTime);
    }
    static off() {
        MOUSEBOARD_STATE.drummer.off();
    }
    static allOff() {
        MOUSEBOARD_STATE.drummer.off();
    }
    static sync() {
        MOUSEBOARD_STATE.drummer.sync();
    }
    static unsync() {
        MOUSEBOARD_STATE.drummer.unsync();
    }
}

const CIRCLE_OF_FIFTHS_12EDO = 
  [ {"label": "F", "cents": 500}
  , {"label": "C", "cents": 0}
  , {"label": "G", "cents": 700}
  , {"label": "D", "cents": 200}
  , {"label": "A", "cents": 900}
  , {"label": "E", "cents": 400}
  , {"label": "B", "cents": 1100}
  , {"label": "F♯", "cents": 600}
  , {"label": "C♯", "cents": 100}
  , {"label": "A♭", "cents": 800}
  , {"label": "E♭", "cents": 300}
  , {"label": "B♭", "cents": 1000}
  ];

/* circle-of-fifths function... by default cycles through the 12-note circle,
 * but we can reimplement this function later to do exotic microtonal stuff. the
 * call signature should be (i, readonly : bool = false) -> {"label":str,
 * "cents":int}. These functions can be queried read-only (no state should be
 * modified) or not, which is how we could dynamically modify the circle of
 * fifths on each call to circleOfFifthsQueryFn. */
function queryCircleOfFifths12EDO(i, readonly=false) {
    return CIRCLE_OF_FIFTHS_12EDO[((i % 12) + 12) % 12];
}
function normalizeCircleOfFifthsIndex12EDO(i) {
    return ((i % 12) + 12) % 12;
}

let circleOfFifthsQueryFn = queryCircleOfFifths12EDO; /* change this out */
let normalizeCircleOfFifthsIndex = normalizeCircleOfFifthsIndex12EDO; /* changeable too */

/* lay out the basspads in either a circle of fifths or a tonnetz grid */
function layoutBasspads(style=undefined) {
    const n_basspads = MOUSEBOARD_STATE.basspads.length;

    if (!style) {
        /* toggle depending on the style stored in MOUSEBOARD_STATE */
        style = {"circle": "tonnetz", "tonnetz": "chromatic", "chromatic": "circle"}[MOUSEBOARD_STATE.basspadLayout];
        MOUSEBOARD_STATE.basspadLayout = style;
    }
    if (style === "circle") {
        const arc = 2 * Math.PI / n_basspads;
        const startAngle = 0.5 * Math.PI;
        const radiusPercentage = 35;

        for (const i in MOUSEBOARD_STATE.basspads) {
            const angle = startAngle + (-i) * arc;
            const basspadElem = MOUSEBOARD_STATE.basspads[i].element;
            
            basspadElem.classList.remove("basspad-tonnetz");
            basspadElem.classList.remove("basspad-chromatic-blackkey");
            basspadElem.classList.remove("basspad-chromatic-whitekey");
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
        for (const i in MOUSEBOARD_STATE.basspads) {
            const gridCol = i % 4;
            const gridRow = Math.floor(i / 4);
            const basspadElem = MOUSEBOARD_STATE.basspads[i].element;
            
            basspadElem.classList.remove("basspad-circle");
            basspadElem.classList.remove("basspad-chromatic-blackkey");
            basspadElem.classList.remove("basspad-chromatic-whitekey");
            basspadElem.classList.add("basspad-tonnetz");

            basspadElem.style.top = topOffset + (gridRow * sepPercentage + (gridRow - 1) * gapPercentage) + "%";
            basspadElem.style.left = leftOffset + (gridRow - 1)*(sepPercentage/2 + gapPercentage/4) + (gridCol * sepPercentage + (gridCol - 1) * gapPercentage) + "%";
        }
    }
    else if (style === "chromatic") {
        const wSepPercentage = 14.5;
        const bSepPercentage = 7.25;
        const topOffset = 30;
        const leftOffset = 8;
        const blackKeysCols = [8, 10, 1, 3, 5];
        const blackKeysOffsets = [1, 3, 7, 9, 11];
        const whiteKeysCols = [7,9,11,0,2,4,6];


        for (const wCol in whiteKeysCols) {
            const basspadElem = MOUSEBOARD_STATE.basspads[whiteKeysCols[wCol] * 7 % 12].element;
            basspadElem.classList.remove("basspad-circle");
            basspadElem.classList.remove("basspad-tonnetz");
            basspadElem.classList.add("basspad-chromatic-whitekey");
            basspadElem.style.top = topOffset + "%";
            basspadElem.style.left = leftOffset + wCol * wSepPercentage + "%";
        }
        for (const bCol in blackKeysCols) {
            const basspadElem = MOUSEBOARD_STATE.basspads[blackKeysCols[bCol] * 7 % 12].element;
            basspadElem.classList.remove("basspad-circle");
            basspadElem.classList.remove("basspad-tonnetz");
            basspadElem.classList.add("basspad-chromatic-blackkey");
            basspadElem.style.top = topOffset - 3 + "%";
            basspadElem.style.left = bSepPercentage + leftOffset + (blackKeysOffsets[bCol]-1) * bSepPercentage + "%";
        }
        
    }
}

function setupBasspads() {
    const cof = document.getElementById("circle-of-fifths");
    const n_basspads = 12;
    const basspads = Array(n_basspads);
    
    for (let i = 0;  i < n_basspads; i++) {
        const basspadElem = document.createElement("div");
        basspadElem.classList.add("basspad", "basspad-long-transitions");
        
        const basspadSpec = circleOfFifthsQueryFn(i, true);
        

        basspadElem.append((e => {e.textContent = (basspadSpec.label); return e;})(document.createElement("b")));
        cof.appendChild(basspadElem);

        /* initialize it as an object and put it in the state */
        const basspad = new Basspad(i, basspadSpec.label, basspadSpec.cents, basspadElem);
        basspads[i] = basspad;
        // MOUSEBOARD_STATE.lookupBasspadByCents[basspadSpec.cents] = basspad;
    }

    MOUSEBOARD_STATE.basspads = basspads;
    
    layoutBasspads(MOUSEBOARD_STATE.basspadLayout);
}

function setup(callbacksAfterwards) {
    const start_prompt_screen = document.getElementById("start-prompt-screen");
    start_prompt_screen?.addEventListener("click", async () => {
        await Tone.start()
        console.log("tonejs ready");
        MOUSEBOARD_STATE.chordplayers = {
            "chord": new Chordplayer("elecpiano", N_VOICES_PER_INSTRUMENT, "updown"),
            "bass": new Chordplayer("ambass", 1, "down") 
            /* this is just a bass note, played an octave below the 'chord' chordplayer */
        };
        MOUSEBOARD_STATE.drummer = new BossaDrumKit(); /* NEW */
        start_prompt_screen.remove();

        setupBasspads();
        ChordTriggers.init(); /* start listening for keyboard triggers */
        callbacksAfterwards();
        if (MOUSEBOARD_STATE.isTouchscreen) {
            MOUSEBOARD_STATE.basspads.forEach(b => {
                b.element.classList.remove("basspad-long-transitions");
                b.element.classList.add("basspad-short-transitions");
            })
        }
    })
    start_prompt_screen?.addEventListener("touchstart", _ => {
        MOUSEBOARD_STATE.isTouchscreen = true;
    })

    /* show chord voicing keymap in the instructions  */
    const listChordKeyboardMapping = document.getElementById("list-chord-keyboard-mapping");
    for (const [key, voicing] of Object.entries(KEYBOARD_TO_VOICING_MAP)) {
        if (!voicing.hidden) {
            listChordKeyboardMapping.append((e=> {e.append(key + ": " + (voicing.name === "" ? "(bass only)" : voicing.name)); return e;})(document.createElement("li")));
        }
    }   
}
