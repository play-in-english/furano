/* ============================================================
S.P.A.C.E. ALPHABETS — CLEAN GAME LOGIC
=======================================

DAILY FLOW

## FIRST VISIT OF THE DAY

GALAXY CHECK-IN
↓
Enter nickname
↓
CONTINUE
↓
START MISSION PAGE
↓
START MISSION
↓
DIFFICULTY
↓
GAME
↓
RESULTS

## RETURNING VISIT SAME JST DAY

GALAXY CHECK-IN
↓
Welcome back, NICKNAME
↓
CONTINUE
↓
START MISSION PAGE

## NEW JST DAY

Nickname is automatically cleared.
Player sees nickname entry again.

============================================================ */

/* ============================================================
SETTINGS
============================================================ */

const QUESTIONS_PER_GAME = 7;

const STAR_COUNT = 90;

/*
NEW SCORING SYSTEM

Each question is worth a MAXIMUM of 1,000 points:
  700 base points for a correct answer
  + up to 300 points of speed bonus.

With 7 questions per mission, the maximum possible
mission score is 7,000 points.
*/

const MAX_POINTS_PER_QUESTION = 1000;

const BASE_CORRECT_POINTS = 700;

const MAX_SPEED_BONUS = 300;

const SPEED_BONUS_FAST_SECONDS = 2;

const SPEED_BONUS_SLOW_SECONDS = 20;

const MAX_MISSION_POINTS =
QUESTIONS_PER_GAME *
MAX_POINTS_PER_QUESTION;

const BEST_SCORE_KEY =
'galaxyAlphabetQuiz.bestScore.v2';

const NICKNAME_KEY =
'galaxyAlphabetQuiz.nickname.v2';

const LEADERBOARD_KEY_PREFIX =
'galaxyAlphabetQuiz.leaderboard.v2';

const LEADERBOARD_MAX_ROWS = 5;

/* ============================================================
TRANSITION SETTINGS
============================================================ */

const WARP_STAR_COUNT = 220;
const WARP_ACCEL_MS = 1600;
const WARP_HOLD_MS = 250;
const WARP_EXIT_MS = 650;

const QUESTION_WARP_STAR_COUNT = 70;
const QUESTION_WARP_ACCEL_MS = 450;
const QUESTION_EXIT_MS = 320;
const QUESTION_ENTER_MS = 360;

const AUTO_ADVANCE_DELAY_MS = 2000;
const AUTOPLAY_DELAY_MS = 1500; // wait this long after the question renders before the single automatic play

/* ============================================================
QUESTION SCORING (NEW)
============================================================
Each question is scored individually, based on:

  1. Whether the answer is correct.
  2. How quickly the student answered THAT question
     (time from when the question was displayed to when
     the student selected an answer).

A wrong answer always earns 0 points, no matter how fast.

A correct answer earns BASE_CORRECT_POINTS (700) plus a speed
bonus that decreases linearly from MAX_SPEED_BONUS (300, at
SPEED_BONUS_FAST_SECONDS or faster) down to 0 (at
SPEED_BONUS_SLOW_SECONDS or slower):

  <= 2 seconds  → 1,000 points
  3–19 seconds  → progressively decreasing points
  >= 20 seconds → 700 points
============================================================ */

function calcQuestionScore(seconds, isCorrect) {

if (!isCorrect) {
return 0;
}

const clamped =
Math.max(
0,
Number(seconds) || 0
);

if (clamped <= SPEED_BONUS_FAST_SECONDS) {
return MAX_POINTS_PER_QUESTION;
}

if (clamped >= SPEED_BONUS_SLOW_SECONDS) {
return BASE_CORRECT_POINTS;
}

const range =
SPEED_BONUS_SLOW_SECONDS -
SPEED_BONUS_FAST_SECONDS;

const progress =
(clamped - SPEED_BONUS_FAST_SECONDS) /
range;

const speedBonus =
MAX_SPEED_BONUS *
(1 - progress);

return Math.round(
BASE_CORRECT_POINTS +
speedBonus
);
}

/* ============================================================
STAR RATING
============================================================
Based on the percentage of the maximum possible mission score
(MAX_MISSION_POINTS = 7,000 points: 7 questions × 1,000 points).
============================================================ */

function calcStarRating(points) {

if (points <= 0) return 0;

const percent =
points / MAX_MISSION_POINTS;

if (percent >= 0.9) return 5;
if (percent >= 0.75) return 4;
if (percent >= 0.6) return 3;
if (percent >= 0.4) return 2;

return 1; // any points above 0 but below 40%

}

/* ============================================================
JST
============================================================ */

const JST_OFFSET_MS =
9 * 60 * 60 * 1000;

function getJstDateKey(date = new Date()) {

const jst =
new Date(
date.getTime() +
JST_OFFSET_MS
);

const year =
jst.getUTCFullYear();

const month =
String(
jst.getUTCMonth() + 1
).padStart(2, '0');

const day =
String(
jst.getUTCDate()
).padStart(2, '0');

return `${year}-${month}-${day}`;
}

function msUntilNextJstMidnight() {

const now =
new Date();

const jst =
new Date(
now.getTime() +
JST_OFFSET_MS
);

const tomorrow =
new Date(
Date.UTC(
jst.getUTCFullYear(),
jst.getUTCMonth(),
jst.getUTCDate() + 1,
0,
0,
0
)
);

return (
tomorrow.getTime() -
jst.getTime()
);
}

/* ============================================================
MODE LABELS
============================================================ */

const MODE_LABELS = {
easy: 'EASY',
medium: 'MEDIUM',
hard: 'HARD'
};

/* ============================================================
STATE
============================================================ */

const state = {

nickname: '',

mode: 'easy',

roundQuestions: [],

currentIndex: 0,

score: 0,

correctCount: 0,

results: [],

answeredCurrent: false,

transitioning: false,

startTime: null,

elapsedSeconds: null,

questionStartTime: null,

autoAdvanceTimeoutId: null,

autoplayTimeoutId: null

};

/* ============================================================
DOM
============================================================ */

const screens = {

nickname:
document.getElementById('nicknameScreen'),

checkin:
document.getElementById('checkinScreen'),

start:
document.getElementById('startScreen'),

difficulty:
document.getElementById('difficultyScreen'),

game:
document.getElementById('gameScreen'),

results:
document.getElementById('resultsScreen')

};

const nicknameForm =
document.getElementById(
'nicknameForm'
);

const nicknameInput =
document.getElementById(
'nicknameInput'
);

const nicknameSubmitBtn =
document.getElementById(
'nicknameSubmitBtn'
);

const welcomeBackEl =
document.getElementById(
'welcomeBack'
);

const startWelcomeEl =
document.getElementById(
'startWelcome'
);

const checkinBtn =
document.getElementById(
'checkinBtn'
);

const shareBtn =
document.getElementById(
'shareBtn'
);

const startBtn =
document.getElementById(
'startBtn'
);

const difficultyButtons =
document.querySelectorAll(
'.difficulty-btn'
);

const playAudioBtn =
document.getElementById(
'playAudioBtn'
);

const letterAudio =
document.getElementById(
'letterAudio'
);

const optionsGrid =
document.getElementById(
'optionsGrid'
);

const feedbackEl =
document.getElementById(
'feedback'
);

const nextBtn =
document.getElementById(
'nextBtn'
);

const questionCounter =
document.getElementById(
'questionCounter'
);

const scoreCounter =
document.getElementById(
'scoreCounter'
);

const modePill =
document.getElementById(
'modePill'
);

const timerPill =
document.getElementById(
'timerPill'
);

const blackholeBtn =
document.getElementById(
'blackholeBtn'
);

const constellationEl =
document.getElementById(
'constellation'
);

const resultsScore =
document.getElementById(
'resultsScore'
);

const resultsMsg =
document.getElementById(
'resultsMsg'
);

const resultsStars =
document.getElementById(
'resultsStars'
);

const resultsBest =
document.getElementById(
'resultsBest'
);

const championCountdownEl =
document.getElementById(
'championCountdown'
);

const leaderboardTitleEl =
document.getElementById(
'leaderboardTitle'
);

const leaderboardListEl =
document.getElementById(
'leaderboardList'
);

const playAgainBtn =
document.getElementById(
'playAgainBtn'
);

const starField =
document.getElementById(
'starField'
);

const ambientLayer =
document.getElementById(
'ambientLayer'
);

const warpCanvas =
document.getElementById(
'warpCanvas'
);

const galaxyFlash =
document.getElementById(
'galaxyFlash'
);

const appShell =
document.getElementById(
'appShell'
);

const questionContent =
document.getElementById(
'questionContent'
);

const resultsContent =
document.getElementById(
'resultsContent'
);

const startContent =
document.getElementById(
'startContent'
);

// NEW: reference to the existing "Which letter did you hear?"
// paragraph inside the game screen, found by its existing class
// (no HTML changes needed). Used so Medium/Hard questions can show
// their own prompt (e.g. a masked word) — see renderQuestion().
const promptEl =
document.querySelector(
'#gameScreen .prompt'
);

console.log(
'S.P.A.C.E. ALPHABETS: app.js loaded.'
);

/* ============================================================
SAFE STORAGE
============================================================ */

function storageGet(key) {

try {
return localStorage.getItem(key);
} catch (error) {
return null;
}

}

function storageSet(key, value) {

try {
localStorage.setItem(
key,
value
);
} catch (error) {
/* Ignore storage failure */
}

}

function storageRemove(key) {

try {
localStorage.removeItem(key);
} catch (error) {
/* Ignore */
}

}

/* ============================================================
NICKNAME
============================================================ */

function sanitizeNickname(raw) {

return String(raw || '')
.trim()
.toUpperCase()
.slice(0, 12);
}

function saveNickname(nickname) {

storageSet(
NICKNAME_KEY,
JSON.stringify({


  nickname: nickname,

  dateKey:
    getJstDateKey()

})


);

}

function loadNickname() {

const raw =
storageGet(
NICKNAME_KEY
);

if (!raw) {
return null;
}

try {


const data =
  JSON.parse(raw);


if (
  !data ||
  typeof data.nickname !== 'string' ||
  !data.nickname.trim()
) {
  return null;
}


/*
  IMPORTANT:

  The nickname is valid ONLY for
  today's JST date.
*/

if (
  data.dateKey !==
  getJstDateKey()
) {

  storageRemove(
    NICKNAME_KEY
  );

  return null;
}


return sanitizeNickname(
  data.nickname
);


} catch (error) {


storageRemove(
  NICKNAME_KEY
);

return null;


}

}

/* ============================================================
SCREEN NAVIGATION
============================================================ */

function showScreen(name) {

Object.values(
screens
).forEach(
screen => {


  if (!screen) {
    return;
  }

  screen.classList.remove(
    'active'
  );

}


);

const target =
screens[name];

if (target) {


target.classList.add(
  'active'
);


}

}

/* ============================================================
DAILY HOMEPAGE
============================================================ */

function showDailyHomepage() {

const nickname =
loadNickname();

/*
FIRST VISIT OF THE DAY


No nickname exists.


*/

if (!nickname) {


state.nickname = '';

nicknameInput.value = '';

nicknameSubmitBtn.disabled = true;

showScreen('nickname');

setTimeout(
  () => {
    nicknameInput.focus();
  },
  50
);

return;


}

/*
RETURNING PLAYER


Nickname already exists today.


*/

state.nickname =
nickname;

welcomeBackEl.textContent =
`Welcome back, ${nickname}!`;

startWelcomeEl.textContent =
`Are you ready, ${nickname}?`;

showScreen('checkin');

}

/* ============================================================
NICKNAME SUBMISSION
============================================================ */

function submitNickname(event) {

if (event) {
event.preventDefault();
}

const nickname =
sanitizeNickname(
nicknameInput.value
);

if (!nickname) {


nicknameInput.focus();

return;


}

/*
Save nickname immediately.
*/

state.nickname =
nickname;

saveNickname(
nickname
);

/*
Update the START MISSION page.
*/

startWelcomeEl.textContent =
`Are you ready, ${nickname}?`;

/*
FIRST LOGIN:


NICKNAME
   ↓
START MISSION PAGE


*/

showScreen('start');

}

/* ============================================================
NICKNAME INPUT
============================================================ */

nicknameInput.addEventListener(
'input',
() => {


const nickname =
  sanitizeNickname(
    nicknameInput.value
  );

nicknameSubmitBtn.disabled =
  nickname.length === 0;


}
);

nicknameForm.addEventListener(
'submit',
submitNickname
);

nicknameInput.addEventListener(
'keydown',
event => {


if (
  event.key === 'Enter'
) {

  event.preventDefault();

  submitNickname();

}


}
);

/* ============================================================
RETURNING PLAYER CONTINUE
============================================================ */

checkinBtn.addEventListener(
'click',
() => {


/*
  Re-check localStorage.

  This is important because the
  player may leave the page open
  across JST midnight.
*/

const nickname =
  loadNickname();


/*
  If the date has changed,
  nickname is no longer valid.
*/

if (!nickname) {

  state.nickname = '';

  nicknameInput.value = '';

  nicknameSubmitBtn.disabled = true;

  showScreen('nickname');

  nicknameInput.focus();

  return;
}


state.nickname =
  nickname;


startWelcomeEl.textContent =
  `Are you ready, ${nickname}?`;


/*
  RETURNING PLAYER:

  CHECK-IN
     ↓
  START MISSION PAGE
*/

showScreen('start');


}
);

/* ============================================================
START MISSION → DIFFICULTY
============================================================ */

startBtn.addEventListener(
'click',
() => {


if (
  state.transitioning
) {
  return;
}


/*
  Make absolutely sure a valid
  nickname still exists.
*/

const nickname =
  loadNickname();


if (!nickname) {

  showDailyHomepage();

  return;
}


state.nickname =
  nickname;


state.transitioning =
  false;


showScreen(
  'difficulty'
);


}
);

/* ============================================================
SHUFFLE
============================================================ */

function shuffle(array) {

const result =
array.slice();

for (
let i = result.length - 1;
i > 0;
i--
) {


const j =
  Math.floor(
    Math.random() *
    (i + 1)
  );


[
  result[i],
  result[j]
] = [
  result[j],
  result[i]
];


}

return result;

}

/* ============================================================
QUESTION SELECTION
============================================================ */

function pickRoundQuestions() {

/*
questions.js must contain:


  QUESTION_BANKS.easy
  QUESTION_BANKS.medium
  QUESTION_BANKS.hard


*/

if (
typeof QUESTION_BANKS ===
'undefined'
) {


console.error(
  'QUESTION_BANKS is missing. Check questions.js.'
);

return [];


}

const bank =
QUESTION_BANKS[state.mode] ||
QUESTION_BANKS.easy ||
[];

return shuffle(
bank
).slice(
0,
QUESTIONS_PER_GAME
);

}

/* ============================================================
DIFFICULTY
============================================================ */

function setDifficultyButtonsDisabled(
disabled
) {

difficultyButtons.forEach(
button => {
button.disabled =
disabled;
}
);

}

difficultyButtons.forEach(
button => {


button.addEventListener(
  'click',
  () => {

    if (
      state.transitioning
    ) {
      return;
    }


    state.mode =
      button.dataset.mode ||
      'easy';


    beginGalaxyEntrance();

  }
);


}
);

/* ============================================================
TIMER
============================================================ */

let gameTimerIntervalId =
null;

function formatTime(seconds) {

const total =
Math.max(
0,
Math.round(
Number(seconds) || 0
)
);

const minutes =
Math.floor(
total / 60
);

const secondsPart =
total % 60;

return (
`${minutes}:` +
String(
secondsPart
).padStart(2, '0')
);

}

function startRoundTimer() {

stopGameTimer();

state.startTime =
performance.now();

state.elapsedSeconds =
null;

updateTimerDisplay();

gameTimerIntervalId =
setInterval(
updateTimerDisplay,
250
);

}

function stopGameTimer() {

if (
gameTimerIntervalId !== null
) {


clearInterval(
  gameTimerIntervalId
);

gameTimerIntervalId =
  null;


}

}

function updateTimerDisplay() {

if (
!timerPill ||
state.startTime === null
) {
return;
}

const seconds =
state.elapsedSeconds !== null
? state.elapsedSeconds
:
(
performance.now() -
state.startTime
) / 1000;

timerPill.textContent =
`⏱ ${formatTime(seconds)}`;

}

/* ============================================================
WARP CANVAS
============================================================ */

let warpCtx = null;
let warpStars = [];
let warpMaxRadius = 0;
let warpRAF = null;
let warpAnimStart = 0;
let warpAccelMsActive =
WARP_ACCEL_MS;

function setupWarpCanvas() {

if (
!warpCanvas ||
!warpCanvas.getContext
) {
return;
}

warpCtx =
warpCanvas.getContext('2d');

resizeWarpCanvas();

window.addEventListener(
'resize',
resizeWarpCanvas
);

}

function resizeWarpCanvas() {

if (!warpCtx) {
return;
}

const dpr =
window.devicePixelRatio || 1;

const width =
window.innerWidth;

const height =
window.innerHeight;

warpCanvas.width =
width * dpr;

warpCanvas.height =
height * dpr;

warpCanvas.style.width =
`${width}px`;

warpCanvas.style.height =
`${height}px`;

warpCtx.setTransform(
dpr,
0,
0,
dpr,
0,
0
);

}

function makeWarpStar(
nearCenter = false
) {

const roll =
Math.random();

return {


angle:
  Math.random() *
  Math.PI *
  2,

r:
  nearCenter
    ? Math.random() * 24
    :
      Math.random() *
      warpMaxRadius *
      0.5,

spd:
  0.6 +
  Math.random() * 1.4,

hue:
  roll < 0.14
    ? 'gold'
    :
      roll < 0.26
        ? 'teal'
        : 'white'


};

}

function initWarpStars(count) {

warpMaxRadius =
Math.hypot(
window.innerWidth,
window.innerHeight
) / 2 * 1.05;

warpStars = [];

for (
let i = 0;
i < count;
i++
) {


warpStars.push(
  makeWarpStar(false)
);


}

}

function warpFrame(now) {

if (!warpCtx) {
return;
}

const elapsed =
now -
warpAnimStart;

const progress =
Math.min(
elapsed /
warpAccelMsActive,
1
);

const eased =
progress *
progress;

const speedFactor =
0.35 +
eased * 5.5;

const width =
window.innerWidth;

const height =
window.innerHeight;

const centerX =
width / 2;

const centerY =
height / 2;

warpCtx.fillStyle =
'rgba(6, 8, 24, 0.28)';

warpCtx.fillRect(
0,
0,
width,
height
);

warpStars.forEach(
(star, index) => {


  const delta =
    speedFactor *
    star.spd *
    (
      2 +
      star.r * 0.045
    );


  star.r += delta;


  if (
    star.r >
    warpMaxRadius
  ) {

    warpStars[index] =
      makeWarpStar(true);

    return;

  }


  const ratio =
    star.r /
    warpMaxRadius;


  const x =
    centerX +
    Math.cos(
      star.angle
    ) *
    star.r;


  const y =
    centerY +
    Math.sin(
      star.angle
    ) *
    star.r;


  const size =
    0.6 +
    ratio * 3.6;


  const alpha =
    Math.min(
      1,
      0.2 +
      ratio * 1.1
    );


  let color;


  if (
    star.hue === 'gold'
  ) {

    color =
      `rgba(255,217,102,${alpha})`;

  } else if (
    star.hue === 'teal'
  ) {

    color =
      `rgba(79,227,193,${alpha})`;

  } else {

    color =
      `rgba(255,255,255,${alpha})`;

  }


  warpCtx.beginPath();

  warpCtx.fillStyle =
    color;

  warpCtx.arc(
    x,
    y,
    size,
    0,
    Math.PI * 2
  );

  warpCtx.fill();

}


);

warpRAF =
requestAnimationFrame(
warpFrame
);

}

function stopWarpAnimation() {

if (
warpRAF !== null
) {


cancelAnimationFrame(
  warpRAF
);


}

warpRAF = null;

if (warpCtx) {


warpCtx.clearRect(
  0,
  0,
  warpCanvas.width,
  warpCanvas.height
);


}

}

/* ============================================================
GALAXY ENTRANCE
============================================================ */

function beginGalaxyEntrance() {

if (
state.transitioning
) {
return;
}

state.transitioning =
true;

setDifficultyButtonsDisabled(
true
);

/*
TIMER STARTS WHEN THE
MISSION ACTUALLY BEGINS.
*/

startRoundTimer();

/*
If animation isn't available,
simply start the game.
*/

if (
!warpCtx
) {


startGame();

state.transitioning =
  false;

setDifficultyButtonsDisabled(
  false
);

return;


}

if (
window.matchMedia(
'(prefers-reduced-motion: reduce)'
).matches
) {


startGame();

state.transitioning =
  false;

setDifficultyButtonsDisabled(
  false
);

return;


}

appShell.classList.add(
'transition-hide'
);

document.body.classList.add(
'warping'
);

warpAccelMsActive =
WARP_ACCEL_MS;

initWarpStars(
WARP_STAR_COUNT
);

warpAnimStart =
performance.now();

warpCanvas.classList.add(
'active'
);

stopWarpAnimation();

warpRAF =
requestAnimationFrame(
warpFrame
);

setTimeout(
() => {


  if (!galaxyFlash) {
    return;
  }

  galaxyFlash.classList.remove(
    'flash'
  );

  void galaxyFlash.offsetWidth;

  galaxyFlash.classList.add(
    'flash'
  );

},
WARP_ACCEL_MS


);

setTimeout(
() => {


  startGame();

},
WARP_ACCEL_MS +
WARP_HOLD_MS


);

setTimeout(
() => {


  appShell.classList.remove(
    'transition-hide'
  );

  warpCanvas.classList.remove(
    'active'
  );

  document.body.classList.remove(
    'warping'
  );

},
WARP_ACCEL_MS +
WARP_HOLD_MS +
120


);

setTimeout(
() => {


  stopWarpAnimation();

  state.transitioning =
    false;

  setDifficultyButtonsDisabled(
    false
  );

},
WARP_ACCEL_MS +
WARP_HOLD_MS +
120 +
WARP_EXIT_MS


);

}

/* ============================================================
START GAME
============================================================ */

function startGame() {

clearAutoAdvanceTimer();
clearAutoplayTimer();

state.roundQuestions =
pickRoundQuestions();

if (
state.roundQuestions.length === 0
) {


console.error(
  'No questions available for this mode.'
);

stopGameTimer();

showScreen('difficulty');

return;


}

state.currentIndex = 0;

state.score = 0;

state.correctCount = 0;

state.results = [];

state.answeredCurrent = false;

modePill.textContent =
MODE_LABELS[state.mode] ||
'EASY';

showScreen('game');

renderQuestion();

}

/* ============================================================
QUESTION TRANSITION
============================================================ */

function playQuestionWarpBurst(
visibleMs
) {

if (!warpCtx) {
return;
}

document.body.classList.add(
'warping'
);

warpAccelMsActive =
QUESTION_WARP_ACCEL_MS;

initWarpStars(
QUESTION_WARP_STAR_COUNT
);

warpAnimStart =
performance.now();

stopWarpAnimation();

warpCanvas.classList.add(
'active'
);

warpRAF =
requestAnimationFrame(
warpFrame
);

setTimeout(
() => {


  warpCanvas.classList.remove(
    'active'
  );

  document.body.classList.remove(
    'warping'
  );

},
visibleMs


);

setTimeout(
() => {


  stopWarpAnimation();

},
visibleMs + 650


);

}

function playGalaxyZoomTransition(
exitEl,
enterEl,
onSwap,
exitClass = 'q-exit'
) {

const reducedMotion =
window.matchMedia(
'(prefers-reduced-motion: reduce)'
).matches;

if (reducedMotion) {


onSwap();

return;


}

playQuestionWarpBurst(
QUESTION_EXIT_MS +
QUESTION_ENTER_MS -
60
);

if (exitEl) {


exitEl.classList.remove(
  'q-enter',
  'q-exit',
  'q-suck'
);


exitEl.classList.add(
  exitClass
);


}

setTimeout(
() => {


  onSwap();


  if (
    exitEl &&
    exitEl !== enterEl
  ) {

    exitEl.classList.remove(
      exitClass
    );

  }


  if (enterEl) {

    enterEl.classList.remove(
      'q-exit',
      'q-suck',
      'q-enter'
    );


    enterEl.classList.add(
      'q-enter'
    );


    void enterEl.offsetWidth;


    requestAnimationFrame(
      () => {

        enterEl.classList.remove(
          'q-enter'
        );

      }
    );

  }

},
QUESTION_EXIT_MS


);

}

/* ============================================================
QUESTION TIMERS
============================================================ */

function clearAutoAdvanceTimer() {

if (
state.autoAdvanceTimeoutId !== null
) {


clearTimeout(
  state.autoAdvanceTimeoutId
);

state.autoAdvanceTimeoutId =
  null;


}

}

function clearAutoplayTimer() {

if (
state.autoplayTimeoutId !== null
) {


clearTimeout(
  state.autoplayTimeoutId
);

state.autoplayTimeoutId =
  null;


}

}

/* ============================================================
CONSTELLATION
============================================================ */

function renderConstellation() {

if (!constellationEl) {
return;
}

const total =
state.roundQuestions.length;

if (total === 0) {
return;
}

const width = 600;
const height = 54;
const padding = 30;

const step =
total > 1
?
(
width -
padding * 2
) /
(total - 1)
:
0;

const y =
height / 2;

let path =
`M ${padding} ${y}`;

let nodes = '';

for (
let i = 0;
i < total;
i++
) {


const x =
  padding +
  step * i;


if (i > 0) {

  path +=
    ` L ${x} ${y}`;

}


let cls =
  'constellation-node';


if (
  i < state.results.length
) {

  cls +=
    state.results[i]
      ? ' done'
      : ' wrong-node';

} else if (
  i === state.currentIndex
) {

  cls += ' current';

}


const radius =
  i === state.currentIndex &&
  i >= state.results.length
    ? 8
    : 6;


nodes +=
  `<circle class="${cls}" cx="${x}" cy="${y}" r="${radius}"></circle>`;


}

constellationEl.innerHTML = `


<svg
  viewBox="0 0 ${width} ${height}"
  preserveAspectRatio="xMidYMid meet"
>

  <path
    class="constellation-line"
    d="${path}"
  ></path>

  ${nodes}

</svg>

<div
  class="rocket"
  id="rocketIcon"
  aria-hidden="true"
>
  🚀
</div>


`;

const rocket =
document.getElementById(
'rocketIcon'
);

const progressIndex =
Math.min(
state.currentIndex,
total - 1
);

const xPercent =
total > 1
?
(
(
padding +
step *
progressIndex
) /
width
) *
100
:
50;

if (rocket) {


rocket.style.left =
  `${xPercent}%`;


}

}

/* ============================================================
RENDER QUESTION
============================================================ */

function renderQuestion() {

clearAutoAdvanceTimer();
clearAutoplayTimer();

state.answeredCurrent =
false;

const q =
state.roundQuestions[
state.currentIndex
];

if (!q) {


showResults();

return;


}

const total =
state.roundQuestions.length;

questionCounter.textContent =
`Question ${state.currentIndex + 1} / ${total}`;

scoreCounter.textContent =
`Score: ${state.score} / ${MAX_MISSION_POINTS}`;

renderConstellation();

// NEW: show this question's own prompt text (e.g. a masked word
// for Medium mode) if it provides one, otherwise fall back to the
// original default wording — Easy mode is unaffected either way.
if (promptEl) {

promptEl.textContent =
  q.prompt ||
  'Which letter did you hear?';

}

/*
AUDIO


questions.js should provide:

  audio: "audio/example.mp3"


*/

letterAudio.pause();

letterAudio.currentTime = 0;

letterAudio.src =
q.audio || '';

letterAudio.onended = null;

playAudioBtn.classList.remove(
'playing'
);

feedbackEl.textContent = '';

feedbackEl.className =
'feedback';

nextBtn.style.display =
'none';

optionsGrid.innerHTML = '';

const options =
Array.isArray(q.options)
? q.options
: [];

shuffle(options).forEach(
option => {


  const button =
    document.createElement(
      'button'
    );


  button.type =
    'button';

  button.className =
    'option-btn';

  button.textContent =
    option;


  button.setAttribute(
    'aria-label',
    `Answer ${option}`
  );


  button.addEventListener(
    'click',
    () => {

      handleAnswer(
        option,
        button,
        q.correctAnswer
      );

    }
  );


  optionsGrid.appendChild(
    button
  );

}


);

/*
  The per-question SCORING timer starts now, the
  moment this question (and its answer options) is
  actually displayed to the student. It stops the
  instant an answer is selected — see handleAnswer().
*/

state.questionStartTime =
performance.now();

startAutoplaySequence();

}

/* ============================================================
AUDIO
============================================================ */

function playCurrentAudio() {

if (
!letterAudio.src
) {
console.warn(
'No audio file assigned to this question.'
);


return;


}

letterAudio.currentTime = 0;

playAudioBtn.classList.add(
'playing'
);

const promise =
letterAudio.play();

if (
promise &&
typeof promise.catch === 'function'
) {


promise.catch(
  error => {

    console.warn(
      'Audio could not play:',
      error
    );

    playAudioBtn.classList.remove(
      'playing'
    );

  }
);


}

letterAudio.onended =
() => {


  playAudioBtn.classList.remove(
    'playing'
  );

};


}

function startAutoplaySequence() {

if (
state.answeredCurrent
) {
return;
}

/*
  Plays automatically ONCE, AUTOPLAY_DELAY_MS after the question
  appears — giving the transition a moment to settle before the
  sound starts. After that, the student can replay it at their own
  pace with the "Play Sound" button.
*/

state.autoplayTimeoutId =
setTimeout(
() => {


  if (
    state.answeredCurrent
  ) {
    return;
  }


  playCurrentAudio();

},
AUTOPLAY_DELAY_MS
);

}

playAudioBtn.addEventListener(
'click',
() => {


clearAutoplayTimer();

playCurrentAudio();


}
);

/* ============================================================
ANSWER
============================================================ */

function handleAnswer(
selected,
clickedButton,
correct
) {

if (
state.answeredCurrent
) {
return;
}

state.answeredCurrent =
true;

clearAutoplayTimer();

const multipleCorrect =
Array.isArray(correct);

const isCorrect =
multipleCorrect
?
correct.includes(selected)
:
selected === correct;

state.results[
state.currentIndex
] =
isCorrect;

const buttons =
optionsGrid.querySelectorAll(
'.option-btn'
);

buttons.forEach(
button => {


  button.disabled =
    true;


  const buttonIsCorrect =
    multipleCorrect
      ?
        correct.includes(
          button.textContent
        )
      :
        button.textContent ===
        correct;


  if (
    buttonIsCorrect
  ) {

    button.classList.add(
      'correct'
    );

  } else if (
    button === clickedButton
  ) {

    button.classList.add(
      'incorrect'
    );

  } else {

    button.classList.add(
      'dimmed'
    );

  }

}


);

/*
  QUESTION RESPONSE TIME:

  Time from when the question was displayed
  (state.questionStartTime, set in renderQuestion())
  to right now, when the answer was selected. This is
  independent of the overall mission timer.
*/

const questionResponseSeconds =
state.questionStartTime !== null
? (
    performance.now() -
    state.questionStartTime
  ) / 1000
: 0;

const pointsEarned =
calcQuestionScore(
questionResponseSeconds,
isCorrect
);

if (isCorrect) {


state.correctCount++;

state.score += pointsEarned;


feedbackEl.textContent =
  `✓ Correct! +${pointsEarned} pts`;

feedbackEl.classList.add(
  'correct-text'
);


} else {


const answer =
  multipleCorrect
    ? correct.join(' / ')
    : correct;


feedbackEl.textContent =
  `✗ Try again! It was "${answer}".`;

feedbackEl.classList.add(
  'incorrect-text'
);


}

feedbackEl.classList.add(
'show'
);

scoreCounter.textContent =
`Score: ${state.score} / ${MAX_MISSION_POINTS}`;

renderConstellation();

const isLast =
state.currentIndex + 1 >=
state.roundQuestions.length;

/*
Stop the timer immediately
after the final answer.
*/

if (
isLast &&
state.startTime !== null
) {


state.elapsedSeconds =
  (
    performance.now() -
    state.startTime
  ) / 1000;


stopGameTimer();

updateTimerDisplay();


}

nextBtn.textContent =
isLast
? 'See Results →'
: 'Next →';

nextBtn.style.display =
'inline-block';

clearAutoAdvanceTimer();

state.autoAdvanceTimeoutId =
setTimeout(
advanceFromCurrentQuestion,
AUTO_ADVANCE_DELAY_MS
);

}

/* ============================================================
ADVANCE
============================================================ */

function advanceFromCurrentQuestion() {

if (
state.transitioning
) {
return;
}

if (
!state.answeredCurrent
) {
return;
}

clearAutoAdvanceTimer();

state.transitioning =
true;

nextBtn.disabled =
true;

const isLast =
state.currentIndex + 1 >=
state.roundQuestions.length;

playGalaxyZoomTransition(
questionContent,
isLast
? resultsContent
: questionContent,
() => {


  if (isLast) {

    showResults();

  } else {

    state.currentIndex++;

    renderQuestion();

  }

}


);

setTimeout(
() => {


  state.transitioning =
    false;

  nextBtn.disabled =
    false;

},
QUESTION_EXIT_MS +
QUESTION_ENTER_MS +
60


);

}

nextBtn.addEventListener(
'click',
advanceFromCurrentQuestion
);

/* ============================================================
BEST SCORE
============================================================ */

function loadBestScore() {

const raw =
storageGet(
BEST_SCORE_KEY
);

if (!raw) {
return null;
}

try {


const data =
  JSON.parse(raw);


if (
  !data ||
  typeof data.points !== 'number'
) {
  return null;
}


if (
  data.dateKey !==
  getJstDateKey()
) {
  return null;
}


return data;


} catch (error) {


return null;


}

}

function saveBestScore(
points,
correctAnswers,
timeSeconds
) {

storageSet(
BEST_SCORE_KEY,
JSON.stringify({


  points: points,

  correctAnswers:
    correctAnswers,

  timeSeconds:
    timeSeconds,

  dateKey:
    getJstDateKey(),

  savedAt:
    Date.now()

})


);

}

/* ============================================================
LEADERBOARD
============================================================ */

function leaderboardKey(mode) {

return (
LEADERBOARD_KEY_PREFIX +
mode
);

}

function loadLeaderboard(mode) {

const raw =
storageGet(
leaderboardKey(mode)
);

if (!raw) {


return {

  dateKey:
    getJstDateKey(),

  entries: []

};


}

try {


const data =
  JSON.parse(raw);


if (
  data.dateKey !==
  getJstDateKey()
) {

  return {

    dateKey:
      getJstDateKey(),

    entries: []

  };

}


return {

  dateKey:
    getJstDateKey(),

  entries:
    Array.isArray(
      data.entries
    )
      ? data.entries
      : []

};


} catch (error) {


return {

  dateKey:
    getJstDateKey(),

  entries: []

};


}

}

function saveLeaderboard(
mode,
board
) {

storageSet(
leaderboardKey(mode),
JSON.stringify(board)
);

}

function recordLeaderboardResult(
mode,
nickname,
score,
timeSeconds
) {

const board =
loadLeaderboard(mode);

const candidate = {


nickname,

score,

timeSeconds


};

const existingIndex =
board.entries.findIndex(
entry =>
entry.nickname ===
nickname
);

if (
existingIndex === -1
) {


board.entries.push(
  candidate
);


} else {


const existing =
  board.entries[
    existingIndex
  ];


const better =
  score >
    existing.score ||
  (
    score ===
      existing.score &&
    timeSeconds <
      existing.timeSeconds
  );


if (better) {

  board.entries[
    existingIndex
  ] =
    candidate;

}


}

saveLeaderboard(
mode,
board
);

return board;

}

function sortedLeaderboardEntries(
board
) {

return board.entries
.slice()
.sort(
(a, b) => {


    if (
      b.score !==
      a.score
    ) {

      return (
        b.score -
        a.score
      );

    }


    return (
      a.timeSeconds -
      b.timeSeconds
    );

  }
);


}

/* ============================================================
LEADERBOARD RENDER
============================================================ */

function escapeHtml(text) {

const div =
document.createElement(
'div'
);

div.textContent =
text;

return div.innerHTML;

}

function renderLeaderboard(
mode,
board
) {

leaderboardTitleEl.textContent =
`${
      MODE_LABELS[mode] ||
      mode.toUpperCase()
    } LEADERBOARD`;

const entries =
sortedLeaderboardEntries(
board
).slice(
0,
LEADERBOARD_MAX_ROWS
);

if (
entries.length === 0
) {


leaderboardListEl.innerHTML =
  `
  <li class="leaderboard-empty">
    Be the first Space Explorer on today’s board!
  </li>
  `;

return;


}

leaderboardListEl.innerHTML =
entries
.map(
(entry, index) => {


      const rank =
        index + 1;


      const medal =
        rank === 1
          ? '🥇'
          :
            rank === 2
              ? '🥈'
              :
                rank === 3
                  ? '🥉'
                  : String(rank);


      const isMe =
        entry.nickname ===
        state.nickname;


      return `

        <li
          class="leaderboard-row rank-${rank}${
            isMe ? ' me' : ''
          }"
        >

          <span class="leaderboard-rank">
            ${medal}
          </span>

          <span class="leaderboard-name">
            ${escapeHtml(
              entry.nickname
            )}
            ${isMe ? ' (you)' : ''}
          </span>

          <span class="leaderboard-meta">

            <span class="lb-score">
              ${entry.score} pts
            </span>

            ${formatTime(
              entry.timeSeconds
            )}

          </span>

        </li>

      `;

    }
  )
  .join('');


}

/* ============================================================
RESULTS
============================================================ */

function showResults() {

const total =
state.roundQuestions.length;

const timeTaken =
state.elapsedSeconds !== null
? state.elapsedSeconds
: 0;

/*
  The mission score is simply the sum of the
  per-question scores already accumulated in
  state.score as each question was answered
  (see calcQuestionScore() / handleAnswer()).
*/

const totalPoints =
state.score;

resultsScore.textContent =
`${totalPoints} POINTS`;

const ratio =
total > 0
? state.correctCount / total
: 0;

let message;

if (
ratio === 1
) {


message =
  'Perfect mission — you heard every letter!';


} else if (
ratio >= 0.7
) {


message =
  'Awesome listening, space explorer!';


} else if (
ratio >= 0.4
) {


message =
  'Nice work! Keep practicing those sounds.';


} else {


message =
  'Good try! Let’s blast off again and listen closely.';


}

resultsMsg.textContent =
message;

const filled =
calcStarRating(
totalPoints
);

resultsStars.textContent =
'⭐'.repeat(
filled
) +
'☆'.repeat(
5 - filled
);

const previousBest =
loadBestScore();

const isNewBest =
!previousBest ||
totalPoints >
previousBest.points;

if (isNewBest) {


saveBestScore(
  totalPoints,
  state.correctCount,
  timeTaken
);


}

const bestPoints =
isNewBest
? totalPoints
: previousBest.points;

resultsBest.textContent =
(
isNewBest
? "🏆 Today's New Best! "
: "🏆 Today's Best: "
) +
bestPoints +
' POINTS';

resultsBest.classList.toggle(
'new-best',
isNewBest
);

const board =
recordLeaderboardResult(
state.mode,
state.nickname,
totalPoints,
timeTaken
);

renderLeaderboard(
state.mode,
board
);

startChampionCountdown();

showScreen(
'results'
);

}

/* ============================================================
CHAMPION COUNTDOWN
============================================================ */

let championCountdownIntervalId =
null;

function updateChampionCountdown() {

const msLeft =
msUntilNextJstMidnight();

const totalMinutes =
Math.max(
0,
Math.floor(
msLeft / 60000
)
);

const hours =
Math.floor(
totalMinutes / 60
);

const minutes =
totalMinutes % 60;

championCountdownEl.textContent =
`⏳ You have ${hours} hours ${minutes} minutes left to become the new CHAMPION!`;

}

function startChampionCountdown() {

stopChampionCountdown();

updateChampionCountdown();

championCountdownIntervalId =
setInterval(
updateChampionCountdown,
30000
);

}

function stopChampionCountdown() {

if (
championCountdownIntervalId !== null
) {


clearInterval(
  championCountdownIntervalId
);

championCountdownIntervalId =
  null;


}

}

/* ============================================================
PLAY AGAIN
============================================================ */

playAgainBtn.addEventListener(
'click',
() => {


if (
  state.transitioning
) {
  return;
}


state.transitioning =
  true;


playAgainBtn.disabled =
  true;


stopChampionCountdown();


playGalaxyZoomTransition(
  resultsContent,
  startContent,
  () => {

    showScreen(
      'difficulty'
    );

  }
);


setTimeout(
  () => {

    state.transitioning =
      false;

    playAgainBtn.disabled =
      false;

  },
  QUESTION_EXIT_MS +
  QUESTION_ENTER_MS +
  60
);


}
);

/* ============================================================
BLACK HOLE
============================================================ */

blackholeBtn.addEventListener(
'click',
() => {


if (
  state.transitioning
) {
  return;
}


state.transitioning =
  true;


blackholeBtn.disabled =
  true;


clearAutoAdvanceTimer();

clearAutoplayTimer();

stopGameTimer();

letterAudio.pause();


playGalaxyZoomTransition(
  questionContent,
  null,
  () => {

    /*
      IMPORTANT:

      This returns to the daily
      homepage, NOT nickname entry,
      as long as the same JST day.
    */

    showDailyHomepage();

  },
  'q-suck'
);


setTimeout(
  () => {

    state.transitioning =
      false;

    blackholeBtn.disabled =
      false;

  },
  QUESTION_EXIT_MS +
  QUESTION_ENTER_MS +
  60
);


}
);

/* ============================================================
SHARE
============================================================ */

function showShareFeedback(
message,
duration = 2000
) {

const original =
shareBtn.textContent;

shareBtn.textContent =
message;

shareBtn.disabled =
true;

setTimeout(
() => {


  shareBtn.textContent =
    original;

  shareBtn.disabled =
    false;

},
duration


);

}

shareBtn.addEventListener(
'click',
async () => {


const shareData = {

  title:
    document.title,

  text:
    'Come play the Galaxy Alphabet Quiz with me! 🚀',

  url:
    window.location.href

};


if (
  navigator.share
) {

  try {

    await navigator.share(
      shareData
    );

  } catch (error) {
    /* User cancelled */
  }

  return;

}


if (
  navigator.clipboard &&
  navigator.clipboard.writeText
) {

  try {

    await navigator.clipboard.writeText(
      shareData.url
    );


    showShareFeedback(
      '✅ Link Copied!'
    );


    return;

  } catch (error) {
    /* Continue */
  }

}


window.prompt(
  'Copy this link to share:',
  shareData.url
);


}
);

/* ============================================================
BUTTON SOUND
============================================================ */

let clickSoundCtx =
null;

function playClickSound() {

const AudioContextClass =
window.AudioContext ||
window.webkitAudioContext;

if (!AudioContextClass) {
return;
}

if (!clickSoundCtx) {


clickSoundCtx =
  new AudioContextClass();


}

if (
clickSoundCtx.state ===
'suspended'
) {


clickSoundCtx.resume();


}

const now =
clickSoundCtx.currentTime;

const osc =
clickSoundCtx.createOscillator();

const gain =
clickSoundCtx.createGain();

osc.type =
'square';

osc.frequency.setValueAtTime(
1100,
now
);

osc.frequency.exponentialRampToValueAtTime(
120,
now + 0.15
);

gain.gain.setValueAtTime(
0.16,
now
);

gain.gain.exponentialRampToValueAtTime(
0.001,
now + 0.16
);

osc.connect(gain);

gain.connect(
clickSoundCtx.destination
);

osc.start(now);

osc.stop(
now + 0.18
);

}

document.addEventListener(
'click',
event => {


const button =
  event.target.closest(
    'button'
  );


if (
  button &&
  !button.disabled
) {

  playClickSound();

}


},
true
);

/* ============================================================
BACKGROUND STARS
============================================================ */

function buildStarField() {

if (!starField) {
return;
}

starField.innerHTML =
'';

const fragment =
document.createDocumentFragment();

for (
let i = 0;
i < STAR_COUNT;
i++
) {


const star =
  document.createElement(
    'div'
  );


const size =
  Math.random() < 0.15
    ?
      Math.random() * 2 +
      2.5
    :
      Math.random() * 1.5 +
      1;


star.className =
  size > 3
    ? 'star big'
    : 'star';


star.style.left =
  `${Math.random() * 100}vw`;


star.style.top =
  `${Math.random() * 100}vh`;


star.style.width =
  `${size}px`;


star.style.height =
  `${size}px`;


star.style.animationDuration =
  `${(
    Math.random() * 3 +
    2.5
  ).toFixed(2)}s`;


star.style.animationDelay =
  `${(
    Math.random() * 4
  ).toFixed(2)}s`;


star.style.setProperty(
  '--min-o',
  (
    Math.random() * 0.25 +
    0.1
  ).toFixed(2)
);


star.style.setProperty(
  '--max-o',
  (
    Math.random() * 0.4 +
    0.6
  ).toFixed(2)
);


fragment.appendChild(
  star
);


}

starField.appendChild(
fragment
);

}

/* ============================================================
OPTIONAL AMBIENT EFFECTS
============================================================ */

const SHOOTING_STAR_MIN_DELAY_MS = 2200;
const SHOOTING_STAR_MAX_DELAY_MS = 5200;

const FLOATING_SATELLITE_MIN_DELAY_MS = 5000;
const FLOATING_SATELLITE_MAX_DELAY_MS = 11000;

function randRange(
min,
max
) {

return (
Math.random() *
(max - min) +
min
);

}

let activeShootingStars =
0;

function spawnShootingStar() {

if (!ambientLayer) {
return;
}

if (
activeShootingStars >= 3
) {
return;
}

const el =
document.createElement(
'div'
);

el.className =
'shooting-star';

const near =
Math.random() < 0.3;

el.style.top =
`${randRange(-5,55)}%`;

el.style.left =
`${randRange(0,100)}%`;

el.style.width =
`${randRange(
      near ? 55 : 22,
      near ? 90 : 42
    )}px`;

el.style.height =
near ? '2.2px' : '1.2px';

el.style.setProperty(
'--angle',
`${randRange(15,35)}deg`
);

el.style.setProperty(
'--distance',
`${randRange(
      near ? 150 : 80,
      near ? 230 : 150
    )}px`
);

el.style.setProperty(
'--peak-opacity',
near ? '1' : '0.6'
);

el.style.animationDuration =
`${randRange(
      near ? 550 : 420,
      near ? 850 : 680
    )}ms`;

activeShootingStars++;

el.addEventListener(
'animationend',
() => {


  el.remove();

  activeShootingStars--;

}


);

ambientLayer.appendChild(
el
);

}

function scheduleShootingStars() {

setTimeout(
() => {


  spawnShootingStar();

  scheduleShootingStars();

},
randRange(
  SHOOTING_STAR_MIN_DELAY_MS,
  SHOOTING_STAR_MAX_DELAY_MS
)


);

}

let activeSatellites =
0;

function spawnFloatingSatellite() {

if (!ambientLayer) {
return;
}

if (
activeSatellites >= 3
) {
return;
}

const el =
document.createElement(
'div'
);

el.className =
'floating-satellite';

el.textContent =
'🛰️';

el.style.top =
`${randRange(5,90)}%`;

el.style.left =
`${randRange(0,100)}%`;

el.style.fontSize =
`${randRange(20,32)}px`;

el.style.setProperty(
'--dx',
`${randRange(-500,500)}px`
);

el.style.setProperty(
'--dy',
`${randRange(-250,250)}px`
);

el.style.setProperty(
'--spin',
`${randRange(-420,420)}deg`
);

el.style.animationDuration =
`${randRange(
      10000,
      18000
    )}ms`;

activeSatellites++;

el.addEventListener(
'animationend',
() => {


  el.remove();

  activeSatellites--;

}


);

ambientLayer.appendChild(
el
);

}

function scheduleFloatingSatellites() {

setTimeout(
() => {


  spawnFloatingSatellite();

  scheduleFloatingSatellites();

},
randRange(
  FLOATING_SATELLITE_MIN_DELAY_MS,
  FLOATING_SATELLITE_MAX_DELAY_MS
)


);

}

/* ============================================================
MIDNIGHT RESET
============================================================ */

let lastKnownJstDate =
getJstDateKey();

setInterval(
() => {


const current =
  getJstDateKey();


if (
  current ===
  lastKnownJstDate
) {
  return;
}


/*
  JST date changed.

  Nickname is now invalid because
  loadNickname() checks the date.

  We do NOT interrupt an active game.
  When the player returns home,
  showDailyHomepage() will display
  nickname entry.
*/

lastKnownJstDate =
  current;


stopChampionCountdown();


},
30000
);

/* ============================================================
INITIALIZATION
============================================================ */

buildStarField();

setupWarpCanvas();

/*
THIS IS THE IMPORTANT STARTING POINT.

Every page load checks localStorage.

No nickname today:
→ nickname screen

Nickname already saved today:
→ returning check-in screen
*/

showDailyHomepage();

/*
Ambient effects.
*/

const reducedMotion =
window.matchMedia(
'(prefers-reduced-motion: reduce)'
).matches;

if (!reducedMotion) {

scheduleShootingStars();

scheduleFloatingSatellites();

}
