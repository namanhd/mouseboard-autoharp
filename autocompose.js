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
  /* ^^ bars of music queued up. see makeBossaHoldingPattern for generating one bar */
  /* composition state preferences */
  , "preferredHoldPatternVoicing": __K.M9 /* we may prefer M7 instead of M9 for instance */
  , "needResolutionBeforeNextBar": false /* force a Hold or a V-I bar in the next bar */
  , "weJustResolved": true /* indicate that we've arrived at a tonic-feeling place */
  /* our genned V-I bars work because they also start in a tonicky way ... */
  , "cooldowns": 
      { "bouncyTritoneSubTwoFiveOne": 0
      , "alternateHoldPattern": 1
      } /* cooldowns so that we don't do this stuff too often */
    // melodyplayer: todo... meowsynth player that plays melody on top of the chord progy.
  , "currentlyPlayingBarName": ""
  , "howManyBarsPlayed": 0 
      /* NEW bossa nova drum kit */
  , "drumPattern": []
  };

const SCHEDULING_DELAY_FOR_LAG_PREVENTION = 0.10;

/* random choice and shorthand functions for autocomposer */
const randomlyLengthen = t => t + Math.random() * 0.2;
const staccato16n = Tone.Time("16n")-0.08;
const staccato8n = Tone.Time("8n")-0.1;
const staccato8n2 = Tone.Time("8n")-0.12;
const chooseFrom = (...xs) => xs[Math.floor(Math.random() * xs.length)];

function makeBossaHoldingPattern(voicingButton, allowVariant=true) {
    COMPOSER_STATE.weJustResolved = true;
    COMPOSER_STATE.needResolutionBeforeNextBar = false;
    /* duration is bars:quarternotes:sixteenthnotes*/
    /* return one bar/measure of inputs */
    let variation = 0;
    if (COMPOSER_STATE.cooldowns.alternateHoldPattern > 0) {
        COMPOSER_STATE.cooldowns.alternateHoldPattern--;
    }
    else if (allowVariant) {
          /* use the alt hold pattern and reset the cooldown. small chance to
          use the d13 variant (variation=2) */
        variation = chooseFrom(1, 1, 1, 1, 1, 1, 2);
        COMPOSER_STATE.cooldowns.alternateHoldPattern = 1;
    }
    const patternName = "Hold";
    const patternVariantName = "variant " + (variation+1);
    let patternEvents;
    if (variation === 0)  {
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
          , chooseFrom({}, {"key": __K.lb, "time": "0:0:15", "duration": staccato16n})
          ];
    }
    else if (variation === 1 || variation === 2) {
        const isVar2 = variation === 2;
        const theShift = isVar2 ? 6 : 5;
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
          , (isVar2 ? {"bassCOFShift": theShift} : {})
          , {"key": (isVar2 ? __K.b : __K.lb), "time": "0:0:12", "duration": "8n"}
          , {"key": (isVar2 ? __K.d13 : voicingButton), "time": "0:0:12", "duration": "8n"}
          , (isVar2 ? {} : {"bassCOFShift": theShift})
          , {"key": (isVar2 ? __K.d13 : voicingButton), "time": "0:0:14", "duration": "16n"}
          , {"bassCOFShift": -theShift}
          , (isVar2 ? {"key": __K.lb, "time": "0:0:15", "duration": staccato16n} : {})
          ];
    }
    return {
        "name": patternName,
        "variantName": patternVariantName,
        "netCircleOfFifthsRotation": 0, 
        /* ^^ counterclockwise. how much this bar's progression progresses the
        key around the COF */
        "events": patternEvents
    }
}

function makeBossaModulationPatternsByTwoSmallerOnes(bassCOFShift, variation, split=undefined) {
    if (bassCOFShift < 4) {
        return [];
    }
    if (split === undefined || split >= bassCOFShift || split <= 0) {
        /* invalid split values, just make one up. This is in range [1, bassCOFShift-1] */
        split = Math.floor(Math.random() * (bassCOFShift-1)) + 1;
    }
    const otherSplit = bassCOFShift - split;
    const firstIs = chooseFrom(split, otherSplit);
    const bar1 = makeBossaModulationPatterns(firstIs, variation);
    const bar2 = makeBossaModulationPatterns(firstIs === split ? otherSplit : split, variation);
    return bar1.concat(bar2);
}

function addBassCOFShiftOffsetToEvent(event, bassCOFShiftToAdd) {
    if (event.bassCOFShift !== undefined) {
        event.bassCOFShift += bassCOFShiftToAdd;
    }
    else {
        event.bassCOFShift = bassCOFShiftToAdd;
    }
}

function makeBossaModulationPatterns(bassCOFShift, variation) {
    if (COMPOSER_STATE.needResolutionBeforeNextBar) {
        /* if a previous bar indicated that it needs a resolution immediately,
         * schedule that before moving onto the next modulation pattern */
        COMPOSER_STATE.needResolutionBeforeNextBar = false;
        if (!COMPOSER_STATE.weJustResolved) {
            const hereYouAre = makeBossaModulationPatterns(0, 0); /* do not use variant2 hold */
            const nowGoAhead = makeBossaModulationPatterns(bassCOFShift, variation);
            return nowGoAhead === undefined ? undefined : hereYouAre.concat(nowGoAhead);
        }
    }
    bassCOFShift = normalizeCircleOfFifthsIndex(bassCOFShift);
    if (bassCOFShift === 0) {
        const nVariations = 2;
        const allowVariant = (variation % nVariations) !== 0; /* var=1 allows the variant */
        COMPOSER_STATE.weJustResolved = true;
        COMPOSER_STATE.needResolutionBeforeNextBar = false;
        const bar = makeBossaHoldingPattern(COMPOSER_STATE.preferredHoldPatternVoicing, allowVariant);
        bar.name = "I";
        return [bar];
    }
    if (bassCOFShift === 1) {
        COMPOSER_STATE.weJustResolved = true;
        const nVariations = 4;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0 || variationChoice === 1) {
            /* simple dominant. Variation 1 forces a 13 chord, otherwise identical to var0 */
            const holdVoicing = COMPOSER_STATE.preferredHoldPatternVoicing;
            const domVoicing = variationChoice === 1 ? __K.d13 : chooseFrom(__K.d9, __K.d7, __K.d13);
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": holdVoicing, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.lb, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": holdVoicing, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:7", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": domVoicing, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.lb, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing, "time": "0:0:14", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:15", "duration": staccato16n}
              , {"bassCOFShift": 1}
              ];
            const bar = {
                "name": "V",
                "variantName":  (domVoicing === __K.d9 ? "dom9" : 
                                (domVoicing === __K.d7 ? "dom7" : 
                                (domVoicing === __K.d13 ? "dom13" : ""))),
                "netCircleOfFifthsRotation": 1, 
                "events": patternEvents
            };
            COMPOSER_STATE.needResolutionBeforeNextBar = false;
            COMPOSER_STATE.preferredHoldPatternVoicing = (domVoicing === __K.d7 ? __K.M7 : __K.M9);
            return [bar];
        }
        else if (variationChoice === 2) {
            /* tritone sub */
            const tritoneSubVoicing = chooseFrom(__K.m7b5, __K.d9, __K.d7s5);
            const holdVoicing = COMPOSER_STATE.preferredHoldPatternVoicing;
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": holdVoicing, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.lb, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": holdVoicing, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
              , {"bassCOFShift": 6}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": tritoneSubVoicing, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": tritoneSubVoicing, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.b, "time": "0:0:14", "duration": "16n"}
              , {"key": tritoneSubVoicing, "time": "0:0:14", "duration": "16n"}
              , {"bassCOFShift": 7}
              ];
            const bar = {
                "name": "V",
                "variantName": "tritone sub",
                "netCircleOfFifthsRotation": 1, 
                "events": patternEvents
            }
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return [bar];
        }
        else if (variationChoice === 3) {
            const holdVoicing = COMPOSER_STATE.preferredHoldPatternVoicing;
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": holdVoicing, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": holdVoicing, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:7", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": __K.d9, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.lb, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.alt, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.d7s5, "time": "0:0:14", "duration": "8n"}
              , {"key": __K.b, "time": "0:0:14", "duration": "16n"}
              , {"bassCOFShift": 1}
              ];
            const bar = {
                "name": "V",
                "variantName": "+alt",
                "netCircleOfFifthsRotation": 1, 
                "events": patternEvents
            }
            COMPOSER_STATE.needResolutionBeforeNextBar = false;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return [bar];
        }
    } /* end bassCOFShift === 1*/
    else if (bassCOFShift === 2) {
        const nVariations = 3;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0 || variationChoice === 1) {
            if (COMPOSER_STATE.cooldowns.bouncyTritoneSubTwoFiveOne > 0) {
                /* tick down the cooldown for variation 2 */
                COMPOSER_STATE.cooldowns.bouncyTritoneSubTwoFiveOne--;
            }
            /* ii-V-I. Variation 0 is m7 or m9, variation 1 is m7b5 */
            const subdomVoicing = (variationChoice === 1 && COMPOSER_STATE.preferredHoldPatternVoicing !== __K.s13) ? __K.m7b5 : COMPOSER_STATE.preferredHoldPatternVoicing === __K.M9 ? __K.m9 : chooseFrom(__K.m9, __K.m7, __K.m9);
            const domVoicing0 = subdomVoicing === __K.m7b5 ? __K.d7b9 : chooseFrom(subdomVoicing === __K.m9 ? __K.d9 : __K.d7, __K.alt, __K.d7b9); /* m7 to 7, m9 to 9 */
            const domVoicing1 = chooseFrom(__K.alt, domVoicing0, (domVoicing0 === __K.d7b9 ? domVoicing0 : __K.d7s5));
            const domVoicing2 = (domVoicing1 === __K.alt ? __K.d7b9 : (domVoicing1 === __K.d7b9 ? chooseFrom(__K.aug, domVoicing1) : domVoicing1));
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
              , chooseFrom({}, {"key": __K.b, "time": "0:0:15", "duration": staccato16n})
              , {"bassCOFShift": 1}
              ];
            const bar = {
                "name": "ii-V",
                "variantName": subdomVoicing === __K.m9 ? "m9 to 9" : subdomVoicing === __K.m7 ? "m7 to 7" : "m7♭5",
                "netCircleOfFifthsRotation": 2, 
                "events": patternEvents
            };
            let paddingBar = [];
            if (subdomVoicing === __K.m7b5 && !COMPOSER_STATE.weJustResolved) {
                /* need to start from a resolved bar first, if we aren't on one */
                paddingBar = makeBossaModulationPatterns(0, 0);
            }
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = (domVoicing2 !== __K.d7s5 && domVoicing2 !== __K.d7b9 && domVoicing2 !== __K.aug);
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return paddingBar.concat(bar);
        }
        else if (variationChoice === 2) {
            if (COMPOSER_STATE.cooldowns.bouncyTritoneSubTwoFiveOne > 0) {
                /* don't do a tritone sub ii-V-I while on this cooldown */
                return makeBossaModulationPatterns(2, 0);
            }
            const subdomVoicing = COMPOSER_STATE.preferredHoldPatternVoicing === __K.M9 ? __K.m9 : chooseFrom(__K.m9, __K.m7, __K.m9);
            const domVoicing0 = chooseFrom(subdomVoicing === __K.m9 ? __K.d9 : __K.d7, __K.alt, __K.d7s5); /* m7 to 7, m9 to 9 */
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0:0", "duration": randomlyLengthen(Tone.Time("8n"))}
              , {"key": subdomVoicing, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:4", "duration": "8n"}
              , {"key": subdomVoicing, "time": "0:0:5", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
              , {"bassCOFShift": 7}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n"}
              , {"key": domVoicing0, "time": "0:0:9", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing0, "time": "0:0:12", "duration": "8n"}
              , {"key": domVoicing0, "time": "0:0:14", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:15", "duration": staccato16n}
              , {"bassCOFShift": -5}
              ]
            const bar = {
                "name": "ii-V",
                "variantName": (subdomVoicing === __K.m9 ? "m9 to 9" : subdomVoicing === __K.m7 ? "m7 to 7" : "d9 subdom") + " tritone sub",
                "netCircleOfFifthsRotation": 2, 
                "events": patternEvents
            };
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.cooldowns.bouncyTritoneSubTwoFiveOne = 2;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return [bar];
        }
    } /* end bassCOFShift === 2 */
    else if (bassCOFShift === 3) {
        const nVariations = 2;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            /* just a ii-V-I a fifth away.. no frills */
            const twoFiveOne = makeBossaModulationPatterns(2, chooseFrom(0, 1, 2));
            const idxLastRecursedBar = twoFiveOne.length - 1;
            twoFiveOne[idxLastRecursedBar].events.unshift({"bassCOFShift": 1});
            twoFiveOne[idxLastRecursedBar].netCircleOfFifthsRotation = 3;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            return twoFiveOne;
        }
        else if (variationChoice === 1) {
            /* big sus13 spam a la mario kart */
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0:0", "duration": randomlyLengthen(Tone.Time("8n"))}
              , {"key": __K.s13, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.lb, "time": "0:0:3", "duration": randomlyLengthen(Tone.Time("8n"))}
              , {"key": __K.s13, "time": "0:0:5", "duration": staccato8n}
              , {"key": __K.lb, "time": "0:0:6", "duration": staccato8n2}
              , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
              , {"bassCOFShift": -2}
              , {"key": __K.b, "time": "0:0:8", "duration": staccato8n2}
              , {"key": __K.s13, "time": "0:0:9", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:11", "duration": staccato8n2}
              , {"key": __K.b, "time": "0:0:12", "duration": staccato8n}
              , {"key": __K.s13, "time": "0:0:12", "duration": "8n"}
              , {"key": __K.b, "time": "0:0:14", "duration": "16n", "bassCOFShift": 5}
              , {"key": __K.s13, "time": "0:0:14", "duration": "8n"}
              ]
            const bar = {
                "name": "VI-VII-I",
                "variantName": "sus13 planing",
                "netCircleOfFifthsRotation": 3, 
                "events": patternEvents
            };
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.s13;
            return [bar];
        }

    } /* end bassCOFShift === 3 */
    else if (bassCOFShift === 4) {
        const nVariations = 1;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            /* the simplest thing to do */
            // const twoFiveOne1 = makeBossaModulationPatterns(2, chooseFrom(0, 1, 2));
            // const twoFiveOne2 = makeBossaModulationPatterns(2, chooseFrom(0, 1, 2));
            // COMPOSER_STATE.weJustResolved = false;
            // COMPOSER_STATE.needResolutionBeforeNextBar = false;
            // return twoFiveOne1.concat(twoFiveOne2);
            return makeBossaModulationPatternsByTwoSmallerOnes(bassCOFShift, variation);
        }
    } /* end bassCOFShift === 4 */
    else if (bassCOFShift === 5) {
        const nVariations = 2;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            return makeBossaModulationPatternsByTwoSmallerOnes(bassCOFShift, variation);
        }
        else if (variationChoice === 1) {
            const five = makeBossaModulationPatterns(1, 1); /* shift=1 var=1 forces the d13 */
            addBassCOFShiftOffsetToEvent(five[0].events[6], 4);
            /* use the V-I pattern but change the V to be the V of our target */
            five[0].netCircleOfFifthsRotation = 5;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            // COMPOSER_STATE.preferredHoldPatternVoicing already set by makeBossaModulationPatterns call
            return five;
        }
    }
    else if (bassCOFShift === 6) {
        const nVariations = 2;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            return makeBossaModulationPatternsByTwoSmallerOnes(bassCOFShift, variation);
        }
        else if (variationChoice  === 1) {
            const five = makeBossaModulationPatterns(1, 1); /* shift=1 var=1 forces the d13 */
            addBassCOFShiftOffsetToEvent(five[0].events[6], 5);
            five[0].netCircleOfFifthsRotation = 6;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return five;
        }
    }
    else if (bassCOFShift === 7) {
        const nVariations = 1;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            const five = makeBossaModulationPatterns(1, chooseFrom(0, 3)); 
            /* shift1 var2 is the V-I via tritone sub. This branch is already a
            tritone sub targeting the tritone, not the V, so we don't use the
            tritone sub variant of shift=1 here. Also the d13 variant doesnt
            sound good so leave that out too */
            addBassCOFShiftOffsetToEvent(five[0].events[five[0].events.length-1], 6);
            five[0].netCircleOfFifthsRotation = 7;
            five[0].name = "♭II"
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            // COMPOSER_STATE.preferredHoldPatternVoicing already set by makeBossaModulationPatterns call
            return five;
        }
    }
    else if (bassCOFShift === 8) {
        const nVariations = 3;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            return makeBossaModulationPatternsByTwoSmallerOnes(bassCOFShift, variation);
        }
        else if (variationChoice === 1) {
            /* bVI-V */
            const five = makeBossaModulationPatterns(1, chooseFrom(0, 1, 2, 3)); /* shift=1 var=1 forces the d13 */
            addBassCOFShiftOffsetToEvent(five[0].events[6], 7);
            five[0].netCircleOfFifthsRotation = 8;
            five[0].name = "♭VI-V"
            COMPOSER_STATE.weJustResolved = true;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return five;
        }
        else if (variationChoice === 2) {
            /* coltrane changes */
            const tonicVoicing = chooseFrom(__K.M9, __K.M7);
            const domVoicing = tonicVoicing === __K.M9 ? __K.d9 : __K.d7;
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0", "duration": "8n"}
              , {"key": tonicVoicing, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:4", "duration": randomlyLengthen(Tone.Time("16n")), "bassCOFShift": 3}
              , {"key": domVoicing, "time": "0:0:5", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:7", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:8", "duration": "16n", "bassCOFShift": 1}
              , {"key": tonicVoicing, "time": "0:0:9", "duration": randomlyLengthen(Tone.Time("16n"))}
              , {"key": __K.b, "time": "0:0:11", "duration": staccato16n}
              , {"key": __K.b, "time": "0:0:12", "duration": "8n", "bassCOFShift": 3}
              , {"key": domVoicing, "time": chooseFrom("0:0:13", "0:0:14"), "duration": "16n"}
              , {"key": __K.b, "time": "0:0:15", "duration": staccato16n}
              , {"bassCOFShift": 1}
              ];
            const bar = {
                "name": "Coltrane",
                "variantName": tonicVoicing === __K.M9 ? "M9 to 9" : "M7 to 7",
                "netCircleOfFifthsRotation": 8, 
                "events": patternEvents
            };
            COMPOSER_STATE.weJustResolved = true;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.preferredHoldPatternVoicing = tonicVoicing;
            return [bar];
        }
    }
    else if (bassCOFShift === 9) {
        const nVariations = 2;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0 || variationChoice === 1) {
            /* planing a M9! */
            const firstShift = variationChoice === 0 ? 2 : -2;
            const secondShift = variationChoice === 0 ? 7 : 11;
            const patternEvents = 
              [ {"key": __K.b, "time": "0:0:0", "duration": Tone.Time("8n")-0.08}
              , {"key": __K.M9, "time": "0:0:2", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:3", "duration": randomlyLengthen(Tone.Time("8n"))}
              , {"key": __K.M9, "time": "0:0:5", "duration": staccato8n}
              , {"key": __K.lb, "time": "0:0:6", "duration": Tone.Time("8n")-0.08}
              , {"key": __K.b, "time": "0:0:7", "duration": Tone.Time("16n")-0.05}
              , {"bassCOFShift": firstShift}
              , {"key": __K.b, "time": "0:0:8", "duration": staccato8n2}
              , {"key": __K.M9, "time": "0:0:9", "duration": "16n"}
              , {"key": __K.b, "time": "0:0:11", "duration": Tone.Time("16n")-0.05}
              , {"key": __K.b, "time": "0:0:12", "duration": staccato8n}
              , {"key": __K.M9, "time": "0:0:12", "duration": staccato8n}
              , {"key": __K.b, "time": "0:0:14", "duration": "16n", "bassCOFShift": secondShift}
              , {"key": __K.M9, "time": "0:0:14", "duration": "8n"}
              ]
            const bar = {
                "name": variationChoice === 0 ? "♭III-♭II-I" : "♭III-IV-I",
                "variantName": "M9 planing",
                "netCircleOfFifthsRotation": 9, 
                "events": patternEvents
            };
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return [bar];
        }
    } /* end bassCOFShift === 9 */
    else if (bassCOFShift === 10) { /* a M2 up, very interesting; a 13 works well here */
        const nVariations = 2;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            const five = makeBossaHoldingPattern(__K.d13); /* forced-d13 */
            five.name = "V13";
            five.events.unshift({"bassCOFShift": 9});
            five.events.push({"bassCOFShift":1});
            five.netCircleOfFifthsRotation = 10;
            /* the hanging V13 is very unstable-sounding until it resolves */
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.preferredHoldPatternVoicing = chooseFrom(__K.M9, __K.s13);
            return [five];
        }
        else if (variationChoice === 1) {
            /* also a d13 as above, but leads with the current tonic still */
            const five = makeBossaModulationPatterns(1, 1); /* shift=1 var=1 forces the d13 */
            const idxLastRecursedBar = 0; // or maybe five.length-1;
            addBassCOFShiftOffsetToEvent(five[idxLastRecursedBar].events[6], 9);
            five[idxLastRecursedBar].netCircleOfFifthsRotation = 10;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            COMPOSER_STATE.preferredHoldPatternVoicing = __K.M9;
            return five;
        }
    } /* end bassCOFShift === 10 */
    else if (bassCOFShift === 11) { /* a fifth up... should be very compatible so we just do a ii-V  */
        const nVariations = 3;
        const variationChoice = (variation % nVariations);
        if (variationChoice === 0) {
            const twoFiveOne = makeBossaModulationPatterns(2, chooseFrom(0, 1, 2));
            const idxLastRecursedBar = twoFiveOne.length - 1;
            twoFiveOne[idxLastRecursedBar].events.unshift({"bassCOFShift": 9});
            twoFiveOne[idxLastRecursedBar].netCircleOfFifthsRotation = 11;
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            return twoFiveOne;
        }
        if (variationChoice === 1 ||  variationChoice === 2) { /* schedule two bars! this will start a 3-6-2-5-1 */
            /* special handling.. since we need to have started from a resolved
            pattern in order to make that iii chord make sense, schedule a
            resolved pattern here first before moving on to the 36251*/
            let letsResolveFirst = []
            
            if (!COMPOSER_STATE.weJustResolved) {
                letsResolveFirst = letsResolveFirst.concat(makeBossaModulationPatterns(0, variation));
            }
            if (variationChoice === 2) {
                COMPOSER_STATE.cooldowns.alternateHoldPattern = 1;
                const okaHold = makeBossaHoldingPattern(__K.two);
                okaHold.name = "II/I";
                letsResolveFirst = letsResolveFirst.concat(okaHold);
            }
            const twoFiveOne1 = makeBossaModulationPatterns(2, (variationChoice === 2 ? 0 : 1)); /* shift=2 var=1 will force m7b5 */
            const idxLastRecursedBar = twoFiveOne1.length - 1;
            twoFiveOne1[idxLastRecursedBar].events.unshift({"bassCOFShift": 7});
            twoFiveOne1[idxLastRecursedBar].netCircleOfFifthsRotation = 9;
            const twoFiveOne2 = makeBossaModulationPatterns(2, 0);
            COMPOSER_STATE.weJustResolved = false;
            COMPOSER_STATE.needResolutionBeforeNextBar = true;
            return letsResolveFirst.concat(twoFiveOne1, twoFiveOne2);
        }
    }
}

function makeBossaDrumPattern() {
    const drumDur = 0.5;
    const kick = "kick";
    const shaker = "shaker";
    const stick = "stick";
    const kickLowVel = 0.75;
    const kickHiVel = 0.85;
    const shakerLowVel = 0.1;
    const shakerHiVel = 0.4;
    const stickVel = 1.4;
    const patternEvents = [];
    for (let beat = 0; beat < 16; beat++) {
        const here = "0:0:" + beat;
        if ((beat % 4) === 0)  {
            patternEvents.push({"drum": kick, "time": here, "duration": drumDur, "drumVel": kickHiVel});
            patternEvents.push({"drum": kick, "time": "0:0:"+((beat-1) === (-1) ? 15 : (beat-1)), "duration": drumDur, "drumVel": kickLowVel});
        }
        patternEvents.push({"drum": shaker, "time": here, "duration": drumDur, "drumVel": ((beat + 2) % 4 === 0 ? shakerHiVel : shakerLowVel)});
        if (beat >= 2 && ((beat-2) % 3) === 0) {
            patternEvents.push({"drum": stick, "time": here, "duration": drumDur, "drumVel": stickVel});
        }
    }
    return patternEvents;
}


function updateAutoComposerDisplay() {
    const autoComposerInfoDisplay = document.getElementById("autocomposer-info-display");
    autoComposerInfoDisplay.innerText = "";

    const textBarInfoElem = document.createElement("div");
    
    const miscInfoElem = document.createElement("div");

    textBarInfoElem.classList.add("autocomposer-info-display-text");
    
    const makeBold = text => {
        const e = document.createElement("strong");
        e.innerText = text;
        return e;
    }
    if (COMPOSER_STATE.currentlyPlaying) {
        const prettyBarInfoElem = document.createElement("div");
        prettyBarInfoElem.classList.add("autocomposer-queue-item");
        prettyBarInfoElem.style.height = "auto";
        prettyBarInfoElem.append(COMPOSER_STATE.currentlyPlayingBarName, " \u2192 ", circleOfFifthsQueryFn(COMPOSER_STATE.currentBarTargetingKeyCenterCOFIndex, true).label)
        textBarInfoElem.append(makeBold("Playing bar: "), !COMPOSER_STATE.currentlyPlayingBarName ? 
            "(Loading)" : prettyBarInfoElem);
        miscInfoElem.append("Number of bars played: " + COMPOSER_STATE.howManyBarsPlayed);
    }
    else {
        textBarInfoElem.innerText = "Press play to start the Bossa Nova Autocomposer";
    }
    autoComposerInfoDisplay.append(textBarInfoElem, miscInfoElem);
}

function updateAutoComposerQueueDisplay(appendingBar=undefined, circleOfFifthsIndexOfNewBar=undefined) {
    const autoComposerQueueDisplay = document.getElementById("autocomposer-queue-display");
    if (!COMPOSER_STATE.currentlyPlaying) {
        autoComposerQueueDisplay.innerText = "";
        return;
    }
    const __appendReminderMsg = () => {
        autoComposerQueueDisplay.innerText = "";
        const diceIconElem = document.createElement("i");
        diceIconElem.classList.add("fas", "fa-dice");
        const spanElem = document.createElement("span");
        
        spanElem.append("Click/tap on bass note pads or ", diceIconElem, " to queue up bars...");
        autoComposerQueueDisplay.append(spanElem);
    }

    if (COMPOSER_STATE.barsQueued.length === 0) {
        __appendReminderMsg();
        return;
    }

    if (appendingBar !== undefined) {
        /* clear the first span (which is the reminder message) */
        const firstChild = autoComposerQueueDisplay.firstElementChild;
        if (firstChild && (firstChild.nodeName === "SPAN")) {
            firstChild.remove();
        }
        const barElem = document.createElement("div");
        barElem.classList.add("autocomposer-queue-item", "button-shadow");
        barElem.append(appendingBar.name, document.createElement("br"), circleOfFifthsQueryFn(circleOfFifthsIndexOfNewBar, true).label); 
        autoComposerQueueDisplay.appendChild(barElem);
    }
    else {
        /* remove the first child barElem */
        const firstQueueElem = autoComposerQueueDisplay.firstElementChild;
        if (!firstQueueElem) {
            __appendReminderMsg();
        }
        else {
            firstQueueElem.remove();
        }
    }
}

function interpretPatternEvent(event) {
    /* schedule chordtriggers and manipulate MOUSEBOARD_STATE based on our
     * pattern event data. An event can contain both bassCOFShift or key types
     * at the same time. The bass shift is processed first. 
     * NEW (after autocomposer) this can handle "drum" field and "drumVel" too. 
     */
    
    if (event.bassCOFShift !== undefined) {
        /* bass change event, change MOUSEBOARD_STATE's selected bass. Contains
         * bassCOFShift field, which is the offset (in circle of fifths index!!
         * not cents!!) that is then interpreted as the amount to shift in cents
         * via the circleOfFifthsQueryFn. The reason the offset is subtracted
         * rather than added is because it's easier to think about moving
         * counterclockwise thru the circle of fifths (resolving by fifths
         * direction) */
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
    if (event.drum !== undefined) {
        /* schedule the drum sampler note */
        if (MOUSEBOARD_STATE.drummer.loaded) {
            DrumTriggers.on(event.drum, event.drumVel, 
                Tone.Time(event.duration), 
                SCHEDULING_DELAY_FOR_LAG_PREVENTION + Tone.Transport.seconds + Tone.Time(event.time));
        }
    }
}

function syncCSSanimationsToBPM(bpm) {
    const elemsSyncedToBPM = 
        Array.from(document.getElementsByClassName("autocomposer-display-playhead-animated")).concat(
        Array.from(document.getElementsByClassName("autocomposer-display-flashing-animated")).concat(
        Array.from(document.getElementsByClassName("cof-bg-during-autocompose"))));
    for (const i in elemsSyncedToBPM) {
        /* initial values are set to 3s (80 bpm), the update should scale the number accordingly */
        elemsSyncedToBPM[i].getAnimations().forEach(a => a.updatePlaybackRate(bpm / 80));

    }
}

function startAutoComposer() {
    const _BPM = 84; /* base BPM in the css animations is 80bpm, but 84 is fine too */
    Tone.Transport.bpm.value = _BPM;
    Tone.Transport.cancel(0);
    ChordTriggers.sync();
    DrumTriggers.sync();
    /* this is just for info display purposes, but the autocomposer's starting
     * key center is whatever bass note was last selected by the user in manual
     * play mode */
    COMPOSER_STATE.currentBarTargetingKeyCenterCOFIndex = 
        MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex;
    Tone.Transport.scheduleRepeat(_ => {
        let bar = COMPOSER_STATE.barsQueued.shift();
        updateAutoComposerQueueDisplay(); /* pop the queue in the display too */
        if (!bar) {
            /* if there is no queued bar, just go into the holding pattern */
            bar = makeBossaHoldingPattern(COMPOSER_STATE.preferredHoldPatternVoicing);
        }
        /* NOTE for future... the time passed into transport callbacks is
         * actually global time, not transport seek position. For that we can
         * use Tone.Transport.seconds. */
        /* schedule events specified in bar pattern data */
        if (!bar.events) {
            console.log(bar);
        }
        for (const event of bar.events) {
            interpretPatternEvent(event);
        }
        /* update composer state with the bar's name and modulation amount */
        COMPOSER_STATE.currentlyPlayingBarName = bar.name + " (" + bar.variantName + ")";
        COMPOSER_STATE.currentBarTargetingKeyCenterCOFIndex -= bar.netCircleOfFifthsRotation;
        COMPOSER_STATE.howManyBarsPlayed++;
        updateAutoComposerDisplay();

        /* NEW (after autocomposer) schedule drum pattern */
        for (const event of COMPOSER_STATE.drumPattern) {
            interpretPatternEvent(event);
        }
    }, "1m", 0);
    MOUSEBOARD_STATE.basspads.forEach(b => {
        b.element.classList.toggle("basspad-during-autocompose");
        b.hoverEventEnabled = false;
    });
    document.getElementById("autocomposer-info-display").classList.toggle("autocomposer-display-playhead-animated");
    document.getElementById("autocomposer-queue-display").classList.toggle("autocomposer-display-flashing-animated");
    syncCSSanimationsToBPM(_BPM);
    Tone.Transport.start();
}

function stopAutoComposer() {
    Tone.Transport.stop();
    Tone.Transport.cancel(0);
    COMPOSER_STATE.lastKeyCenterCOFIndexQueued = undefined;
    COMPOSER_STATE.barsQueued = [];
    COMPOSER_STATE.howManyBarsPlayed = 0;
    
    /* reset cooldowns to initial values */
    COMPOSER_STATE.cooldowns.alternateHoldPattern = 1;
    COMPOSER_STATE.cooldowns.bouncyTritoneSubTwoFiveOne = 0;
    ChordTriggers.unsync(); /* return manual control over trigger inputs */
    ChordTriggers.allOff(); /* force turn off any hanging notes */
    DrumTriggers.unsync();
    DrumTriggers.allOff();
    updateAutoComposerDisplay();
    updateAutoComposerQueueDisplay();
    updateChordDisplay();
    MOUSEBOARD_STATE.basspads.forEach(b => {
        b.element.classList.toggle("basspad-during-autocompose");
        b.hoverEventEnabled = true;
    });
    document.getElementById("autocomposer-info-display").classList.toggle("autocomposer-display-playhead-animated");
    document.getElementById("autocomposer-queue-display").classList.toggle("autocomposer-display-flashing-animated");
}

function setupAutoComposer() {
    /* add click events to the play/stop button */
    const cofBg = document.getElementById("circle-of-fifths-bg");
    const togglePlayWithButton = (button) => {
        COMPOSER_STATE.currentlyPlaying = !COMPOSER_STATE.currentlyPlaying;
        if (COMPOSER_STATE.currentlyPlaying) {
            button.classList.add("fa-stop"); /* stop button */
            button.classList.remove("fa-play");
            button.style.fontSize = "1.6rem";
            startAutoComposer();
        }
        else {
            button.classList.add("fa-play");
            button.classList.remove("fa-stop");
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
            let last = COMPOSER_STATE.lastKeyCenterCOFIndexQueued;
            last = (last === undefined ? MOUSEBOARD_STATE.bassNoteSelected.circleOfFifthsIndex : last);
            /* update to the last queued key center as a circle-of-fifths index */
            const variation = Math.floor(12 * Math.random());
            const newBars = makeBossaModulationPatterns(last - circleOfFifthsIndex, variation);
            if (!newBars) {
                return;
            }
            COMPOSER_STATE.barsQueued.push(...newBars);
            /* update the queue display with the new queued bar(s). Assumption:
             * accumulating the net rotations of the queued bars and adding them
             * to "last" should equal circleOfFifthsIndex. There's a chance I
             * might make mistakes in teh code and that might not hold, So i'll
             * just set the lastKeyCenterCOFIndexQueued to the accumulate value
             */
            let accumulatedCircleOfFifthsIndex = last;
            for (const i in newBars) {
                const newBar = newBars[i];
                accumulatedCircleOfFifthsIndex -= newBar.netCircleOfFifthsRotation;
                updateAutoComposerQueueDisplay(newBar, accumulatedCircleOfFifthsIndex);
            }
            /* set to accumulate offsets across all bars queued. Again this
             * *should* be equivalent to setting this to circleOfFifthsIndex,
             * but for some reason it not always does. (edit: i've fixed the bug
             * I think but more may crop up) */
            COMPOSER_STATE.lastKeyCenterCOFIndexQueued = normalizeCircleOfFifthsIndex(accumulatedCircleOfFifthsIndex);
            // /* debug debug */
            // if (normalizeCircleOfFifthsIndex(accumulatedCircleOfFifthsIndex) != circleOfFifthsIndex) {
            //     console.log("bad! requested COF index " + circleOfFifthsIndex  
            //     + " not reached by the queued bars (actual net rotation was " 
            //     + accumulatedCircleOfFifthsIndex + " normalized " + normalizeCircleOfFifthsIndex(accumulatedCircleOfFifthsIndex) + "!) The requested shift was " + (last - circleOfFifthsIndex) + "variation was " + variation);
            //     console.log(newBars);
            // }
        }
    }
    for (const basspad of MOUSEBOARD_STATE.basspads) {
        basspad.element.addEventListener("click", e => {
            e.preventDefault(); 
            targetNewKeyFromBasspad(basspad.circleOfFifthsIndex);
        });
        basspad.element.addEventListener("touchstart", e => {
            e.preventDefault();
            targetNewKeyFromBasspad(basspad.circleOfFifthsIndex);
        });
    }
    document.getElementById("autocomposer-random-button").addEventListener("click", e => {
        e.preventDefault();
        targetNewKeyFromBasspad(Math.floor(Math.random() * 12));
    });

    /* NEW (after autocomposer) make drum pattern */
    COMPOSER_STATE.drumPattern = makeBossaDrumPattern();
}