/* ============================================================
   S.P.A.C.E. ALPHABETS — QUESTION CONTENT LIBRARY
   ============================================================
   This file is a CONTENT LIBRARY + QUESTION GENERATOR, not a
   fixed list of questions. app.js only ever reads the global
   QUESTION_BANKS object — everything else here is internal.

   TO ADD NEW CONTENT, you only ever need to edit the three
   *_LIBRARY arrays below:

     EASY_SOUND_LIBRARY     — one entry per letter-sound recording
     MEDIUM_PATTERN_LIBRARY — one entry per phonics word
     HARD_ALIEN_LIBRARY     — one entry per alien pseudo-word

   You can add as many entries as you like, including several
   different audio recordings for the same letter/word (just
   give them the same "letter"/"word" value) — the generator will
   pick one at random each time that item is used. Nothing else
   in this file, or in app.js, needs to change.

   Every time a game starts, app.js asks QUESTION_BANKS.easy /
   .medium / .hard for a bank of questions. These are implemented
   as getters (see the bottom of this file) so a FRESH bank is
   generated on every request: a random audio variant, a random
   (but appropriate) wrong answer, and a random option order are
   chosen right then. Because each bank contains exactly one
   question per distinct letter/word, and app.js draws its 7
   questions from that bank without replacement, no two questions
   in the same mission can ever be duplicates of each other.
   ============================================================ */

/* ------------------------------------------------------------
   SHARED HELPERS
   ------------------------------------------------------------ */

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Groups an array of items by a key, e.g. by letter or by word,
// so the generator can pick one random variant per group.
function groupLibraryBy(items, keyFn) {
  const groups = {};
  items.forEach(item => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  return groups;
}

/* ============================================================
   EASY — ALPHABET SOUNDS
   ============================================================
   Each entry is one audio recording of a single letter sound.
   Add more entries with the same "letter" to give the game
   several different recordings to choose from for that letter.
   ============================================================ */

const EASY_SOUND_LIBRARY = [
  { audio: "audio/easy-A.mp3", letter: "A" },
  { audio: "audio/easy-B.mp3", letter: "B" },
  { audio: "audio/easy-C.mp3", letter: "C" },
  { audio: "audio/easy-D.mp3", letter: "D" },
  { audio: "audio/easy-E.mp3", letter: "E" },
  { audio: "audio/easy-F.mp3", letter: "F" },
  { audio: "audio/easy-G.mp3", letter: "G" },
  { audio: "audio/easy-H.mp3", letter: "H" },
  { audio: "audio/easy-I.mp3", letter: "I" },
  { audio: "audio/easy-J.mp3", letter: "J" },
  { audio: "audio/easy-K.mp3", letter: "K" },
  { audio: "audio/easy-L.mp3", letter: "L" },
  { audio: "audio/easy-M.mp3", letter: "M" },
  { audio: "audio/easy-N.mp3", letter: "N" },
  { audio: "audio/easy-O.mp3", letter: "O" },
  { audio: "audio/easy-P.mp3", letter: "P" },
  { audio: "audio/easy-Q.mp3", letter: "Q" },
  { audio: "audio/easy-R.mp3", letter: "R" },
  { audio: "audio/easy-S.mp3", letter: "S" },
  { audio: "audio/easy-T.mp3", letter: "T" },
  { audio: "audio/easy-U.mp3", letter: "U" },
  { audio: "audio/easy-V.mp3", letter: "V" },
  { audio: "audio/easy-W.mp3", letter: "W" },
  { audio: "audio/easy-X.mp3", letter: "X" },
  { audio: "audio/easy-Y.mp3", letter: "Y" },
  { audio: "audio/easy-Z.mp3", letter: "Z" }
];

// Letters students commonly mix up by sound — used to pick a
// "suitable" wrong answer instead of a completely random letter.
const EASY_CONFUSION_MAP = {
  A: ["E", "U"],
  B: ["D", "P", "V"],
  C: ["G", "Q", "S"],
  D: ["B", "T"],
  E: ["I", "A"],
  F: ["V", "H"],
  G: ["C", "J"],
  H: ["A"],
  I: ["E", "Y"],
  J: ["G", "Z"],
  K: ["G", "Q"],
  L: ["R"],
  M: ["N"],
  N: ["M"],
  O: ["U"],
  P: ["B"],
  Q: ["K", "C"],
  R: ["L"],
  S: ["X", "F", "Z"],
  T: ["D"],
  U: ["O", "A"],
  V: ["B", "F"],
  W: ["O", "U"],
  X: ["S", "Z"],
  Y: ["I"],
  Z: ["S", "X"]
};

const ALPHABET_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function pickEasyDistractor(letter) {
  const pool = (EASY_CONFUSION_MAP[letter] || []).filter(l => l !== letter);
  if (pool.length > 0) return randomChoice(pool);
  // Fallback: any other letter, in case a letter is ever missing
  // from the confusion map above.
  return randomChoice(ALPHABET_LETTERS.filter(l => l !== letter));
}

function buildEasyBank() {
  const byLetter = groupLibraryBy(EASY_SOUND_LIBRARY, item => item.letter);
  return Object.keys(byLetter).map(letter => {
    const chosen = randomChoice(byLetter[letter]); // random recording for this letter
    const distractor = pickEasyDistractor(letter);
    return {
      audio: chosen.audio,
      correctAnswer: letter,
      options: [letter, distractor],
      prompt: "Which letter did you hear?"
    };
  });
}

/* ============================================================
   MEDIUM — PHONICS PATTERNS
   ============================================================
   Each entry is one real word that highlights a phonics pattern
   (a consonant digraph/blend, a double consonant, a vowel team,
   an r-controlled vowel, or a long-vowel/silent-e pattern).

     word    — the spoken word (for your own reference)
     display — the word with the target pattern blanked out,
               shown on screen exactly as you write it
               (e.g. "WAT__")
     pattern — the correct missing pattern (e.g. "ch")

     group   — which category this pattern belongs to, so the
               generator only ever picks a wrong answer from the
               SAME category (never an unrelated pattern)

   Optionally add distractorPool: [...] to hand-pick which wrong
   answers are allowed for that specific word instead of using
   the whole category (handy for long-vowel/silent-e pairs).
   ============================================================ */

// Every phonics pattern the generator knows about, grouped by
// category. A word's distractor (when it has no distractorPool of
// its own) is chosen at random from this same-category list.
const PHONICS_PATTERN_GROUPS = {
  digraph: ["ch", "sh", "th", "wh", "ph"],
  blend: [
    "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr",
    "pl", "pr", "sc", "sk", "sl", "sm", "sn", "sp", "st",
    "sw", "tr", "tw"
  ],
  doubleConsonant: ["ll", "ss", "ff", "zz", "tt", "dd", "pp", "mm", "nn"],
  vowelTeam: ["ai", "ay", "ee", "ea", "oa", "oe", "oi", "oy", "ou", "ow"],
  rControlled: ["ar", "er", "ir", "or", "ur"],
  longVowel: ["ake", "ak", "ime", "im", "one", "on", "ute", "ut"]
};

const MEDIUM_PATTERN_LIBRARY = [
  // Consonant digraphs
  { audio: "audio/med-watch.mp3", word: "watch", display: "WAT__", pattern: "ch", group: "digraph" },
  { audio: "audio/med-fish.mp3", word: "fish", display: "FI__", pattern: "sh", group: "digraph" },
  { audio: "audio/med-that.mp3", word: "that", display: "__AT", pattern: "th", group: "digraph" },
  { audio: "audio/med-wheel.mp3", word: "wheel", display: "__EEL", pattern: "wh", group: "digraph" },
  { audio: "audio/med-phone.mp3", word: "phone", display: "__ONE", pattern: "ph", group: "digraph" },

  // Consonant blends
  { audio: "audio/med-black.mp3", word: "black", display: "__ACK", pattern: "bl", group: "blend" },
  { audio: "audio/med-crab.mp3", word: "crab", display: "__AB", pattern: "cr", group: "blend" },
  { audio: "audio/med-drum.mp3", word: "drum", display: "__UM", pattern: "dr", group: "blend" },
  { audio: "audio/med-flag.mp3", word: "flag", display: "__AG", pattern: "fl", group: "blend" },
  { audio: "audio/med-grape.mp3", word: "grape", display: "__APE", pattern: "gr", group: "blend" },
  { audio: "audio/med-plane.mp3", word: "plane", display: "__ANE", pattern: "pl", group: "blend" },
  { audio: "audio/med-stamp.mp3", word: "stamp", display: "__AMP", pattern: "st", group: "blend" },
  { audio: "audio/med-swim.mp3", word: "swim", display: "__IM", pattern: "sw", group: "blend" },
  { audio: "audio/med-tree.mp3", word: "tree", display: "__EE", pattern: "tr", group: "blend" },
  { audio: "audio/med-twin.mp3", word: "twin", display: "__IN", pattern: "tw", group: "blend" },

  // Double consonants
  { audio: "audio/med-bell.mp3", word: "bell", display: "BE__", pattern: "ll", group: "doubleConsonant" },
  { audio: "audio/med-kiss.mp3", word: "kiss", display: "KI__", pattern: "ss", group: "doubleConsonant" },
  { audio: "audio/med-buzz.mp3", word: "buzz", display: "BU__", pattern: "zz", group: "doubleConsonant" },
  { audio: "audio/med-puff.mp3", word: "puff", display: "PU__", pattern: "ff", group: "doubleConsonant" },
  { audio: "audio/med-mitt.mp3", word: "mitt", display: "MI__", pattern: "tt", group: "doubleConsonant" },

  // Vowel teams
  { audio: "audio/med-rain.mp3", word: "rain", display: "R__N", pattern: "ai", group: "vowelTeam" },
  { audio: "audio/med-sheep.mp3", word: "sheep", display: "SH__P", pattern: "ee", group: "vowelTeam" },
  { audio: "audio/med-boat.mp3", word: "boat", display: "B__T", pattern: "oa", group: "vowelTeam" },
  { audio: "audio/med-coin.mp3", word: "coin", display: "C__N", pattern: "oi", group: "vowelTeam" },
  { audio: "audio/med-toy.mp3", word: "toy", display: "T__", pattern: "oy", group: "vowelTeam" },
  { audio: "audio/med-cloud.mp3", word: "cloud", display: "CL__D", pattern: "ou", group: "vowelTeam" },
  { audio: "audio/med-cow.mp3", word: "cow", display: "C__", pattern: "ow", group: "vowelTeam" },

  // R-controlled vowels
  { audio: "audio/med-car.mp3", word: "car", display: "C__", pattern: "ar", group: "rControlled" },
  { audio: "audio/med-her.mp3", word: "her", display: "H__", pattern: "er", group: "rControlled" },
  { audio: "audio/med-bird.mp3", word: "bird", display: "B__D", pattern: "ir", group: "rControlled" },
  { audio: "audio/med-corn.mp3", word: "corn", display: "C__N", pattern: "or", group: "rControlled" },
  { audio: "audio/med-burn.mp3", word: "burn", display: "B__N", pattern: "ur", group: "rControlled" },

  // Long-vowel / silent-e patterns (each paired with its own
  // short-vowel contrast via distractorPool, since the useful
  // wrong answer here is specifically "the same ending without
  // the silent e", not just any other long-vowel pattern)
  { audio: "audio/med-cake.mp3", word: "cake", display: "C__", pattern: "ake", group: "longVowel", distractorPool: ["ak"] },
  { audio: "audio/med-time.mp3", word: "time", display: "T__", pattern: "ime", group: "longVowel", distractorPool: ["im"] },
  { audio: "audio/med-bone.mp3", word: "bone", display: "B__", pattern: "one", group: "longVowel", distractorPool: ["on"] },
  { audio: "audio/med-cute.mp3", word: "cute", display: "C__", pattern: "ute", group: "longVowel", distractorPool: ["ut"] }
];

function pickPhonicsDistractor(item) {
  const pattern = item.pattern;

  if (Array.isArray(item.distractorPool) && item.distractorPool.length > 0) {
    const custom = item.distractorPool.filter(p => p !== pattern);
    if (custom.length > 0) return randomChoice(custom);
  }

  const groupList = PHONICS_PATTERN_GROUPS[item.group] || [];
  const sameGroup = groupList.filter(p => p !== pattern);
  if (sameGroup.length > 0) return randomChoice(sameGroup);

  // Fallback (should not normally happen): any other known pattern.
  const everyPattern = Object.values(PHONICS_PATTERN_GROUPS).flat().filter(p => p !== pattern);
  return randomChoice(everyPattern);
}

function buildMediumBank() {
  const byWord = groupLibraryBy(MEDIUM_PATTERN_LIBRARY, item => item.word);
  return Object.keys(byWord).map(word => {
    const chosen = randomChoice(byWord[word]); // random recording for this word
    const distractor = pickPhonicsDistractor(chosen);
    return {
      audio: chosen.audio,
      correctAnswer: chosen.pattern.toUpperCase(),
      options: [chosen.pattern.toUpperCase(), distractor.toUpperCase()],
      prompt: `What sound is missing?: ${chosen.display}`
    };
  });
}

/* ============================================================
   HARD — ALIEN LANGUAGE DECODER 👽
   ============================================================
   Each entry is one alien pseudo-word. Provide a curated list of
   plausible-but-wrong spellings in distractorPool — a random one
   is chosen each time this word is used, rather than always the
   same pairing.
   ============================================================ */

const HARD_ALIEN_LIBRARY = [
  { audio: "audio/hard-shroop.mp3", word: "shroop", correctSpelling: "SHROOP", distractorPool: ["SHROUP", "SHROOB", "SHRUPE"] },
  { audio: "audio/hard-blentar.mp3", word: "blentar", correctSpelling: "BLENTAR", distractorPool: ["BLENTER", "BLENTOR", "BLENTARE"] },
  { audio: "audio/hard-crendix.mp3", word: "crendix", correctSpelling: "CRENDIX", distractorPool: ["CRENDEX", "KRENDIX", "CRENDIKS"] },
  { audio: "audio/hard-florum.mp3", word: "florum", correctSpelling: "FLORUM", distractorPool: ["FLOROM", "FLORAM", "FLORUME"] },
  { audio: "audio/hard-wexlin.mp3", word: "wexlin", correctSpelling: "WEXLIN", distractorPool: ["WEKSLIN", "WEXLYN", "WEXLINN"] },
  { audio: "audio/hard-thrandle.mp3", word: "thrandle", correctSpelling: "THRANDLE", distractorPool: ["THRANDEL", "TRANDLE", "THRANDDLE"] },
  { audio: "audio/hard-glimzo.mp3", word: "glimzo", correctSpelling: "GLIMZO", distractorPool: ["GLIMSO", "GLYMZO", "GLIMZOE"] },
  { audio: "audio/hard-prantik.mp3", word: "prantik", correctSpelling: "PRANTIK", distractorPool: ["PRANTICK", "PRANTEK", "PRANTIQ"] },
  { audio: "audio/hard-sklovar.mp3", word: "sklovar", correctSpelling: "SKLOVAR", distractorPool: ["SCLOVAR", "SKLOVER", "SKLOVARE"] },
  { audio: "audio/hard-nemquil.mp3", word: "nemquil", correctSpelling: "NEMQUIL", distractorPool: ["NEMQUILL", "NEMQUEL", "NEMQUYLE"] }
];

function pickAlienDistractor(item) {
  const pool = (item.distractorPool || []).filter(s => s !== item.correctSpelling);
  if (pool.length > 0) return randomChoice(pool);
  // Fallback: borrow a spelling from a different alien word rather
  // than leaving the question with only one option.
  const others = HARD_ALIEN_LIBRARY
    .filter(other => other.word !== item.word)
    .map(other => other.correctSpelling);
  return randomChoice(others);
}

function buildHardBank() {
  const byWord = groupLibraryBy(HARD_ALIEN_LIBRARY, item => item.word);
  return Object.keys(byWord).map(word => {
    const chosen = randomChoice(byWord[word]); // random recording for this alien word
    const distractor = pickAlienDistractor(chosen);
    return {
      audio: chosen.audio,
      correctAnswer: chosen.correctSpelling,
      options: [chosen.correctSpelling, distractor],
      prompt: "The 👽 alien says:"
    };
  });
}

/* ============================================================
   QUESTION_BANKS — what app.js actually reads
   ============================================================
   These are getters, not plain arrays: every time app.js reads
   QUESTION_BANKS.easy / .medium / .hard (once per mission, from
   pickRoundQuestions()), a brand-new bank is generated on the
   spot with fresh random audio picks, distractors, and — since
   there's exactly one entry per letter/word — no possibility of
   duplicate questions within that mission.
   ============================================================ */
const QUESTION_BANKS = {
  get easy() { return buildEasyBank(); },
  get medium() { return buildMediumBank(); },
  get hard() { return buildHardBank(); }
};
