
function midiNoteToMouseboardCircleOfFifthsIndex(midiNote) {
    // mouseboard COFindex has F at index 0. and since F4 is at midi 65
    // so midi 65 is COFindex 0, and midi 66 F# is COFindex 5 and so on
    return ((-midiNote*7-1)% 12 + 12 ) % 12;
}

function midiDifferenceToCircleOfFifthsShift(midiNoteDistance) {
    return midiNoteToMouseboardCircleOfFifthsIndex(midiNoteDistance) + 1;
}

const SOLFEGE_TO_DEGREE =
 { "do": 0
 , "do#": 1
 , "reb": 1
 , "re": 2
 , "re#": 3
 , "mib": 3
 , "mi": 4
 , "fa": 5
 , "fa#": 6
 , "sob": 6
 , "so": 7
 , "so#": 8
 , "lab": 8
 , "la": 9
 , "la#": 10
 , "tib": 10
 , "ti": 11
 , "i": 0
 , "#i": 1
 , "bii": 1
 , "ii": 2
 , "#ii": 3
 , "biii": 3
 , "iii": 4
 , "iv": 5
 , "#iv": 6
 , "bv": 6
 , "v": 7
 , "#v": 8
 , "bvi": 8
 , "vi": 9
 , "#vi": 10
 , "bvii": 10
 , "vii": 11
 }

const SOLFEGE_SYMBOL_TO_ROMAN_NUMERAL =
 { "do": "i"
 , "re": "ii"
 , "mi": "iii"
 , "fa": "iv"
 , "so": "v"
 , "la": "vi"
 , "ti": "vii"
 }
// rule of the octave is the default pattern to draw, and then i can write some more YAZZ bigrams and even trigrams. 
// we'll fill in the time and duration later. all items in each list have the same time and duration
const PARTIMENTI_EXEMPLARS = 
{ "roto":   { 0: [ {"key": __K.b}, {"key": __K.M9} ] // do
            , 2: [ {"key": __K.b}, {"bassCOFShift": 1, "key": __K.d7}, {"bassCOFShift": -1}] // re
            , 4: [ {"key": __K.b}, {"bassCOFShift": 4, "key": __K.M7}, {"bassCOFShift": -4} ] // mi
            , 5: [ {"key": __K.b}, {"bassCOFShift": -3, "key": __K.m7}, {"bassCOFShift": 3} ] // fa
            , 7: [ {"key": __K.b}, {"key": __K.d9} ] // so
            , 9: [ {"key": __K.b}, {"bassCOFShift": 4, "key": __K.M7}, {"bassCOFShift": -4} ] // la 
            , 11: [ {"key": __K.b}, {"bassCOFShift": 4, "key": __K.d7}, {"bassCOFShift": -4} ] // ti
            }
, "majd":   { 0: [ {"key": __K.b}, {"key": __K.M9} ]
            , 1: [ {"key": __K.b}, {"key": __K.dim} ]
            , 2: [ {"key": __K.b}, {"key": __K.m9} ]
            , 3: [ {"key": __K.b}, {"key": __K.dim} ]
            , 4: [ {"key": __K.b}, {"bassCOFShift": 4, "key": __K.M9}, {"bassCOFShift": -4}]
            , 5: [ {"key": __K.b}, {"key": __K.M9} ]
            , 6: [ {"key": __K.b}, {"key": __K.dim} ]
            , 7: [ {"key": __K.b}, {"key": __K.d7} ]
            , 8: [ {"key": __K.b}, {"key": __K.dim} ]
            , 9: [ {"key": __K.b}, {"bassCOFShift": 4, "key": __K.M9}, {"bassCOFShift": -4} ]
            , 10: [ {"key": __K.b}, {"key": __K.dim} ]
            , 11: [ {"key": __K.b}, {"key": __K.d13} ]
            }
}

function realizeBassNoteInContext(usingExemplarName, whereInTheBassSequence, bassDegree) {
    if (usingExemplarName === "roto" || usingExemplarName === "majd") {
        /* rule of the octave */
        return PARTIMENTI_EXEMPLARS[usingExemplarName][bassDegree];
    }
    else if (usingExemplarName === "sdtt") {
        /* "subdom-dom-tonic-tonic" bass cycle */
        const subdomVoicing = chooseFrom(__K.m9, __K.m7);
        const domVoicing = subdomVoicing === __K.m9 ? __K.d9 : __K.d7;
        const tonicVoicing = subdomVoicing === __K.m9 ? __K.M9 : __K.M7;
        const eventList = 
            { 0: [ {"key": __K.b}, {"key": subdomVoicing} ]
            , 1: [ {"key": __K.b}, {"key": domVoicing} ]
            , 2: [ {"key": __K.b}, {"key": tonicVoicing} ]
            , 3: [ {"key": __K.b}, {"key": tonicVoicing} ]
            }[whereInTheBassSequence % 4];
        return eventList ? eventList : [];
    }
    else {
        return [];
    }
}


const LIVECODING_SPECIAL_CHARS = 
  { "stayOnKeyInBassline": "@"
  , "targetNewKey": ">"
  , "snapNewKey": "!"
  }

function solfegeSymbolToRomanNumeral(token) {
    token = token.toLowerCase().replace(LIVECODING_SPECIAL_CHARS.stayOnKeyInBassline, "").replace(LIVECODING_SPECIAL_CHARS.targetNewKey, "");
    // console.log(token);
    for (const [sym, rom] of Object.entries(SOLFEGE_SYMBOL_TO_ROMAN_NUMERAL)) {
        token = token.replace(sym, rom);
    }
    const tokenLengthMinusOne = token.length-1;
    const firstCharOfToken = token.charAt(0);
    if (firstCharOfToken === "#" || firstCharOfToken === "b") {
        token = (firstCharOfToken === "#" ? "♯" : "♭") + token.slice(1);
    }
    return token.toUpperCase();
}

function bassDegreeSequenceToCircleOfFifthsIndicesAndBassShifts(startCircleOfFifthsIndex, bassDegreeSequence) {
    const circleOfFifthsIndicesToHit = bassDegreeSequence.map(d => startCircleOfFifthsIndex + midiDifferenceToCircleOfFifthsShift(d));
    /* calculate the actual bass shifts in terms of circle-of-fifths index difference between each bass degree requested  */
    let bassCOFShifts = Array.from(circleOfFifthsIndicesToHit.entries()).map(tup => {
        const [i, thisCOFIndex] = tup;
        return (i > 0) ? (thisCOFIndex - circleOfFifthsIndicesToHit[i-1]) : (thisCOFIndex - startCircleOfFifthsIndex);
    });
    return {circleOfFifthsIndicesToHit, bassCOFShifts};
}

function makeBossaBasslineRealization(usingExemplarName, startCircleOfFifthsIndex, bassDegreeSequence, degreeNames, variation=0, modulateTo=undefined) {
    /* interpret the bassline for a whole command line, splitting up into
     * multiple bars if needed. The command is read as a sequence of bass
     * degrees w.r.t. the current key of the bossa nova autocomposer. 
     * After the last bar, we should modulate back to that start key (`last`) 
     * unless specified otherwise with arg modulateTo (default is undefined) */
    if (bassDegreeSequence.length === 0) {
        return [];
    }
    if (modulateTo === undefined) {
        modulateTo = startCircleOfFifthsIndex;
    }
    else {
        modulateTo = startCircleOfFifthsIndex + midiDifferenceToCircleOfFifthsShift(modulateTo);
    }
    
    const {circleOfFifthsIndicesToHit, bassCOFShifts} = bassDegreeSequenceToCircleOfFifthsIndicesAndBassShifts(startCircleOfFifthsIndex, bassDegreeSequence);
    
    /* chunk into bars, each bar with 4 bass changes at most */
    const nBassShiftsRequested = bassCOFShifts.length;
    const bars = []
    const padToLength = (targetLength, xs, padValue=undefined) => {
        let l = xs.length;
        if (padValue === undefined) {
            padValue = xs[l-1];
        }
        while (l < targetLength) {
            xs.push(padValue);
            l++;
        }
        return xs;
    }
    const nBarsToQueue = Math.ceil(nBassShiftsRequested / 4);
    let whereInTheBassSequence = 0;

    for (let subBarIdx = 0; subBarIdx < nBarsToQueue; subBarIdx++) {
        const bassCOFShiftsThisSubBar = padToLength(4, bassCOFShifts.slice(subBarIdx*4, subBarIdx*4 + 4), 0);
        const bassDegreeSequenceThisSubBar = padToLength(4, bassDegreeSequence.slice(subBarIdx*4, subBarIdx*4 + 4));
        const degreeNamesThisSubBar = padToLength(4, degreeNames.slice(subBarIdx*4, subBarIdx*4 + 4));
        let netCircleOfFifthsRotation = bassCOFShiftsThisSubBar.reduce((a, c) => a + c);
        let patternEvents;
        if (variation === 0)  {
            patternEvents = 
            [ {"key": __K.b, "time": "0:0", "duration": "16n", "__changeBassHere": 0}
            , {"__chordHere": 0, "time": "0:0:2", "duration": "16n"}
            , {"key": __K.lb, "time": "0:0:3", "duration": staccato16n}
            , {"key": __K.b, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n")), "__changeBassHere": 1}
            , {"__chordHere": 1, "time": "0:0:5", "duration": "16n"}
            , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
            , {"key": __K.b, "time": "0:0:8", "duration": "16n", "__changeBassHere": 2}
            , {"__chordHere": 2, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
            , {"key": __K.lb, "time": "0:0:11", "duration": staccato16n}
            , {"key": __K.b, "time": "0:0:12", "duration": staccato8n2, "__changeBassHere": 3}
            , {"__chordHere": 3, "time": "0:0:14", "duration": "16n"}
            , chooseFrom({}, {"key": __K.lb, "time": "0:0:15", "duration": staccato16n})
            ];
        }
        
        patternEvents = patternEvents.flatMap(e => 
            e.__chordHere !== undefined 
                ? (((bassDegree) => { 
                        if (bassDegree !== undefined) {
                            const ret = realizeBassNoteInContext(usingExemplarName, whereInTheBassSequence, bassDegree);
                            whereInTheBassSequence++;
                            return ret;
                        }
                    })(bassDegreeSequenceThisSubBar[e.__chordHere])?.map(ee => 
                        ee.key !== undefined 
                            ? {...ee, "time": e.time, "duration": e.duration} 
                            : ee))
                : e.__changeBassHere !== undefined
                    ? {...e, "bassCOFShift": bassCOFShiftsThisSubBar[e.__changeBassHere]}
                    : e);
        if (subBarIdx === (nBarsToQueue - 1)) {
            /* after the last bar, modulate to either start key of this command line, or a key specified otherwise */
            const shiftToModulationTarget = modulateTo - circleOfFifthsIndicesToHit[nBassShiftsRequested-1];
            patternEvents.push({"bassCOFShift": shiftToModulationTarget});
            netCircleOfFifthsRotation += shiftToModulationTarget;
        }
        bars.push({
            "name": "Thoroughbass", 
            "variantName": degreeNamesThisSubBar.join(", "),
            "netCircleOfFifthsRotation": netCircleOfFifthsRotation,
            "events": patternEvents
        });
    }
    
    return bars;
}

function interpretCodeAndSchedulePatterns(code) {
    const lines = code.split(/\r?\n/);
    for (const line of lines) {
        const tokens = line.split(" ").filter(c => c);
        const getBassScaleDegrees = specialCharToHandle => tokens.map(t => {
            let ret;
            let isSpecialMarked = false;
            t = t.toLowerCase();
            if (t.charAt(0) === specialCharToHandle) {
                t = t.slice(1);
                ret = SOLFEGE_TO_DEGREE[t];
                // modulateTo = ret;
                // console.log("modulate to " + modulateTo);
                isSpecialMarked = true;
            }
            else {
                ret = SOLFEGE_TO_DEGREE[t];
            }
            return {"degree": ret, "isSpecialMarked": isSpecialMarked};
        }).filter(u => u.degree !== undefined);
        
        if (tokens[0] === "bass") {
            const usingExemplarName = tokens[1];
            const tokensStartAt = 2;
            const bassScaleDegreesSpec = getBassScaleDegrees(LIVECODING_SPECIAL_CHARS.stayOnKeyInBassline);
            const specialMarkedDegrees = bassScaleDegreesSpec.filter(u => u.isSpecialMarked).map(u => u.degree);
            const bassScaleDegrees = bassScaleDegreesSpec.map(u => u.degree);
            const modulateTo = specialMarkedDegrees[specialMarkedDegrees.length - 1];
            
            // support 4 bass changes max in one line
            let last = COMPOSER_STATE.lastKeyCenterCOFIndexQueued;
            last = (last === undefined ? MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex : last);
            const newBars = makeBossaBasslineRealization(usingExemplarName, last, bassScaleDegrees, tokens.slice(tokensStartAt).map(solfegeSymbolToRomanNumeral), 0, modulateTo);
            scheduleNewBars(newBars, last);
        }
        else if (tokens[0] === "mod") {
            const bassScaleDegreesSpec = getBassScaleDegrees(LIVECODING_SPECIAL_CHARS.snapNewKey);
            const bassDegreeSequence = bassScaleDegreesSpec.map(u => u.degree);
            let last = COMPOSER_STATE.lastKeyCenterCOFIndexQueued;
            last = (last === undefined ? MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex : last);
            const {circleOfFifthsIndicesToHit, bassCOFShifts} = bassDegreeSequenceToCircleOfFifthsIndicesAndBassShifts(last, bassDegreeSequence);
            for (const bassCOFShift of bassCOFShifts) {
                last = COMPOSER_STATE.lastKeyCenterCOFIndexQueued;
                last = (last === undefined ? MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex : last);
                const variation = Math.floor(12 * Math.random());
                const newBars = makeBossaModulationPatterns(bassCOFShift, variation);
                scheduleNewBars(newBars, last);
            }
            
        }
    }
}

function setupLivecoding() {
    const interpretButton = document.getElementById("livecoding-interpret-button");
    const editor = document.getElementById("editor");
    interpretButton?.addEventListener("click", e => {
        interpretCodeAndSchedulePatterns(editor.value);
    })
}

/*
good examples 
```
bass roto do la fa re @so
bass roto do re la fa so
bass majd do do# re re# mi fa fa# so la ti do
```
common 4-chordy loop i think

```
bass majd do do# re re# 
bass majd mi la re so
```

```
bass roto do la fa so
mod re la
```

```
bass roto la fa re @so
bass roto la fa re @so
mod re
```

good showcase of all features
```
bass roto do re mi fa so la ti
mod so
bass sdtt ii v i i iii vi ii @ii
bass roto la fa re so
mod re fa
```
```
bass sdtt iv bvii @vi
```
*/