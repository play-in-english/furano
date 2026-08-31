/* ============================================================
   S.P.A.C.E. ALPHABETS
   150 QUESTION BANK
   ============================================================

   3 MODES
   ------------------------------------------------------------
   EASY   = 50 questions
   MEDIUM = 50 questions
   HARD   = 50 questions

   Every game randomly selects 7 questions from the
   selected mode.

   ============================================================

   EASY
   ------------------------------------------------------------
   Students hear an alphabet sound and identify the letter.

   MEDIUM
   ------------------------------------------------------------
   Students hear phonics / blends and identify the sound.

   HARD
   ------------------------------------------------------------
   Students hear a complete word and identify the spelling.

   ============================================================ */


/* ============================================================
   EASY MODE
   ============================================================ */

const EASY_QUESTION_BANK = [

  {
    audio: "audio/question01.mp3",
    correctAnswer: "A",
    options: ["A", "H"]
  },

  {
    audio: "audio/question02.mp3",
    correctAnswer: "B",
    options: ["B", "D"]
  },

  {
    audio: "audio/question03.mp3",
    correctAnswer: "C",
    options: ["C", "G"]
  },

  {
    audio: "audio/question04.mp3",
    correctAnswer: "D",
    options: ["D", "B"]
  },

  {
    audio: "audio/question05.mp3",
    correctAnswer: "E",
    options: ["E", "T"]
  },

  {
    audio: "audio/question06.mp3",
    correctAnswer: "F",
    options: ["F", "H"]
  },

  {
    audio: "audio/question07.mp3",
    correctAnswer: "G",
    options: ["G", "C"]
  },

  {
    audio: "audio/question08.mp3",
    correctAnswer: "H",
    options: ["H", "F"]
  },

  {
    audio: "audio/question09.mp3",
    correctAnswer: "I",
    options: ["I", "E"]
  },

  {
    audio: "audio/question10.mp3",
    correctAnswer: "J",
    options: ["J", "G"]
  },

  {
    audio: "audio/question11.mp3",
    correctAnswer: "K",
    options: ["K", "Q"]
  },

  {
    audio: "audio/question12.mp3",
    correctAnswer: "L",
    options: ["L", "R"]
  },

  {
    audio: "audio/question13.mp3",
    correctAnswer: "M",
    options: ["M", "N"]
  },

  {
    audio: "audio/question14.mp3",
    correctAnswer: "N",
    options: ["N", "M"]
  },

  {
    audio: "audio/question15.mp3",
    correctAnswer: "O",
    options: ["O", "U"]
  },

  {
    audio: "audio/question16.mp3",
    correctAnswer: "P",
    options: ["P", "B"]
  },

  {
    audio: "audio/question17.mp3",
    correctAnswer: "Q",
    options: ["Q", "K"]
  },

  {
    audio: "audio/question18.mp3",
    correctAnswer: "R",
    options: ["R", "L"]
  },

  {
    audio: "audio/question19.mp3",
    correctAnswer: "S",
    options: ["S", "X"]
  },

  {
    audio: "audio/question20.mp3",
    correctAnswer: "T",
    options: ["T", "E"]
  },

  {
    audio: "audio/question21.mp3",
    correctAnswer: "U",
    options: ["U", "O"]
  },

  {
    audio: "audio/question22.mp3",
    correctAnswer: "V",
    options: ["V", "B"]
  },

  {
    audio: "audio/question23.mp3",
    correctAnswer: "W",
    options: ["W", "M"]
  },

  {
    audio: "audio/question24.mp3",
    correctAnswer: "X",
    options: ["X", "S"]
  },

  {
    audio: "audio/question25.mp3",
    correctAnswer: "Y",
    options: ["Y", "I"]
  },

  {
    audio: "audio/question26.mp3",
    correctAnswer: "Z",
    options: ["Z", "C"]
  },

  {
    audio: "audio/question27.mp3",
    correctAnswer: "A",
    options: ["A", "C"]
  },

  {
    audio: "audio/question28.mp3",
    correctAnswer: "B",
    options: ["B", "E"]
  },

  {
    audio: "audio/question29.mp3",
    correctAnswer: "C",
    options: ["C", "G"]
  },

  {
    audio: "audio/question30.mp3",
    correctAnswer: "D",
    options: ["D", "I"]
  },

  {
    audio: "audio/question31.mp3",
    correctAnswer: "E",
    options: ["E", "F"]
  },

  {
    audio: "audio/question32.mp3",
    correctAnswer: "F",
    options: ["F", "H"]
  },

  {
    audio: "audio/question33.mp3",
    correctAnswer: "G",
    options: ["G", "J"]
  },

  {
    audio: "audio/question34.mp3",
    correctAnswer: "H",
    options: ["H", "L"]
  },

  {
    audio: "audio/question35.mp3",
    correctAnswer: "I",
    options: ["I", "N"]
  },

  {
    audio: "audio/question36.mp3",
    correctAnswer: "J",
    options: ["J", "K"]
  },

  {
    audio: "audio/question37.mp3",
    correctAnswer: "K",
    options: ["K", "M"]
  },

  {
    audio: "audio/question38.mp3",
    correctAnswer: "L",
    options: ["L", "O"]
  },

  {
    audio: "audio/question39.mp3",
    correctAnswer: "M",
    options: ["M", "Q"]
  },

  {
    audio: "audio/question40.mp3",
    correctAnswer: "N",
    options: ["N", "S"]
  },

  {
    audio: "audio/question41.mp3",
    correctAnswer: "O",
    options: ["O", "P"]
  },

  {
    audio: "audio/question42.mp3",
    correctAnswer: "P",
    options: ["P", "R"]
  },

  {
    audio: "audio/question43.mp3",
    correctAnswer: "Q",
    options: ["Q", "T"]
  },

  {
    audio: "audio/question44.mp3",
    correctAnswer: "R",
    options: ["R", "V"]
  },

  {
    audio: "audio/question45.mp3",
    correctAnswer: "S",
    options: ["S", "X"]
  },

  {
    audio: "audio/question46.mp3",
    correctAnswer: "T",
    options: ["T", "U"]
  },

  {
    audio: "audio/question47.mp3",
    correctAnswer: "U",
    options: ["U", "W"]
  },

  {
    audio: "audio/question48.mp3",
    correctAnswer: "V",
    options: ["V", "Y"]
  },

  {
    audio: "audio/question49.mp3",
    correctAnswer: "W",
    options: ["W", "A"]
  },

  {
    audio: "audio/question50.mp3",
    correctAnswer: "X",
    options: ["X", "C"]
  }

];


/*
   Keep QUESTION_BANK as an alias so that older code,
   if you ever reuse it, won't immediately break.
*/

const QUESTION_BANK =
  EASY_QUESTION_BANK;


/* ============================================================
   MEDIUM MODE
   ============================================================

   IMPORTANT:

   These are example phonics questions.

   Replace the audio files with your actual recordings.

   The audio should say the sound/blend, e.g.:

      "bl"
      "st"
      "tr"
      "sh"
      "ch"

   ============================================================ */

const MEDIUM_QUESTION_BANK = [

  {
    audio: "audio/medium01.mp3",
    correctAnswer: "BL",
    options: ["BL", "BR"]
  },

  {
    audio: "audio/medium02.mp3",
    correctAnswer: "BR",
    options: ["BR", "BL"]
  },

  {
    audio: "audio/medium03.mp3",
    correctAnswer: "CL",
    options: ["CL", "CR"]
  },

  {
    audio: "audio/medium04.mp3",
    correctAnswer: "CR",
    options: ["CR", "CL"]
  },

  {
    audio: "audio/medium05.mp3",
    correctAnswer: "DR",
    options: ["DR", "TR"]
  },

  {
    audio: "audio/medium06.mp3",
    correctAnswer: "FL",
    options: ["FL", "FR"]
  },

  {
    audio: "audio/medium07.mp3",
    correctAnswer: "FR",
    options: ["FR", "FL"]
  },

  {
    audio: "audio/medium08.mp3",
    correctAnswer: "GL",
    options: ["GL", "GR"]
  },

  {
    audio: "audio/medium09.mp3",
    correctAnswer: "GR",
    options: ["GR", "GL"]
  },

  {
    audio: "audio/medium10.mp3",
    correctAnswer: "PL",
    options: ["PL", "PR"]
  },

  {
    audio: "audio/medium11.mp3",
    correctAnswer: "PR",
    options: ["PR", "PL"]
  },

  {
    audio: "audio/medium12.mp3",
    correctAnswer: "SL",
    options: ["SL", "ST"]
  },

  {
    audio: "audio/medium13.mp3",
    correctAnswer: "SM",
    options: ["SM", "SN"]
  },

  {
    audio: "audio/medium14.mp3",
    correctAnswer: "SN",
    options: ["SN", "SM"]
  },

  {
    audio: "audio/medium15.mp3",
    correctAnswer: "SP",
    options: ["SP", "ST"]
  },

  {
    audio: "audio/medium16.mp3",
    correctAnswer: "ST",
    options: ["ST", "SP"]
  },

  {
    audio: "audio/medium17.mp3",
    correctAnswer: "SW",
    options: ["SW", "TW"]
  },

  {
    audio: "audio/medium18.mp3",
    correctAnswer: "TR",
    options: ["TR", "DR"]
  },

  {
    audio: "audio/medium19.mp3",
    correctAnswer: "TW",
    options: ["TW", "SW"]
  },

  {
    audio: "audio/medium20.mp3",
    correctAnswer: "CH",
    options: ["CH", "SH"]
  },

  {
    audio: "audio/medium21.mp3",
    correctAnswer: "SH",
    options: ["SH", "CH"]
  },

  {
    audio: "audio/medium22.mp3",
    correctAnswer: "TH",
    options: ["TH", "PH"]
  },

  {
    audio: "audio/medium23.mp3",
    correctAnswer: "PH",
    options: ["PH", "TH"]
  },

  {
    audio: "audio/medium24.mp3",
    correctAnswer: "WH",
    options: ["WH", "WR"]
  },

  {
    audio: "audio/medium25.mp3",
    correctAnswer: "WR",
    options: ["WR", "WH"]
  },

  {
    audio: "audio/medium26.mp3",
    correctAnswer: "CK",
    options: ["CK", "NG"]
  },

  {
    audio: "audio/medium27.mp3",
    correctAnswer: "NG",
    options: ["NG", "NK"]
  },

  {
    audio: "audio/medium28.mp3",
    correctAnswer: "NK",
    options: ["NK", "NG"]
  },

  {
    audio: "audio/medium29.mp3",
    correctAnswer: "MP",
    options: ["MP", "ND"]
  },

  {
    audio: "audio/medium30.mp3",
    correctAnswer: "ND",
    options: ["ND", "MP"]
  },

  {
    audio: "audio/medium31.mp3",
    correctAnswer: "NT",
    options: ["NT", "ST"]
  },

  {
    audio: "audio/medium32.mp3",
    correctAnswer: "SK",
    options: ["SK", "SL"]
  },

  {
    audio: "audio/medium33.mp3",
    correctAnswer: "SP",
    options: ["SP", "SK"]
  },

  {
    audio: "audio/medium34.mp3",
    correctAnswer: "ST",
    options: ["ST", "SK"]
  },

  {
    audio: "audio/medium35.mp3",
    correctAnswer: "STR",
    options: ["STR", "SPR"]
  },

  {
    audio: "audio/medium36.mp3",
    correctAnswer: "SPR",
    options: ["SPR", "STR"]
  },

  {
    audio: "audio/medium37.mp3",
    correctAnswer: "SCR",
    options: ["SCR", "SPL"]
  },

  {
    audio: "audio/medium38.mp3",
    correctAnswer: "SPL",
    options: ["SPL", "SCR"]
  },

  {
    audio: "audio/medium39.mp3",
    correctAnswer: "SPL",
    options: ["SPL", "SPR"]
  },

  {
    audio: "audio/medium40.mp3",
    correctAnswer: "SPR",
    options: ["SPR", "SPL"]
  },

  {
    audio: "audio/medium41.mp3",
    correctAnswer: "BL",
    options: ["BL", "FL"]
  },

  {
    audio: "audio/medium42.mp3",
    correctAnswer: "FL",
    options: ["FL", "SL"]
  },

  {
    audio: "audio/medium43.mp3",
    correctAnswer: "SL",
    options: ["SL", "CL"]
  },

  {
    audio: "audio/medium44.mp3",
    correctAnswer: "CL",
    options: ["CL", "GL"]
  },

  {
    audio: "audio/medium45.mp3",
    correctAnswer: "GL",
    options: ["GL", "GR"]
  },

  {
    audio: "audio/medium46.mp3",
    correctAnswer: "GR",
    options: ["GR", "DR"]
  },

  {
    audio: "audio/medium47.mp3",
    correctAnswer: "DR",
    options: ["DR", "TR"]
  },

  {
    audio: "audio/medium48.mp3",
    correctAnswer: "TR",
    options: ["TR", "CR"]
  },

  {
    audio: "audio/medium49.mp3",
    correctAnswer: "CR",
    options: ["CR", "BR"]
  },

  {
    audio: "audio/medium50.mp3",
    correctAnswer: "BR",
    options: ["BR", "BL"]
  }

];


/* ============================================================
   HARD MODE
   ============================================================

   Example full-word spelling questions.

   Replace the audio with recordings of the actual words.

   The student hears the word and chooses the spelling.

   ============================================================ */

const HARD_QUESTION_BANK = [

  {
    audio: "audio/hard01.mp3",
    correctAnswer: "CAT",
    options: ["CAT", "KAT"]
  },

  {
    audio: "audio/hard02.mp3",
    correctAnswer: "DOG",
    options: ["DOG", "DOK"]
  },

  {
    audio: "audio/hard03.mp3",
    correctAnswer: "SUN",
    options: ["SUN", "SON"]
  },

  {
    audio: "audio/hard04.mp3",
    correctAnswer: "FISH",
    options: ["FISH", "FICH"]
  },

  {
    audio: "audio/hard05.mp3",
    correctAnswer: "SHIP",
    options: ["SHIP", "SHEP"]
  },

  {
    audio: "audio/hard06.mp3",
    correctAnswer: "TREE",
    options: ["TREE", "TRE"]
  },

  {
    audio: "audio/hard07.mp3",
    correctAnswer: "STAR",
    options: ["STAR", "STARR"]
  },

  {
    audio: "audio/hard08.mp3",
    correctAnswer: "MOON",
    options: ["MOON", "MUN"]
  },

  {
    audio: "audio/hard09.mp3",
    correctAnswer: "BOOK",
    options: ["BOOK", "BUK"]
  },

  {
    audio: "audio/hard10.mp3",
    correctAnswer: "CAKE",
    options: ["CAKE", "CAIK"]
  },

  {
    audio: "audio/hard11.mp3",
    correctAnswer: "BIKE",
    options: ["BIKE", "BIK"]
  },

  {
    audio: "audio/hard12.mp3",
    correctAnswer: "HOME",
    options: ["HOME", "HOM"]
  },

  {
    audio: "audio/hard13.mp3",
    correctAnswer: "FROG",
    options: ["FROG", "FROGG"]
  },

  {
    audio: "audio/hard14.mp3",
    correctAnswer: "BLUE",
    options: ["BLUE", "BLOO"]
  },

  {
    audio: "audio/hard15.mp3",
    correctAnswer: "GREEN",
    options: ["GREEN", "GREAN"]
  },

  {
    audio: "audio/hard16.mp3",
    correctAnswer: "BLACK",
    options: ["BLACK", "BLAC"]
  },

  {
    audio: "audio/hard17.mp3",
    correctAnswer: "WHITE",
    options: ["WHITE", "WHIT"]
  },

  {
    audio: "audio/hard18.mp3",
    correctAnswer: "PINK",
    options: ["PINK", "PINC"]
  },

  {
    audio: "audio/hard19.mp3",
    correctAnswer: "APPLE",
    options: ["APPLE", "APLE"]
  },

  {
    audio: "audio/hard20.mp3",
    correctAnswer: "ORANGE",
    options: ["ORANGE", "ORINGE"]
  },

  {
    audio: "audio/hard21.mp3",
    correctAnswer: "BANANA",
    options: ["BANANA", "BANANNA"]
  },

  {
    audio: "audio/hard22.mp3",
    correctAnswer: "GRAPE",
    options: ["GRAPE", "GRAIP"]
  },

  {
    audio: "audio/hard23.mp3",
    correctAnswer: "LEMON",
    options: ["LEMON", "LEMEN"]
  },

  {
    audio: "audio/hard24.mp3",
    correctAnswer: "MANGO",
    options: ["MANGO", "MANGGO"]
  },

  {
    audio: "audio/hard25.mp3",
    correctAnswer: "PEACH",
    options: ["PEACH", "PEECH"]
  },

  {
    audio: "audio/hard26.mp3",
    correctAnswer: "TABLE",
    options: ["TABLE", "TABL"]
  },

  {
    audio: "audio/hard27.mp3",
    correctAnswer: "CHAIR",
    options: ["CHAIR", "CHARE"]
  },

  {
    audio: "audio/hard28.mp3",
    correctAnswer: "HOUSE",
    options: ["HOUSE", "HOWSE"]
  },

  {
    audio: "audio/hard29.mp3",
    correctAnswer: "SCHOOL",
    options: ["SCHOOL", "SKOOL"]
  },

  {
    audio: "audio/hard30.mp3",
    correctAnswer: "TEACHER",
    options: ["TEACHER", "TEECHER"]
  },

  {
    audio: "audio/hard31.mp3",
    correctAnswer: "FRIEND",
    options: ["FRIEND", "FREND"]
  },

  {
    audio: "audio/hard32.mp3",
    correctAnswer: "FAMILY",
    options: ["FAMILY", "FAMELY"]
  },

  {
    audio: "audio/hard33.mp3",
    correctAnswer: "SUMMER",
    options: ["SUMMER", "SUMER"]
  },

  {
    audio: "audio/hard34.mp3",
    correctAnswer: "WINTER",
    options: ["WINTER", "WINTAR"]
  },

  {
    audio: "audio/hard35.mp3",
    correctAnswer: "SPRING",
    options: ["SPRING", "SPRINGG"]
  },

  {
    audio: "audio/hard36.mp3",
    correctAnswer: "AUTUMN",
    options: ["AUTUMN", "AUTUM"]
  },

  {
    audio: "audio/hard37.mp3",
    correctAnswer: "ROCKET",
    options: ["ROCKET", "ROKET"]
  },

  {
    audio: "audio/hard38.mp3",
    correctAnswer: "PLANET",
    options: ["PLANET", "PLANIT"]
  },

  {
    audio: "audio/hard39.mp3",
    correctAnswer: "GALAXY",
    options: ["GALAXY", "GALAXIE"]
  },

  {
    audio: "audio/hard40.mp3",
    correctAnswer: "COMET",
    options: ["COMET", "KOMET"]
  },

  {
    audio: "audio/hard41.mp3",
    correctAnswer: "SPACE",
    options: ["SPACE", "SPASE"]
  },

  {
    audio: "audio/hard42.mp3",
    correctAnswer: "EARTH",
    options: ["EARTH", "ERTH"]
  },

  {
    audio: "audio/hard43.mp3",
    correctAnswer: "MARS",
    options: ["MARS", "MARZ"]
  },

  {
    audio: "audio/hard44.mp3",
    correctAnswer: "VENUS",
    options: ["VENUS", "VENIS"]
  },

  {
    audio: "audio/hard45.mp3",
    correctAnswer: "JUPITER",
    options: ["JUPITER", "JUPITER"]
  },

  {
    audio: "audio/hard46.mp3",
    correctAnswer: "SATURN",
    options: ["SATURN", "SATREN"]
  },

  {
    audio: "audio/hard47.mp3",
    correctAnswer: "MONSTER",
    options: ["MONSTER", "MONSTAR"]
  },

  {
    audio: "audio/hard48.mp3",
    correctAnswer: "ELEPHANT",
    options: ["ELEPHANT", "ELEFANT"]
  },

  {
    audio: "audio/hard49.mp3",
    correctAnswer: "BUTTERFLY",
    options: ["BUTTERFLY", "BUTERFLY"]
  },

  {
    audio: "audio/hard50.mp3",
    correctAnswer: "RAINBOW",
    options: ["RAINBOW", "RAINBO"]
  }

];
