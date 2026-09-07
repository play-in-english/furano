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
  A: ["E", "U", "H", "V"],
  B: ["D", "P", "V", "G"],
  C: ["G", "Q", "S", "O"],
  D: ["B", "T", "R", "P"],
  E: ["I", "A", "F", "W"],
  F: ["V", "H", "P", "R"],
  G: ["C", "J", "Q", "K"],
  H: ["A", "U", "I", "X"],
  I: ["E", "Y", "H", "L"],
  J: ["G", "Z", "U", "K"],
  K: ["G", "Q", "R", "X"],
  L: ["R", "A", "Y", "E"],
  M: ["N", "T", "V", "H"],
  N: ["M", "A", "D", "J"],
  O: ["U", "A", "E", "I"],
  P: ["B", "D", "F", "Z"],
  Q: ["K", "C", "W", "U"],
  R: ["L", "P", "K", "Q"],
  S: ["X", "F", "Z", "5"],
  T: ["D", "P", "J", "Y"],
  U: ["O", "A", "N", "C"],
  V: ["B", "F", "Z", "W"],
  W: ["O", "U", "V", "M"],
  X: ["S", "Z", "K", "U"],
  Y: ["I", "E", "T", "V"],
  Z: ["S", "X", "2", "D"]
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
   MEDIUM — PHONICS PATTERNS (v3)
   ============================================================
   Categories (6 total), 2 words per individual pattern:

     1. doubleConsonant : ll, ss, ff, zz, tt, dd, pp, mm, nn
     2. digraph         : ch, sh, ph, wh, th (Thursday), th (father), ck, ng
     3. vowelTeamA       : ai, ay, ea, ee, ie, oa, ow(snow), ou(soup), ue, ui
     4. vowelTeamB       : oo(moon), oo(book), ou(loud), ow(cow), au, oi, oy
     5. rControlled      : ar, or, ir, wor, ear, er, air, ire, ore, ur, our
     6. blend            : bl, cl, fl, gl, pl, sl, br, cr, dr, fr, gr, pr, tr,
                            sc, sk, sm, sn, sp, st, sw, spr, str, thr

   DISTRACTOR RULE
   ----------------
   The wrong answer offered alongside the correct pattern is picked
   at random from a **different category** than the correct answer's
   own category (never the same category, so "TH" never appears next
   to another digraph like "SH"). It also can never be visually
   identical text to the correct answer (so two entries that happen
   to share the letters "OW" in different categories never get
   shown together), and — for the SAME word — it will not repeat the
   exact same distractor it used the previous time that word came up
   in this session, so the pairing keeps changing round to round.
   ============================================================ */

// ---- 1. Master pattern pool, tagged by category -------------
// (Used only to pick distractors — not the questions themselves.)
const PATTERN_GROUPS = {
  doubleConsonant: ["ll", "ss", "ff", "zz", "tt", "dd", "pp", "mm", "nn"],
  digraph: ["ch", "sh", "ph", "wh", "th", "th", "ck", "ng"],
  vowelTeamA: ["ai", "ay", "ea", "ee", "ie", "oa", "ow", "ou", "ue", "ui"],
  vowelTeamB: ["oo", "oo", "ou", "ow", "au", "oi", "oy"],
  rControlled: ["ar", "or", "ir", "wor", "ear", "er", "air", "ire", "ore", "ur", "our"],
  blend: [
    "bl", "cl", "fl", "gl", "pl", "sl",
    "br", "cr", "dr", "fr", "gr", "pr", "tr",
    "sc", "sk", "sm", "sn", "sp", "st", "sw",
    "spr", "str", "thr"
  ]
};

// Flatten into { text, group } pairs once, for fast lookup.
const ALL_PATTERNS = Object.entries(PATTERN_GROUPS).flatMap(([group, list]) =>
  list.map(text => ({ text, group }))
);

// ---- 2. Word library ------------------------------------------------
// display: the word with ONLY the target pattern blanked out.
const MEDIUM_PATTERN_LIBRARY = [

  // ---------------- 1. Double consonants ----------------
  { audio: "audio/med-bell.mp3",    word: "bell",    display: "BE__",     pattern: "ll", group: "doubleConsonant" },
  { audio: "audio/med-doll.mp3",    word: "doll",    display: "DO__",     pattern: "ll", group: "doubleConsonant" },
  { audio: "audio/med-kiss.mp3",    word: "kiss",    display: "KI__",     pattern: "ss", group: "doubleConsonant" },
  { audio: "audio/med-pass.mp3",    word: "pass",    display: "PA__",     pattern: "ss", group: "doubleConsonant" },
  { audio: "audio/med-puff.mp3",    word: "puff",    display: "PU__",     pattern: "ff", group: "doubleConsonant" },
  { audio: "audio/med-cliff.mp3",   word: "cliff",   display: "CLI__",    pattern: "ff", group: "doubleConsonant" },
  { audio: "audio/med-buzz.mp3",    word: "buzz",    display: "BU__",     pattern: "zz", group: "doubleConsonant" },
  { audio: "audio/med-jazz.mp3",    word: "jazz",    display: "JA__",     pattern: "zz", group: "doubleConsonant" },
  { audio: "audio/med-mitt.mp3",    word: "mitt",    display: "MI__",     pattern: "tt", group: "doubleConsonant" },
  { audio: "audio/med-button.mp3",  word: "button",  display: "BU__ON",   pattern: "tt", group: "doubleConsonant" },
  { audio: "audio/med-add.mp3",     word: "add",     display: "A__",      pattern: "dd", group: "doubleConsonant" },
  { audio: "audio/med-ladder.mp3",  word: "ladder",  display: "LA__ER",   pattern: "dd", group: "doubleConsonant" },
  { audio: "audio/med-puppy.mp3",   word: "puppy",   display: "PU__Y",    pattern: "pp", group: "doubleConsonant" },
  { audio: "audio/med-happy.mp3",   word: "happy",   display: "HA__Y",    pattern: "pp", group: "doubleConsonant" },
  { audio: "audio/med-hammer.mp3",  word: "hammer",  display: "HA__ER",   pattern: "mm", group: "doubleConsonant" },
  { audio: "audio/med-summer.mp3",  word: "summer",  display: "SU__ER",   pattern: "mm", group: "doubleConsonant" },
  { audio: "audio/med-dinner.mp3",  word: "dinner",  display: "DI__ER",   pattern: "nn", group: "doubleConsonant" },
  { audio: "audio/med-sunny.mp3",   word: "sunny",   display: "SU__Y",    pattern: "nn", group: "doubleConsonant" },

  // ---------------- 2. Consonant digraphs ----------------
  { audio: "audio/med-chair.mp3",   word: "chair",   display: "__AIR",    pattern: "ch", group: "digraph" },
  { audio: "audio/med-lunch.mp3",   word: "lunch",   display: "LUN__",    pattern: "ch", group: "digraph" },
  { audio: "audio/med-shop.mp3",    word: "shop",    display: "__OP",     pattern: "sh", group: "digraph" },
  { audio: "audio/med-fish.mp3",    word: "fish",    display: "FI__",     pattern: "sh", group: "digraph" },
  { audio: "audio/med-phone.mp3",   word: "phone",   display: "__ONE",    pattern: "ph", group: "digraph" },
  { audio: "audio/med-dolphin.mp3", word: "dolphin", display: "DOL__IN",  pattern: "ph", group: "digraph" },
  { audio: "audio/med-whale.mp3",   word: "whale",   display: "__ALE",    pattern: "wh", group: "digraph" },
  { audio: "audio/med-white.mp3",   word: "white",   display: "__ITE",    pattern: "wh", group: "digraph" },
  { audio: "audio/med-thursday.mp3",word: "Thursday",display: "__URSDAY", pattern: "th", group: "digraph" },
  { audio: "audio/med-three.mp3",   word: "three",   display: "__REE",    pattern: "th", group: "digraph" },
  { audio: "audio/med-weather.mp3", word: "weather", display: "WEA__ER",  pattern: "th", group: "digraph" },
  { audio: "audio/med-mother.mp3",  word: "mother",  display: "MO__ER",   pattern: "th", group: "digraph" },
  { audio: "audio/med-duck.mp3",    word: "duck",    display: "DU__",     pattern: "ck", group: "digraph" },
  { audio: "audio/med-clock.mp3",   word: "clock",   display: "CLO__",    pattern: "ck", group: "digraph" },
  { audio: "audio/med-king.mp3",    word: "king",    display: "KI__",     pattern: "ng", group: "digraph" },
  { audio: "audio/med-song.mp3",    word: "song",    display: "SO__",     pattern: "ng", group: "digraph" },

  // ---------------- 3. Vowel teams (group A) ----------------
  { audio: "audio/med-rain.mp3",    word: "rain",    display: "R__N",     pattern: "ai", group: "vowelTeamA" },
  { audio: "audio/med-snail.mp3",   word: "snail",   display: "SN__L",    pattern: "ai", group: "vowelTeamA" },
  { audio: "audio/med-play.mp3",    word: "play",    display: "PL__",     pattern: "ay", group: "vowelTeamA" },
  { audio: "audio/med-day.mp3",     word: "day",     display: "D__",      pattern: "ay", group: "vowelTeamA" },
  { audio: "audio/med-peach.mp3",   word: "peach",   display: "P__CH",    pattern: "ea", group: "vowelTeamA" },
  { audio: "audio/med-sea.mp3",     word: "sea",     display: "S__",      pattern: "ea", group: "vowelTeamA" },
  { audio: "audio/med-tree.mp3",    word: "tree",    display: "TR__",     pattern: "ee", group: "vowelTeamA" },
  { audio: "audio/med-sheep.mp3",   word: "sheep",   display: "SH__P",    pattern: "ee", group: "vowelTeamA" },
  { audio: "audio/med-pie.mp3",     word: "pie",     display: "P__",      pattern: "ie", group: "vowelTeamA" },
  { audio: "audio/med-tie.mp3",     word: "tie",     display: "T__",      pattern: "ie", group: "vowelTeamA" },
  { audio: "audio/med-boat.mp3",    word: "boat",    display: "B__T",     pattern: "oa", group: "vowelTeamA" },
  { audio: "audio/med-soap.mp3",    word: "soap",    display: "S__P",     pattern: "oa", group: "vowelTeamA" },
  { audio: "audio/med-snow.mp3",    word: "snow",    display: "SN__",     pattern: "ow", group: "vowelTeamA" },
  { audio: "audio/med-yellow.mp3",  word: "yellow",  display: "YELL__",   pattern: "ow", group: "vowelTeamA" },
  { audio: "audio/med-blue.mp3",    word: "blue",    display: "BL__",     pattern: "ue", group: "vowelTeamA" },
  { audio: "audio/med-glue.mp3",    word: "glue",    display: "GL__",     pattern: "ue", group: "vowelTeamA" },
  { audio: "audio/med-fruit.mp3",   word: "fruit",   display: "FR__T",    pattern: "ui", group: "vowelTeamA" },
  { audio: "audio/med-suit.mp3",    word: "suit",    display: "S__T",     pattern: "ui", group: "vowelTeamA" },

  // ---------------- 4. Vowel teams (group B: diphthongs) ----------------
  { audio: "audio/med-moon.mp3",    word: "moon",    display: "M__N",     pattern: "oo", group: "vowelTeamB" },
  { audio: "audio/med-spoon.mp3",   word: "spoon",   display: "SP__N",    pattern: "oo", group: "vowelTeamB" },
  { audio: "audio/med-book.mp3",    word: "book",    display: "B__K",     pattern: "oo", group: "vowelTeamB" },
  { audio: "audio/med-foot.mp3",    word: "foot",    display: "F__T",     pattern: "oo", group: "vowelTeamB" },
  { audio: "audio/med-loud.mp3",    word: "loud",    display: "L__D",     pattern: "ou", group: "vowelTeamB" },
  { audio: "audio/med-mouse.mp3",   word: "mouse",   display: "M__SE",    pattern: "ou", group: "vowelTeamB" },
  { audio: "audio/med-cloudy.mp3",  word: "cloudy",  display: "CL__DY",   pattern: "ou", group: "vowelTeamB" },
  { audio: "audio/med-cow.mp3",     word: "cow",     display: "C__",      pattern: "ow", group: "vowelTeamB" },
  { audio: "audio/med-owl.mp3",     word: "owl",     display: "__L",      pattern: "ow", group: "vowelTeamB" },
  { audio: "audio/med-sauce.mp3",   word: "sauce",   display: "S__CE",    pattern: "au", group: "vowelTeamB" },
  { audio: "audio/med-author.mp3",  word: "author",  display: "__THOR",   pattern: "au", group: "vowelTeamB" },
  { audio: "audio/med-coin.mp3",    word: "coin",    display: "C__N",     pattern: "oi", group: "vowelTeamB" },
  { audio: "audio/med-voice.mp3",   word: "voice",   display: "V__CE",    pattern: "oi", group: "vowelTeamB" },
  { audio: "audio/med-boy.mp3",     word: "boy",     display: "B__",      pattern: "oy", group: "vowelTeamB" },
  { audio: "audio/med-toy.mp3",     word: "toy",     display: "T__",      pattern: "oy", group: "vowelTeamB" },

  // ---------------- 5. R-controlled / "murmuring" vowels ----------------
  { audio: "audio/med-car.mp3",     word: "car",     display: "C__",      pattern: "ar", group: "rControlled" },
  { audio: "audio/med-star.mp3",    word: "star",    display: "ST__",     pattern: "ar", group: "rControlled" },
  { audio: "audio/med-corn.mp3",    word: "corn",    display: "C__N",     pattern: "or", group: "rControlled" },
  { audio: "audio/med-fork.mp3",    word: "fork",    display: "F__K",     pattern: "or", group: "rControlled" },
  { audio: "audio/med-bird.mp3",    word: "bird",    display: "B__D",     pattern: "ir", group: "rControlled" },
  { audio: "audio/med-shirt.mp3",   word: "shirt",   display: "SH__T",    pattern: "ir", group: "rControlled" },
  { audio: "audio/med-word.mp3",    word: "word",    display: "__D",      pattern: "wor", group: "rControlled" },
  { audio: "audio/med-work.mp3",    word: "work",    display: "__K",      pattern: "wor", group: "rControlled" },
  { audio: "audio/med-clear.mp3",   word: "clear",   display: "CL__",     pattern: "ear", group: "rControlled" },
  { audio: "audio/med-year.mp3",    word: "year",    display: "Y__",      pattern: "ear", group: "rControlled" },
  { audio: "audio/med-dinner.mp3",  word: "dinner",  display: "DINN__",   pattern: "er", group: "rControlled" },
  { audio: "audio/med-sister.mp3",  word: "sister",  display: "SIST__",   pattern: "er", group: "rControlled" },
  { audio: "audio/med-hair.mp3",    word: "hair",    display: "H__",      pattern: "air", group: "rControlled" },
  { audio: "audio/med-fair.mp3",    word: "fair",    display: "F__",      pattern: "air", group: "rControlled" },
  { audio: "audio/med-fire.mp3",    word: "fire",    display: "F__",      pattern: "ire", group: "rControlled" },
  { audio: "audio/med-tire.mp3",    word: "tire",    display: "T__",      pattern: "ire", group: "rControlled" },
  { audio: "audio/med-store.mp3",   word: "store",   display: "ST__",     pattern: "ore", group: "rControlled" },
  { audio: "audio/med-more.mp3",    word: "more",    display: "M__",      pattern: "ore", group: "rControlled" },
  { audio: "audio/med-turn.mp3",    word: "turn",    display: "T__N",     pattern: "ur", group: "rControlled" },
  { audio: "audio/med-nurse.mp3",   word: "nurse",   display: "N__SE",    pattern: "ur", group: "rControlled" },
  { audio: "audio/med-sour.mp3",    word: "sour",    display: "S__",      pattern: "our", group: "rControlled" },
  { audio: "audio/med-hour.mp3",    word: "hour",    display: "H__",      pattern: "our", group: "rControlled" },

  // ---------------- 6. Consonant blends ----------------
  { audio: "audio/med-black.mp3",   word: "black",   display: "__ACK",    pattern: "bl", group: "blend" },
  { audio: "audio/med-block.mp3",   word: "block",   display: "__OCK",    pattern: "bl", group: "blend" },
  { audio: "audio/med-clap.mp3",    word: "clap",    display: "__AP",     pattern: "cl", group: "blend" },
  { audio: "audio/med-class.mp3",   word: "class",   display: "__ASS",    pattern: "cl", group: "blend" },
  { audio: "audio/med-flag.mp3",    word: "flag",    display: "__AG",     pattern: "fl", group: "blend" },
  { audio: "audio/med-flower.mp3",  word: "flower",  display: "__OWER",   pattern: "fl", group: "blend" },
  { audio: "audio/med-glass.mp3",   word: "glass",   display: "__ASS",    pattern: "gl", group: "blend" },
  { audio: "audio/med-glove.mp3",   word: "glove",   display: "__OVE",    pattern: "gl", group: "blend" },
  { audio: "audio/med-plane.mp3",   word: "plane",   display: "__ANE",    pattern: "pl", group: "blend" },
  { audio: "audio/med-please.mp3",  word: "please",  display: "__EASE",   pattern: "pl", group: "blend" },
  { audio: "audio/med-sleep.mp3",   word: "sleep",   display: "__EEP",    pattern: "sl", group: "blend" },
  { audio: "audio/med-slide.mp3",   word: "slide",   display: "__IDE",    pattern: "sl", group: "blend" },
  { audio: "audio/med-brush.mp3",   word: "brush",   display: "__USH",    pattern: "br", group: "blend" },
  { audio: "audio/med-bread.mp3",   word: "bread",   display: "__EAD",    pattern: "br", group: "blend" },
  { audio: "audio/med-crab.mp3",    word: "crab",    display: "__AB",     pattern: "cr", group: "blend" },
  { audio: "audio/med-crown.mp3",   word: "crown",   display: "__OWN",    pattern: "cr", group: "blend" },
  { audio: "audio/med-drum.mp3",    word: "drum",    display: "__UM",     pattern: "dr", group: "blend" },
  { audio: "audio/med-dress.mp3",   word: "dress",   display: "__ESS",    pattern: "dr", group: "blend" },
  { audio: "audio/med-frog.mp3",    word: "frog",    display: "__OG",     pattern: "fr", group: "blend" },
  { audio: "audio/med-friend.mp3",  word: "friend",  display: "__IEND",   pattern: "fr", group: "blend" },
  { audio: "audio/med-grape.mp3",   word: "grape",   display: "__APE",    pattern: "gr", group: "blend" },
  { audio: "audio/med-green.mp3",   word: "green",   display: "__EEN",    pattern: "gr", group: "blend" },
  { audio: "audio/med-present.mp3", word: "present", display: "__ESENT",  pattern: "pr", group: "blend" },
  { audio: "audio/med-princess.mp3",word: "princess",display: "__INCESS", pattern: "pr", group: "blend" },
  { audio: "audio/med-train.mp3",   word: "train",   display: "__AIN",    pattern: "tr", group: "blend" },
  { audio: "audio/med-truck.mp3",   word: "truck",   display: "__UCK",    pattern: "tr", group: "blend" },
  { audio: "audio/med-scarf.mp3",   word: "scarf",   display: "__ARF",    pattern: "sc", group: "blend" },
  { audio: "audio/med-scan.mp3",    word: "scan",    display: "__AN",     pattern: "sc", group: "blend" },
  { audio: "audio/med-skate.mp3",   word: "skate",   display: "__ATE",    pattern: "sk", group: "blend" },
  { audio: "audio/med-mask.mp3",    word: "mask",    display: "MA__",     pattern: "sk", group: "blend" },
  { audio: "audio/med-smile.mp3",   word: "smile",   display: "__ILE",    pattern: "sm", group: "blend" },
  { audio: "audio/med-small.mp3",   word: "small",   display: "__ALL",    pattern: "sm", group: "blend" },
  { audio: "audio/med-snake.mp3",   word: "snake",   display: "__AKE",    pattern: "sn", group: "blend" },
  { audio: "audio/med-sneeze.mp3",  word: "sneeze",  display: "__EEZE",   pattern: "sn", group: "blend" },
  { audio: "audio/med-spider.mp3",  word: "spider",  display: "__IDER",   pattern: "sp", group: "blend" },
  { audio: "audio/med-sport.mp3",   word: "sport",   display: "__ORT",    pattern: "sp", group: "blend" },
  { audio: "audio/med-stop.mp3",    word: "stop",    display: "__OP",     pattern: "st", group: "blend" },
  { audio: "audio/med-story.mp3",   word: "story",   display: "__ORY",    pattern: "st", group: "blend" },
  { audio: "audio/med-swim.mp3",    word: "swim",    display: "__IM",     pattern: "sw", group: "blend" },
  { audio: "audio/med-sweet.mp3",   word: "sweet",   display: "__EET",    pattern: "sw", group: "blend" },
  { audio: "audio/med-spring.mp3",  word: "spring",  display: "___ING",   pattern: "spr", group: "blend" },
  { audio: "audio/med-spray.mp3",   word: "spray",   display: "___AY",    pattern: "spr", group: "blend" },
  { audio: "audio/med-street.mp3",  word: "street",  display: "___EET",   pattern: "str", group: "blend" },
  { audio: "audio/med-string.mp3",  word: "string",  display: "___ING",   pattern: "str", group: "blend" },
  { audio: "audio/med-throw.mp3",   word: "throw",   display: "___OW",    pattern: "thr", group: "blend" },
  { audio: "audio/med-thread.mp3",  word: "thread",  display: "___EAD",   pattern: "thr", group: "blend" }
];

// ---- 3. Distractor picker --------------------------------------------
// Remembers the last distractor used for each individual word so the
// same pairing doesn't repeat two rounds in a row.
const lastDistractorByWord = {};

function pickCrossGroupDistractor(item) {
  const correctText = item.pattern.toLowerCase();

  // Candidates: different category AND not visually the same letters
  // as the correct answer (guards against e.g. "ow" vs "ow" from two
  // different categories looking identical on screen).
  let candidates = ALL_PATTERNS.filter(
    p => p.group !== item.group && p.text.toLowerCase() !== correctText
  );

  // Avoid repeating the exact same distractor this word had last time.
  const previous = lastDistractorByWord[item.word];
  if (previous) {
    const fresh = candidates.filter(p => p.text.toLowerCase() !== previous.toLowerCase());
    if (fresh.length > 0) candidates = fresh;
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  lastDistractorByWord[item.word] = chosen.text;
  return chosen.text;
}

// ---- 4. Build the round's question bank -------------------------------
function buildMediumBank() {
  return MEDIUM_PATTERN_LIBRARY.map(item => {
    const distractor = pickCrossGroupDistractor(item);
    const correct = item.pattern.toUpperCase();
    const wrong = distractor.toUpperCase();
    const options = Math.random() < 0.5 ? [correct, wrong] : [wrong, correct];

    return {
      audio: item.audio,
      correctAnswer: correct,
      options,
      prompt: `What sound is missing?: ${item.display}`
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
