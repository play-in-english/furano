/* ============================================================
   GALAXY ALPHABET QUIZ — 50 QUESTION BANK
   ============================================================

   You have 50 questions here.
   Every game randomly selects 7 of these 50.

   For each question:
     audio          = your audio file
     correctAnswer  = the correct letter
     options        = the choices students can click

   Example:
     {
       audio: "audio/question01.mp3",
       correctAnswer: "F",
       options: ["F", "H"]
     }

   Replace the audio filenames and answers with your actual questions.
   ============================================================ */

const QUESTION_BANK = [
  // Question 1
  {
    audio: "audio/question01.mp3",
    correctAnswer: "A",
    options: ["A", "H"]
  },
  // Question 2
  {
    audio: "audio/question02.mp3",
    correctAnswer: "B",
    options: ["B", "D"]
  },
  // Question 3
  {
    audio: "audio/question03.mp3",
    correctAnswer: "C",
    options: ["C", "G"]
  },
  // Question 4
  {
    audio: "audio/question04.mp3",
    correctAnswer: "D",
    options: ["D", "B"]
  },
  // Question 5
  {
    audio: "audio/question05.mp3",
    correctAnswer: "E",
    options: ["E", "T"]
  },
  // Question 6
  {
    audio: "audio/question06.mp3",
    correctAnswer: "F",
    options: ["F", "H"]
  },
  // Question 7
  {
    audio: "audio/question07.mp3",
    correctAnswer: "G",
    options: ["G", "C"]
  },
  // Question 8
  {
    audio: "audio/question08.mp3",
    correctAnswer: "H",
    options: ["H", "F"]
  },
  // Question 9
  {
    audio: "audio/question09.mp3",
    correctAnswer: "I",
    options: ["I", "E"]
  },
  // Question 10
  {
    audio: "audio/question10.mp3",
    correctAnswer: "J",
    options: ["J", "G"]
  },
  // Question 11
  {
    audio: "audio/question11.mp3",
    correctAnswer: "K",
    options: ["K", "Q"]
  },
  // Question 12
  {
    audio: "audio/question12.mp3",
    correctAnswer: "L",
    options: ["L", "R"]
  },
  // Question 13
  {
    audio: "audio/question13.mp3",
    correctAnswer: "M",
    options: ["M", "N"]
  },
  // Question 14
  {
    audio: "audio/question14.mp3",
    correctAnswer: "N",
    options: ["N", "M"]
  },
  // Question 15
  {
    audio: "audio/question15.mp3",
    correctAnswer: "O",
    options: ["O", "U"]
  },
  // Question 16
  {
    audio: "audio/question16.mp3",
    correctAnswer: "P",
    options: ["P", "B"]
  },
  // Question 17
  {
    audio: "audio/question17.mp3",
    correctAnswer: "Q",
    options: ["Q", "K"]
  },
  // Question 18
  {
    audio: "audio/question18.mp3",
    correctAnswer: "R",
    options: ["R", "L"]
  },
  // Question 19
  {
    audio: "audio/question19.mp3",
    correctAnswer: "S",
    options: ["S", "X"]
  },
  // Question 20
  {
    audio: "audio/question20.mp3",
    correctAnswer: "T",
    options: ["T", "E"]
  },
  // Question 21
  {
    audio: "audio/question21.mp3",
    correctAnswer: "U",
    options: ["U", "O"]
  },
  // Question 22
  {
    audio: "audio/question22.mp3",
    correctAnswer: "V",
    options: ["V", "B"]
  },
  // Question 23
  {
    audio: "audio/question23.mp3",
    correctAnswer: "W",
    options: ["W", "M"]
  },
  // Question 24
  {
    audio: "audio/question24.mp3",
    correctAnswer: "X",
    options: ["X", "S"]
  },
  // Question 25
  {
    audio: "audio/question25.mp3",
    correctAnswer: "Y",
    options: ["Y", "I"]
  },
  // Question 26
  {
    audio: "audio/question26.mp3",
    correctAnswer: "Z",
    options: ["Z", "C"]
  },
  // Question 27
  {
    audio: "audio/question27.mp3",
    correctAnswer: "A",
    options: ["A", "C"]
  },
  // Question 28
  {
    audio: "audio/question28.mp3",
    correctAnswer: "B",
    options: ["B", "E"]
  },
  // Question 29
  {
    audio: "audio/question29.mp3",
    correctAnswer: "C",
    options: ["C", "G"]
  },
  // Question 30
  {
    audio: "audio/question30.mp3",
    correctAnswer: "D",
    options: ["D", "I"]
  },
  // Question 31
  {
    audio: "audio/question31.mp3",
    correctAnswer: "E",
    options: ["E", "F"]
  },
  // Question 32
  {
    audio: "audio/question32.mp3",
    correctAnswer: "F",
    options: ["F", "H"]
  },
  // Question 33
  {
    audio: "audio/question33.mp3",
    correctAnswer: "G",
    options: ["G", "J"]
  },
  // Question 34
  {
    audio: "audio/question34.mp3",
    correctAnswer: "H",
    options: ["H", "L"]
  },
  // Question 35
  {
    audio: "audio/question35.mp3",
    correctAnswer: "I",
    options: ["I", "N"]
  },
  // Question 36
  {
    audio: "audio/question36.mp3",
    correctAnswer: "J",
    options: ["J", "K"]
  },
  // Question 37
  {
    audio: "audio/question37.mp3",
    correctAnswer: "K",
    options: ["K", "M"]
  },
  // Question 38
  {
    audio: "audio/question38.mp3",
    correctAnswer: "L",
    options: ["L", "O"]
  },
  // Question 39
  {
    audio: "audio/question39.mp3",
    correctAnswer: "M",
    options: ["M", "Q"]
  },
  // Question 40
  {
    audio: "audio/question40.mp3",
    correctAnswer: "N",
    options: ["N", "S"]
  },
  // Question 41
  {
    audio: "audio/question41.mp3",
    correctAnswer: "O",
    options: ["O", "P"]
  },
  // Question 42
  {
    audio: "audio/question42.mp3",
    correctAnswer: "P",
    options: ["P", "R"]
  },
  // Question 43
  {
    audio: "audio/question43.mp3",
    correctAnswer: "Q",
    options: ["Q", "T"]
  },
  // Question 44
  {
    audio: "audio/question44.mp3",
    correctAnswer: "R",
    options: ["R", "V"]
  },
  // Question 45
  {
    audio: "audio/question45.mp3",
    correctAnswer: "S",
    options: ["S", "X"]
  },
  // Question 46
  {
    audio: "audio/question46.mp3",
    correctAnswer: "T",
    options: ["T", "U"]
  },
  // Question 47
  {
    audio: "audio/question47.mp3",
    correctAnswer: "U",
    options: ["U", "W"]
  },
  // Question 48
  {
    audio: "audio/question48.mp3",
    correctAnswer: "V",
    options: ["V", "Y"]
  },
  // Question 49
  {
    audio: "audio/question49.mp3",
    correctAnswer: "W",
    options: ["W", "A"]
  },
  // Question 50
  {
    audio: "audio/question50.mp3",
    correctAnswer: "X",
    options: ["X", "C"]
  }
];
