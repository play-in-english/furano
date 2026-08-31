/* ============================================================
   GALAXY ALPHABET QUIZ — QUESTION BANKS
   ============================================================
   Three separate 50-question banks, one per difficulty mode.
   Every game randomly selects 7 questions from whichever bank
   matches the mode the player picked on the Difficulty screen.

   For each question:
     audio          = your audio file
     correctAnswer  = the correct answer (letter, blend, or word)
     options        = the choices students can click

   Replace the audio filenames and answers with your actual
   recordings/content — these are placeholders so the game runs
   end-to-end immediately.
   ============================================================ */

/* ---------- EASY MODE: basic letter-sound recognition ---------- */
const EASY_QUESTION_BANK = [
  { audio: "audio/easy01.mp3", correctAnswer: "A", options: ["A", "H"] },
  { audio: "audio/easy02.mp3", correctAnswer: "B", options: ["B", "D"] },
  { audio: "audio/easy03.mp3", correctAnswer: "C", options: ["C", "G"] },
  { audio: "audio/easy04.mp3", correctAnswer: "D", options: ["D", "B"] },
  { audio: "audio/easy05.mp3", correctAnswer: "E", options: ["E", "T"] },
  { audio: "audio/easy06.mp3", correctAnswer: "F", options: ["F", "H"] },
  { audio: "audio/easy07.mp3", correctAnswer: "G", options: ["G", "C"] },
  { audio: "audio/easy08.mp3", correctAnswer: "H", options: ["H", "F"] },
  { audio: "audio/easy09.mp3", correctAnswer: "I", options: ["I", "E"] },
  { audio: "audio/easy10.mp3", correctAnswer: "J", options: ["J", "G"] },
  { audio: "audio/easy11.mp3", correctAnswer: "K", options: ["K", "Q"] },
  { audio: "audio/easy12.mp3", correctAnswer: "L", options: ["L", "R"] },
  { audio: "audio/easy13.mp3", correctAnswer: "M", options: ["M", "N"] },
  { audio: "audio/easy14.mp3", correctAnswer: "N", options: ["N", "M"] },
  { audio: "audio/easy15.mp3", correctAnswer: "O", options: ["O", "U"] },
  { audio: "audio/easy16.mp3", correctAnswer: "P", options: ["P", "B"] },
  { audio: "audio/easy17.mp3", correctAnswer: "Q", options: ["Q", "K"] },
  { audio: "audio/easy18.mp3", correctAnswer: "R", options: ["R", "L"] },
  { audio: "audio/easy19.mp3", correctAnswer: "S", options: ["S", "X"] },
  { audio: "audio/easy20.mp3", correctAnswer: "T", options: ["T", "E"] },
  { audio: "audio/easy21.mp3", correctAnswer: "U", options: ["U", "O"] },
  { audio: "audio/easy22.mp3", correctAnswer: "V", options: ["V", "B"] },
  { audio: "audio/easy23.mp3", correctAnswer: "W", options: ["W", "M"] },
  { audio: "audio/easy24.mp3", correctAnswer: "X", options: ["X", "S"] },
  { audio: "audio/easy25.mp3", correctAnswer: "Y", options: ["Y", "I"] },
  { audio: "audio/easy26.mp3", correctAnswer: "Z", options: ["Z", "C"] },
  { audio: "audio/easy27.mp3", correctAnswer: "A", options: ["A", "C"] },
  { audio: "audio/easy28.mp3", correctAnswer: "B", options: ["B", "E"] },
  { audio: "audio/easy29.mp3", correctAnswer: "C", options: ["C", "G"] },
  { audio: "audio/easy30.mp3", correctAnswer: "D", options: ["D", "I"] },
  { audio: "audio/easy31.mp3", correctAnswer: "E", options: ["E", "F"] },
  { audio: "audio/easy32.mp3", correctAnswer: "F", options: ["F", "H"] },
  { audio: "audio/easy33.mp3", correctAnswer: "G", options: ["G", "J"] },
  { audio: "audio/easy34.mp3", correctAnswer: "H", options: ["H", "L"] },
  { audio: "audio/easy35.mp3", correctAnswer: "I", options: ["I", "N"] },
  { audio: "audio/easy36.mp3", correctAnswer: "J", options: ["J", "K"] },
  { audio: "audio/easy37.mp3", correctAnswer: "K", options: ["K", "M"] },
  { audio: "audio/easy38.mp3", correctAnswer: "L", options: ["L", "O"] },
  { audio: "audio/easy39.mp3", correctAnswer: "M", options: ["M", "Q"] },
  { audio: "audio/easy40.mp3", correctAnswer: "N", options: ["N", "S"] },
  { audio: "audio/easy41.mp3", correctAnswer: "O", options: ["O", "P"] },
  { audio: "audio/easy42.mp3", correctAnswer: "P", options: ["P", "R"] },
  { audio: "audio/easy43.mp3", correctAnswer: "Q", options: ["Q", "T"] },
  { audio: "audio/easy44.mp3", correctAnswer: "R", options: ["R", "V"] },
  { audio: "audio/easy45.mp3", correctAnswer: "S", options: ["S", "X"] },
  { audio: "audio/easy46.mp3", correctAnswer: "T", options: ["T", "U"] },
  { audio: "audio/easy47.mp3", correctAnswer: "U", options: ["U", "W"] },
  { audio: "audio/easy48.mp3", correctAnswer: "V", options: ["V", "Y"] },
  { audio: "audio/easy49.mp3", correctAnswer: "W", options: ["W", "A"] },
  { audio: "audio/easy50.mp3", correctAnswer: "X", options: ["X", "C"] }
];

/* ---------- MEDIUM MODE: phonics / consonant blends ---------- */
const MEDIUM_BLEND_PAIRS = [
  ["bl", "br"], ["cl", "cr"], ["dr", "tr"], ["fl", "fr"], ["gl", "gr"],
  ["pl", "pr"], ["sc", "sk"], ["sl", "sm"], ["sn", "sp"], ["st", "sw"],
  ["tw", "dw"], ["ch", "sh"], ["th", "wh"], ["ph", "gh"], ["kn", "gn"],
  ["scr", "spr"], ["str", "spl"], ["shr", "thr"], ["squ", "sw"], ["nk", "ng"],
  ["ck", "ch"], ["ft", "pt"], ["mp", "nd"], ["lt", "lk"], ["sk", "sp"]
];
const MEDIUM_QUESTION_BANK = [];
for (let i = 0; i < 50; i++) {
  const pair = MEDIUM_BLEND_PAIRS[i % MEDIUM_BLEND_PAIRS.length];
  MEDIUM_QUESTION_BANK.push({
    audio: "audio/medium" + String(i + 1).padStart(2, "0") + ".mp3",
    correctAnswer: pair[0],
    options: [pair[0], pair[1]]
  });
}

/* ---------- HARD MODE: full words / spelling ---------- */
const HARD_WORD_PAIRS = [
  ["cat", "cap"], ["dog", "dot"], ["sun", "fun"], ["hat", "hot"], ["pen", "pin"],
  ["cup", "cut"], ["bed", "bad"], ["run", "rug"], ["big", "bag"], ["red", "rid"],
  ["fish", "wish"], ["tree", "free"], ["star", "scar"], ["moon", "mood"], ["book", "look"],
  ["frog", "flag"], ["milk", "silk"], ["rock", "lock"], ["desk", "disk"], ["snow", "slow"],
  ["plane", "plate"], ["chair", "share"], ["light", "night"], ["clock", "block"], ["train", "brain"],
  ["smile", "slide"], ["grape", "grade"], ["storm", "swarm"], ["planet", "plated"], ["rocket", "pocket"],
  ["orbit", "order"], ["comet", "closet"], ["galaxy", "gallery"], ["shuttle", "shutter"], ["mission", "musician"],
  ["astronaut", "restaurant"], ["universe", "diverse"], ["telescope", "envelope"], ["gravity", "cavity"], ["meteor", "meter"],
  ["cosmic", "comic"], ["cluster", "cluster"], ["nebula", "neutral"], ["voyage", "village"], ["capsule", "capital"],
  ["spaceship", "sportsman"], ["satellite", "settlement"], ["asteroid", "android"], ["horizon", "hoping"], ["explore", "explode"]
];
const HARD_QUESTION_BANK = HARD_WORD_PAIRS.slice(0, 50).map((pair, i) => ({
  audio: "audio/hard" + String(i + 1).padStart(2, "0") + ".mp3",
  correctAnswer: pair[0],
  options: [pair[0], pair[1]]
}));

/* Lookup used by app.js when starting a round for a chosen mode. */
const QUESTION_BANKS = {
  easy: EASY_QUESTION_BANK,
  medium: MEDIUM_QUESTION_BANK,
  hard: HARD_QUESTION_BANK
};
