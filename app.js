/* ============================================================
S.P.A.C.E. ALPHABETS — CLEAN GAME LOGIC
============================================================

DAILY FLOW

FIRST VISIT OF THE DAY
  GALAXY CHECK-IN → Enter nickname → HOME BASE (home.html)
  → START MISSION PAGE → DIFFICULTY → GAME → RESULTS

RETURNING VISIT SAME JST DAY
  Launch intro → GALAXY HUB (home.html)

NEW JST DAY
  Nickname is automatically cleared.
  Player sees nickname entry again.
============================================================ */

/* ============================================================
SUPABASE — ONLINE LEADERBOARD
============================================================ */

const SUPABASE_URL = 'https://chqyzmhivilmqdubkava.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_9Bh-hrBs7ODOMrORQP5ntg_nG6FnWPb';

const supabaseClient =
  (window.supabase && SUPABASE_URL.indexOf('YOUR-PROJECT') === -1)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

if (!supabaseClient) {
  console.warn(
    'Supabase is not configured yet — set SUPABASE_URL / SUPABASE_ANON_KEY in app.js. ' +
    'The leaderboard will stay empty until this is done.'
  );
}

/* ============================================================
SETTINGS
============================================================ */

const QUESTIONS_PER_GAME = 7;

const STAR_COUNT = 90;

/*
SCORING

Each question is worth a MAXIMUM of 1,000 points:
  500 base points for a correct answer
  + up to 500 points of speed bonus.

With 7 questions per mission, the maximum possible
mission score is 7,000 points.
*/

const MAX_POINTS_PER_QUESTION = 1000;

const BASE_CORRECT_POINTS = 500;

const MAX_SPEED_BONUS = 500;

const SPEED_BONUS_FAST_SECONDS = 0.75;

const SPEED_BONUS_SLOW_SECONDS = 7;

const SPEED_BONUS_DECAY_RATE = 0.7; // higher = the bonus collapses even faster past the fast cutoff

const MAX_MISSION_POINTS =
  QUESTIONS_PER_GAME *
  MAX_POINTS_PER_QUESTION;

const BEST_SCORE_KEY =
  'galaxyAlphabetQuiz.bestScore.v2';

const NICKNAME_KEY =
  'galaxyAlphabetQuiz.nickname.v2';

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

const AUTO_ADVANCE_DELAY_MS = 2000; // currently unused — all modes require a manual "Next →" click now
const AUTOPLAY_DELAY_MS = 0; // wait this long after the question renders before the single automatic play

/* ============================================================
QUESTION SCORING
============================================================
A wrong answer always earns 0 points.

A correct answer earns BASE_CORRECT_POINTS (500) plus a speed
bonus of up to MAX_SPEED_BONUS (500):

  - At SPEED_BONUS_FAST_SECONDS or faster: full bonus (1,000).
  - Past that, the bonus collapses sharply (exponential decay).
  - At or beyond SPEED_BONUS_SLOW_SECONDS: exactly 500.
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

  const secondsPastFast =
    clamped -
    SPEED_BONUS_FAST_SECONDS;

  const decay =
    Math.exp(
      -SPEED_BONUS_DECAY_RATE *
      secondsPastFast
    );

  const speedBonus =
    MAX_SPEED_BONUS *
    decay;

  return Math.round(
    BASE_CORRECT_POINTS +
    speedBonus
  );
}

/* ============================================================
STAR RATING
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
LEADERBOARD SCORE (RESCALED TO 100)
============================================================
Purely a display/storage conversion for the shared leaderboard:
rescales the raw mission total onto 0–100, 2 decimal places.
Everything else keeps using the raw point total.
============================================================ */

function calcLeaderboardScore(totalPoints) {

  const rawPercent =
    (totalPoints / MAX_MISSION_POINTS) *
    100;

  return Math.round(
    rawPercent * 100
  ) / 100;

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
  document.getElementById('nicknameForm');

const nicknameInput =
  document.getElementById('nicknameInput');

const nicknameSubmitBtn =
  document.getElementById('nicknameSubmitBtn');

const welcomeBackEl =
  document.getElementById('welcomeBack');

const startWelcomeEl =
  document.getElementById('startWelcome');

const checkinBtn =
  document.getElementById('checkinBtn');

const shareBtn =
  document.getElementById('shareBtn');

const startBtn =
  document.getElementById('startBtn');

const difficultyButtons =
  document.querySelectorAll('.difficulty-btn');

const playAudioBtn =
  document.getElementById('playAudioBtn');

const letterAudio =
  document.getElementById('letterAudio');

const optionsGrid =
  document.getElementById('optionsGrid');

const feedbackEl =
  document.getElementById('feedback');

const nextBtn =
  document.getElementById('nextBtn');

const questionCounter =
  document.getElementById('questionCounter');

const scoreCounter =
  document.getElementById('scoreCounter');

const modePill =
  document.getElementById('modePill');

const timerPill =
  document.getElementById('timerPill');

const blackholeBtn =
  document.getElementById('blackholeBtn');

const constellationEl =
  document.getElementById('constellation');

const resultsScore =
  document.getElementById('resultsScore');

const resultsMsg =
  document.getElementById('resultsMsg');

const resultsStars =
  document.getElementById('resultsStars');

const resultsBest =
  document.getElementById('resultsBest');

const championCountdownEl =
  document.getElementById('championCountdown');

const leaderboardTitleEl =
  document.getElementById('leaderboardTitle');

const leaderboardListEl =
  document.getElementById('leaderboardList');

const playAgainBtn =
  document.getElementById('playAgainBtn');

const starField =
  document.getElementById('starField');

const ambientLayer =
  document.getElementById('ambientLayer');

const warpCanvas =
  document.getElementById('warpCanvas');

const galaxyFlash =
  document.getElementById('galaxyFlash');

const appShell =
  document.getElementById('appShell');

const questionContent =
  document.getElementById('questionContent');

const resultsContent =
  document.getElementById('resultsContent');

const startContent =
  document.getElementById('startContent');

// "Home Base" buttons on the Start Mission, Difficulty, and Results
// screens — back out to home.html without losing the nickname.
const homeFromStartBtn =
  document.getElementById('homeFromStartBtn');

const homeFromDifficultyBtn =
  document.getElementById('homeFromDifficultyBtn');

const homeFromResultsBtn =
  document.getElementById('homeFromResultsBtn');

// The "Which letter did you hear?" paragraph inside the game screen.
// Used so Medium/Hard questions can show their own prompt.
const promptEl =
  document.querySelector('#gameScreen .prompt');

// NEW: "Mission Control" welcome-message overlay, shown once right
// after a BRAND-NEW nickname is submitted — see showCheckinMessage()
// below. Returning players never see this; they never call
// submitNickname() at all.
const checkinMessageOverlay =
  document.getElementById('checkinMessageOverlay');

const transmissionPanelEl =
  document.querySelector('#checkinMessageOverlay .transmission-panel');

const transmissionTextEl =
  document.getElementById('transmissionText');

const chooseMissionBtn =
  document.getElementById('chooseMissionBtn');

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
      The nickname is valid ONLY for today's JST date.
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

  const launchMission =
    sessionStorage.getItem(
      'launchMission1'
    );

  const nickname =
    loadNickname();

  /* HOME BASE → Mission 1 */
  if (
    launchMission === 'true' &&
    nickname
  ) {

    sessionStorage.removeItem(
      'launchMission1'
    );

    state.nickname = nickname;

    try {
      sessionStorage.setItem(
        'playerNickname',
        nickname
      );
    } catch (error) {
      /* Ignore sessionStorage failure */
    }

    startWelcomeEl.textContent =
      `Are you ready, ${nickname}?`;

    showScreen('start');

    return;
  }

  /* FIRST VISIT OF THE DAY */
  if (!nickname) {

    state.nickname = '';
    nicknameInput.value = '';
    nicknameSubmitBtn.disabled = true;

    showScreen('nickname');

    /* No audio here: the welcome plays at the GALAXY HUB (home.html). */

    setTimeout(
      () => {
        nicknameInput.focus();
      },
      50
    );

    return;
  }

  /* Existing nickname → HOME BASE */
  state.nickname = nickname;

  try {
    sessionStorage.setItem(
      'playerNickname',
      nickname
    );
  } catch (error) {
    /* Ignore sessionStorage failure */
  }

  window.location.href =
    'home.html';
}

/* ============================================================
GO TO HOME BASE
============================================================ */

function goToHomeBase() {

  window.location.href =
    'home.html';

}

[
  homeFromStartBtn,
  homeFromDifficultyBtn,
  homeFromResultsBtn
].forEach(
  button => {

    if (!button) {
      return;
    }

    button.addEventListener(
      'click',
      goToHomeBase
    );

  }
);

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

  state.nickname =
    nickname;

  saveNickname(
    nickname
  );

  /* Fallback flag only: showCheckinMessage() below plays
     spaceship-welcome.mp3 itself and marks it delivered. If that
     playback is somehow blocked and never starts, this is what
     makes the GALAXY HUB fall back to playing the full welcome
     (instead of welcome-back) when the player gets there. */
  if (window.WelcomeAudio) {
    window.WelcomeAudio.markFirstCheckin();
  }

  try {
    sessionStorage.setItem(
      'playerNickname',
      nickname
    );
  } catch (error) {
    /* Ignore sessionStorage failure */
  }

  /* NICKNAME → MISSION CONTROL MESSAGE → HOME BASE
     showCheckinMessage() (see the "CHECK-IN MESSAGE" section
     below) sends the player on to home.html once they tap
     CHOOSE MISSION. */
  showCheckinMessage();

}

/* ============================================================
CHECK-IN MESSAGE — "MISSION CONTROL" WELCOME (NEW)
============================================================
Shown once, right after a BRAND-NEW nickname is submitted (see
submitNickname() above). Returning players never see this at
all — they never reach submitNickname(), so nothing here changes
for them.

The message types itself out letter by letter, in sync with
spaceship-welcome.mp3 (see playCheckinMessage() in
welcome-audio.js): once the audio's real length is known, the
typewriter is sized to finish CHECKIN_MESSAGE_SYNC_OFFSET_MS
(0.3s) before the audio does. If the audio's length can't be read
in time (missing file, slow load), CHECKIN_MESSAGE_FALLBACK_MS is
used instead so the message still reads at a natural pace.

Tapping the panel while it's still typing skips straight to the
full message. The CHOOSE MISSION button stays disabled/hidden
until the message has finished (or been skipped), then sends the
player on to the GALAXY HUB.
============================================================ */

const CHECKIN_MESSAGE_TEXT =
  "Welcome to the English Galaxy. Hop aboard the spaceship and " +
  "get ready for your very own space adventure. We are about to " +
  "launch. So, hold tight!";

const CHECKIN_MESSAGE_SYNC_OFFSET_MS = 300;
const CHECKIN_MESSAGE_FALLBACK_MS = 7000;
const CHECKIN_MESSAGE_MIN_MS = 1200;

let checkinTypeTimeoutId = null;

function clearCheckinTypeTimer() {

  if (checkinTypeTimeoutId !== null) {

    clearTimeout(
      checkinTypeTimeoutId
    );

    checkinTypeTimeoutId = null;

  }

}

function finishCheckinTypewriter() {

  clearCheckinTypeTimer();

  if (!transmissionTextEl) {
    return;
  }

  transmissionTextEl.textContent =
    CHECKIN_MESSAGE_TEXT;

  transmissionTextEl.classList.remove(
    'typing'
  );

  if (chooseMissionBtn) {

    chooseMissionBtn.disabled =
      false;

    chooseMissionBtn.classList.add(
      'show'
    );

  }

}

function startCheckinTypewriter(totalMs) {

  clearCheckinTypeTimer();

  if (!transmissionTextEl) {
    return;
  }

  const text =
    CHECKIN_MESSAGE_TEXT;

  const total =
    Math.max(
      CHECKIN_MESSAGE_MIN_MS,
      Number(totalMs) ||
        CHECKIN_MESSAGE_FALLBACK_MS
    );

  const perCharMs =
    total / text.length;

  let i = 0;

  transmissionTextEl.textContent =
    '';

  transmissionTextEl.classList.add(
    'typing'
  );

  function typeNext() {

    i++;

    transmissionTextEl.textContent =
      text.slice(0, i);

    if (i >= text.length) {

      finishCheckinTypewriter();

      return;

    }

    checkinTypeTimeoutId =
      setTimeout(
        typeNext,
        perCharMs
      );

  }

  checkinTypeTimeoutId =
    setTimeout(
      typeNext,
      perCharMs
    );

}

function showCheckinMessage() {

  /* No overlay in this build for some reason — fall back to the
     original immediate redirect rather than stranding the player. */
  if (!checkinMessageOverlay) {

    window.location.href =
      'home.html';

    return;

  }

  if (chooseMissionBtn) {

    chooseMissionBtn.disabled =
      true;

    chooseMissionBtn.classList.remove(
      'show'
    );

  }

  if (transmissionTextEl) {

    transmissionTextEl.textContent =
      '';

    transmissionTextEl.classList.remove(
      'typing'
    );

  }

  checkinMessageOverlay.classList.add(
    'show'
  );

  checkinMessageOverlay.setAttribute(
    'aria-hidden',
    'false'
  );

  if (
    window.WelcomeAudio &&
    window.WelcomeAudio.playCheckinMessage
  ) {

    window.WelcomeAudio.playCheckinMessage(
      function (durationSeconds) {

        const totalMs =
          durationSeconds
            ?
              durationSeconds * 1000 -
              CHECKIN_MESSAGE_SYNC_OFFSET_MS
            : CHECKIN_MESSAGE_FALLBACK_MS;

        startCheckinTypewriter(
          totalMs
        );

      }
    );

  } else {

    startCheckinTypewriter(
      CHECKIN_MESSAGE_FALLBACK_MS
    );

  }

}

function hideCheckinMessage() {

  if (!checkinMessageOverlay) {
    return;
  }

  checkinMessageOverlay.classList.remove(
    'show'
  );

  checkinMessageOverlay.setAttribute(
    'aria-hidden',
    'true'
  );

}

if (chooseMissionBtn) {

  chooseMissionBtn.addEventListener(
    'click',
    () => {

      if (chooseMissionBtn.disabled) {
        return;
      }

      hideCheckinMessage();

      /* MISSION CONTROL MESSAGE → HOME BASE */
      window.location.href =
        'home.html';

    }
  );

}

/* Tapping anywhere on the panel while the message is still typing
   skips straight to the full text — the button itself is handled
   above, so a tap on it never double-fires this. */
if (transmissionPanelEl) {

  transmissionPanelEl.addEventListener(
    'click',
    event => {

      if (
        chooseMissionBtn &&
        (
          event.target === chooseMissionBtn ||
          chooseMissionBtn.contains(event.target)
        )
      ) {
        return;
      }

      if (
        transmissionTextEl &&
        transmissionTextEl.classList.contains('typing')
      ) {

        finishCheckinTypewriter();

      }

    }
  );

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
      Re-check localStorage — the player may have left the page
      open across JST midnight.
    */

    const nickname =
      loadNickname();

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
    TIMER STARTS WHEN THE MISSION ACTUALLY BEGINS.
  */

  startRoundTimer();

  /*
    If animation isn't available, simply start the game.
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

// Builds the Medium-mode prompt as HTML. The run of underscores in
// q.display (e.g. "__" in "SIST__") is wrapped in <span id="blankSlot">
// so revealMediumAnswer() can swap it for the real letters. The
// word-meaning slot sits on its own line below the word, hidden until
// revealed.
function buildMediumPromptHTML(q) {

  const segments =
    String(q.display || '')
      .split(/(_+)/);

  let wordHtml = '';

  segments.forEach(
    segment => {

      if (/^_+$/.test(segment)) {

        wordHtml +=
          `<span class="blank-slot" id="blankSlot">${segment}</span>`;

      } else {

        wordHtml +=
          escapeHtml(segment);

      }

    }
  );

  return (
    `What sound is missing?<br><span class="word-line">${wordHtml}</span><span class="word-meaning-wrap" id="wordMeaningWrap" aria-hidden="true"><span id="wordMeaningText" class="word-meaning-text"></span></span>`
  );

}

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

  // Medium mode shows its masked word with a targetable blank span.
  // Easy/Hard keep using the plain-text prompt.
  if (promptEl) {

    if (
      state.mode === 'medium' &&
      q.display
    ) {

      promptEl.innerHTML =
        buildMediumPromptHTML(q);

    } else {

      promptEl.textContent =
        q.prompt ||
        'Which letter did you hear?';

    }

  }

  /*
    AUDIO — questions.js should provide: audio: "audio/example.mp3"
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

  // The response-time clock doesn't start here — it starts only once
  // the audio actually begins playing (see playCurrentAudio()), so
  // loading lag before playback never eats into the speed bonus.
  state.questionStartTime = null;

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

  /*
    The response-time / speed-bonus clock starts the instant the
    audio actually BEGINS playing (the 'playing' event). If the
    audio never plays, the clock never starts and that question
    earns no speed bonus (see the fallback in handleAnswer()).
    Guarded so a manual replay doesn't reset a running clock.
  */

  letterAudio.onplaying =
    () => {

      if (
        state.questionStartTime === null
      ) {

        state.questionStartTime =
          performance.now();

      }

    };

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
    appears. After that, the student can replay with "Play Sound".
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
MEDIUM MODE — ANSWER REVEAL
============================================================
Called once per question, right after the student answers, ONLY
in Medium mode. Swaps the underscores for the real letters (with
a pop-in animation) and fades in the Japanese meaning below.
Always reveals the CORRECT answer, right or wrong.
============================================================ */

function revealMediumAnswer(q) {

  if (!q) {
    return;
  }

  const blankSlot =
    document.getElementById(
      'blankSlot'
    );

  if (
    blankSlot &&
    q.correctAnswer
  ) {

    blankSlot.textContent =
      String(
        q.correctAnswer
      ).toUpperCase();

    blankSlot.classList.add(
      'blank-revealed'
    );

  }

  const wordMeaningWrap =
    document.getElementById(
      'wordMeaningWrap'
    );

  const wordMeaningText =
    document.getElementById(
      'wordMeaningText'
    );

  if (
    wordMeaningWrap &&
    wordMeaningText &&
    q.japanese
  ) {

    wordMeaningText.textContent =
      `意味：${q.japanese}`;

    wordMeaningWrap.classList.add(
      'show'
    );

  }

}

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

  const q =
    state.roundQuestions[
      state.currentIndex
    ];

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
    If the clock never started (audio never actually played),
    that means "no speed bonus", not "instant answer". Feeding
    calcQuestionScore() SPEED_BONUS_SLOW_SECONDS makes a correct
    answer land exactly on the BASE_CORRECT_POINTS floor.
  */
  const questionResponseSeconds =
    state.questionStartTime !== null
      ? (
          performance.now() -
          state.questionStartTime
        ) / 1000
      : SPEED_BONUS_SLOW_SECONDS;

  const pointsEarned =
    calcQuestionScore(
      questionResponseSeconds,
      isCorrect
    );

  if (isCorrect) {

    state.correctCount++;

    state.score += pointsEarned;

    playCorrectSound();

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

    playIncorrectSound();

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

  // Medium mode reveals the missing sound, win or lose.
  if (
    state.mode === 'medium'
  ) {

    revealMediumAnswer(q);

  }

  const isLast =
    state.currentIndex + 1 >=
    state.roundQuestions.length;

  /*
    Stop the timer immediately after the final answer.
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

  /*
    All three modes require a manual "Next →" click to advance.
  */

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
============================================================
Stays in localStorage — a per-device "your personal best today"
tracker, separate from the shared online leaderboard.
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
LEADERBOARD (SUPABASE — SHARED ACROSS ALL PLAYERS)
============================================================
Table: leaderboard_entries
  mode          text
  nickname      text
  score         numeric(5,2)  -- rescaled 0.00–100.00
  time_seconds  numeric
  date_key      text   (JST day, e.g. '2026-09-04')
  unique (mode, nickname, date_key)

NOTE: if `score` was previously created as `int`, alter it:
  alter table leaderboard_entries alter column score type numeric(5,2);

Only today's (JST) rows are ever read or written, so the board
naturally resets at JST midnight without a cleanup job.
============================================================ */

async function loadLeaderboard(mode) {

  if (!supabaseClient) {
    return { entries: [] };
  }

  const { data, error } =
    await supabaseClient
      .from('leaderboard_entries')
      .select('nickname, score, time_seconds')
      .eq('mode', mode)
      .eq('date_key', getJstDateKey())
      .order('score', { ascending: false })
      .order('time_seconds', { ascending: true })
      .limit(LEADERBOARD_MAX_ROWS);

  if (error) {

    console.error(
      'Failed to load leaderboard:',
      error
    );

    return { entries: [] };

  }

  return {
    entries:
      (data || []).map(
        row => ({
          nickname: row.nickname,
          score: row.score,
          timeSeconds: row.time_seconds
        })
      )
  };

}

async function recordLeaderboardResult(
  mode,
  nickname,
  score,
  timeSeconds
) {

  if (!supabaseClient) {
    return { entries: [] };
  }

  /*
    Check the player's existing row for today (if any), so we only
    overwrite it with a BETTER result.
  */

  const { data: existing, error: fetchError } =
    await supabaseClient
      .from('leaderboard_entries')
      .select('score, time_seconds')
      .eq('mode', mode)
      .eq('nickname', nickname)
      .eq('date_key', getJstDateKey())
      .maybeSingle();

  if (fetchError) {
    console.error(
      'Failed to check existing score:',
      fetchError
    );
  }

  const better =
    !existing ||
    score > existing.score ||
    (
      score === existing.score &&
      timeSeconds < existing.time_seconds
    );

  if (better) {

    const { error: upsertError } =
      await supabaseClient
        .from('leaderboard_entries')
        .upsert(
          {
            mode: mode,
            nickname: nickname,
            score: score,
            time_seconds: timeSeconds,
            date_key: getJstDateKey()
          },
          { onConflict: 'mode,nickname,date_key' }
        );

    if (upsertError) {
      console.error(
        'Failed to save score:',
        upsertError
      );
    }

  }

  /*
    Return the fresh top-N board either way.
  */

  return loadLeaderboard(mode);

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
    board.entries || [];

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
                  ${Number(entry.score).toFixed(2)} pts
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

function renderLeaderboardLoading(mode) {

  leaderboardTitleEl.textContent =
    `${
      MODE_LABELS[mode] ||
      mode.toUpperCase()
    } LEADERBOARD`;

  leaderboardListEl.innerHTML =
    `
    <li class="leaderboard-empty">
      Loading today’s explorers...
    </li>
    `;

}

/* ============================================================
RESULTS
============================================================ */

async function showResults() {

  const total =
    state.roundQuestions.length;

  const timeTaken =
    state.elapsedSeconds !== null
      ? state.elapsedSeconds
      : 0;

  /*
    The mission score is the sum of the per-question scores
    already accumulated in state.score.
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

  /*
    Show the results screen right away with a "Loading..."
    leaderboard placeholder, then fill it in once the Supabase
    round-trip finishes.
  */

  renderLeaderboardLoading(
    state.mode
  );

  startChampionCountdown();

  showScreen(
    'results'
  );

  const board =
    await recordLeaderboardResult(
      state.mode,
      state.nickname,
      calcLeaderboardScore(totalPoints),
      timeTaken
    );

  /*
    Guard: only paint the fetched board if the player is still
    looking at the results screen.
  */

  if (
    screens.results.classList.contains('active') &&
    state.mode === state.mode
  ) {

    renderLeaderboard(
      state.mode,
      board
    );

  }

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
          Returns to the daily homepage, NOT nickname entry,
          as long as it is the same JST day.
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

/*
  Shared AudioContext used by every synthesized sound effect below
  (generic click, incorrect answer).
*/
function getSoundCtx() {

  const AudioContextClass =
    window.AudioContext ||
    window.webkitAudioContext;

  if (!AudioContextClass) {
    return null;
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

  return clickSoundCtx;

}

function playClickSound() {

  const ctx =
    getSoundCtx();

  if (!ctx) {
    return;
  }

  const now =
    ctx.currentTime;

  const osc =
    ctx.createOscillator();

  const gain =
    ctx.createGain();

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
    ctx.destination
  );

  osc.start(now);

  osc.stop(
    now + 0.18
  );

}

/*
  CORRECT ANSWER SOUND
  Plays audio/correct-twinkle.mp3. Reuses one Audio object and
  rewinds it each time, so rapid-fire correct answers restart
  cleanly instead of overlapping.
*/
let correctAnswerAudio =
  null;

function playCorrectSound() {

  if (!correctAnswerAudio) {

    correctAnswerAudio =
      new Audio(
        'audio/correct-twinkle.mp3'
      );

  }

  correctAnswerAudio.currentTime = 0;

  const promise =
    correctAnswerAudio.play();

  if (
    promise &&
    typeof promise.catch === 'function'
  ) {

    promise.catch(
      error => {

        console.warn(
          'Correct-answer sound could not play:',
          error
        );

      }
    );

  }

}

/*
  INCORRECT ANSWER SOUND
  A short zap pulled downward in pitch while a lowpass filter
  closes over it, like being sucked into a black hole.
*/
function playIncorrectSound() {

  const ctx =
    getSoundCtx();

  if (!ctx) {
    return;
  }

  const now =
    ctx.currentTime;

  const osc =
    ctx.createOscillator();

  const gain =
    ctx.createGain();

  const filter =
    ctx.createBiquadFilter();

  osc.type =
    'sawtooth';

  filter.type =
    'lowpass';

  filter.Q.value = 6;

  filter.frequency.setValueAtTime(
    3000,
    now
  );

  filter.frequency.exponentialRampToValueAtTime(
    80,
    now + 0.22
  );

  osc.frequency.setValueAtTime(
    900,
    now
  );

  osc.frequency.exponentialRampToValueAtTime(
    60,
    now + 0.22
  );

  gain.gain.setValueAtTime(
    0.22,
    now
  );

  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    now + 0.2
  );

  osc.connect(filter);

  filter.connect(gain);

  gain.connect(
    ctx.destination
  );

  osc.start(now);

  osc.stop(
    now + 0.22
  );

}

/*
  Generic button click sound plays for every button EXCEPT the
  answer options — those get playCorrectSound() / playIncorrectSound()
  instead, so a single click never plays two sounds at once.
*/
document.addEventListener(
  'click',
  event => {

    const button =
      event.target.closest(
        'button'
      );

    if (
      button &&
      !button.disabled &&
      !button.classList.contains(
        'option-btn'
      )
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
LAUNCH INTRO — CINEMATIC OPENING SEQUENCE
============================================================
Plays once, automatically, whenever the game is opened at
index.html — for first-play-of-the-day players (→ GALAXY CHECK-IN)
AND returning players (→ GALAXY HUB, home.html). It does NOT play
when arriving via the Galaxy Hub's START button (launchMission1
flag), which is navigation between game screens.

A rocket launches upward with the words "えいごであそぼう" trailing
behind it like sparks, over stars streaking past on a dedicated
canvas (#introStarCanvas), separate from the in-game warp canvas.

Sequence (LAUNCH_INTRO_DURATION_MS total):
  Scene 1 — stars brighten, rocket fades in near the bottom.
  Scene 2 — rocket rises; letters ignite one by one, top to
            bottom, and the stack HOLDS so the words can be read.
  Scene 3 — the stack accelerates off the top of the screen.
  Scene 4 — galaxy flash, the correct screen is put in place
            underneath via showDailyHomepage(), and the intro
            crossfades out.

Timings here must stay in sync with style.css section 11
(introStackLaunch is 5000ms and starts after the 500ms
anticipation phase, so it ends at 5500ms).
============================================================ */

const LAUNCH_INTRO_DURATION_MS = 5600; // was 3800
const LAUNCH_INTRO_ANTICIPATION_MS = 500;
const LAUNCH_INTRO_REVEAL_MS = 700;
const LAUNCH_INTRO_STAR_COUNT = 130;

const launchIntroEl =
  document.getElementById(
    'launchIntro'
  );

const introStarCanvas =
  document.getElementById(
    'introStarCanvas'
  );

let introCtx = null;
let introWarpStars = [];
let introMaxRadius = 0;
let introRAF = null;
let introAnimStart = 0;

function shouldPlayLaunchIntro() {

  if (
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
  ) {
    return false;
  }

  const launchMission =
    sessionStorage.getItem(
      'launchMission1'
    );

  /*
    Arriving from the Galaxy Hub's START button is a navigation
    BETWEEN game screens — never replay the intro for this.
  */
  if (launchMission === 'true') {
    return false;
  }

  return true;

}

function setupIntroCanvas() {

  if (
    !introStarCanvas ||
    !introStarCanvas.getContext
  ) {
    return;
  }

  introCtx =
    introStarCanvas.getContext('2d');

  resizeIntroCanvas();

  window.addEventListener(
    'resize',
    resizeIntroCanvas
  );

}

function resizeIntroCanvas() {

  if (!introCtx) {
    return;
  }

  const dpr =
    window.devicePixelRatio || 1;

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  introStarCanvas.width =
    width * dpr;

  introStarCanvas.height =
    height * dpr;

  introStarCanvas.style.width =
    `${width}px`;

  introStarCanvas.style.height =
    `${height}px`;

  introCtx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );

}

function makeIntroWarpStar(
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
        ? Math.random() * 18
        :
          Math.random() *
          introMaxRadius *
          0.55,

    spd:
      0.5 +
      Math.random() * 1.2,

    hue:
      roll < 0.16
        ? 'gold'
        :
          roll < 0.3
            ? 'teal'
            : 'white'

  };

}

function initIntroWarpStars(count) {

  introMaxRadius =
    Math.hypot(
      window.innerWidth,
      window.innerHeight
    ) / 2 * 1.1;

  introWarpStars = [];

  for (
    let i = 0;
    i < count;
    i++
  ) {

    introWarpStars.push(
      makeIntroWarpStar(false)
    );

  }

}

function introWarpFrame(now) {

  if (!introCtx) {
    return;
  }

  const elapsed =
    now -
    introAnimStart;

  const progress =
    Math.min(
      elapsed /
      LAUNCH_INTRO_DURATION_MS,
      1
    );

  /*
    Speed ramps up smoothly across the whole sequence, so the
    warp-speed trails grow naturally out of the gentle star
    brightening at the start.
  */
  const speedFactor =
    0.12 +
    progress * progress * 4.6;

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  const centerX =
    width / 2;

  /*
    Biased toward the spacecraft's launch point near the bottom
    of the screen, so stars appear to stream past IT as it climbs.
  */
  const centerY =
    height * 0.66;

  introCtx.fillStyle =
    'rgba(5, 6, 15, 0.22)';

  introCtx.fillRect(
    0,
    0,
    width,
    height
  );

  introWarpStars.forEach(
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
        introMaxRadius
      ) {

        introWarpStars[index] =
          makeIntroWarpStar(true);

        return;

      }

      const ratio =
        star.r /
        introMaxRadius;

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
        ratio * 3.2;

      const alpha =
        Math.min(
          1,
          0.12 +
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

      introCtx.beginPath();

      introCtx.fillStyle =
        color;

      introCtx.arc(
        x,
        y,
        size,
        0,
        Math.PI * 2
      );

      introCtx.fill();

    }
  );

  if (progress < 1) {

    introRAF =
      requestAnimationFrame(
        introWarpFrame
      );

  }

}

function stopIntroWarpAnimation() {

  if (introRAF !== null) {

    cancelAnimationFrame(
      introRAF
    );

  }

  introRAF = null;

  if (
    introCtx &&
    introStarCanvas
  ) {

    introCtx.clearRect(
      0,
      0,
      introStarCanvas.width,
      introStarCanvas.height
    );

  }

}

function playLaunchIntro() {

  /*
    Nothing to animate, or nothing to reveal into: skip straight
    to the existing flow with no delay.
  */
  if (
    !launchIntroEl ||
    !shouldPlayLaunchIntro()
  ) {

    if (launchIntroEl) {

      launchIntroEl.style.display =
        'none';

    }

    if (appShell) {

      appShell.classList.remove(
        'transition-hide'
      );

    }

    showDailyHomepage();

    return;

  }

  /*
    Returning player (valid nickname today): the intro plays HERE on
    index.html, then we continue to the GALAXY HUB (home.html), where
    the welcome audio plays. First-play-of-the-day players instead
    land on GALAXY CHECK-IN under the intro.
  */
  const isReturningPlayer =
    !!loadNickname();

  startLaunchIntroWithSound(
    isReturningPlayer
  );

}

/*
  HOMEPAGE → LAUNCH
  The game always opens on a "TAP TO LAUNCH" homepage. The tap is what
  lets the browser play sound, so the launch sound and the cinematic
  intro start together, perfectly in sync:

    TAP TO LAUNCH → cinematic launch intro (+ spaceship-launch.mp3)
      → GALAXY HUB (returning player, + welcome-back sound)
      → GALAXY CHECK-IN → GALAXY HUB (first visit, + welcome sound)
*/
function startLaunchIntroWithSound(
  isReturningPlayer
) {

  /* Load the sound while the homepage is showing, so it starts the
     instant the player taps. */
  if (window.WelcomeAudio) {

    window.WelcomeAudio.preloadLaunch(
      LAUNCH_INTRO_DURATION_MS
    );

  }

  showLaunchTapGate(
    () => {

      /* Inside the tap, so the browser allows the sound. */
      if (window.WelcomeAudio) {

        window.WelcomeAudio.playLaunch(
          LAUNCH_INTRO_DURATION_MS
        );

      }

      runLaunchIntroSequence(
        isReturningPlayer
      );

    }
  );

}

function showLaunchTapGate(onTap) {

  /* A div (not a <button>) so the generic button click sound
     doesn't play over the launch sound. */
  const gate =
    document.createElement('div');

  gate.className =
    'launch-gate';

  gate.setAttribute('role', 'button');
  gate.setAttribute('tabindex', '0');
  gate.setAttribute('aria-label', 'Tap to launch');

  gate.innerHTML = `
    <span class="launch-gate-brand">TAP to LAUNCH!</span>
    <span class="launch-gate-rocket" aria-hidden="true">🚀</span>
    <span class="launch-gate-title">タップして、はっしん！</span>
     `;

  let used = false;

  const go = () => {

    if (used) {
      return;
    }

    used = true;

    gate.classList.add(
      'launch-gate-out'
    );

    setTimeout(
      () => {
        gate.remove();
      },
      400
    );

    onTap();

  };

  gate.addEventListener(
    'click',
    go
  );

  gate.addEventListener(
    'keydown',
    event => {

      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {

        event.preventDefault();

        go();

      }

    }
  );

  document.body.appendChild(
    gate
  );

  gate.focus();

}

function runLaunchIntroSequence(
  isReturningPlayer
) {

  setupIntroCanvas();

  initIntroWarpStars(
    LAUNCH_INTRO_STAR_COUNT
  );

  introAnimStart =
    performance.now();

  introRAF =
    requestAnimationFrame(
      introWarpFrame
    );

  /* Scene 1: stars brighten, rocket fades in near the bottom. */
  launchIntroEl.classList.add(
    'phase-anticipation'
  );

  setTimeout(
    () => {

      /* Scenes 2 + 3: rocket rises, words ignite and hold, then
         the stack accelerates away — see introStackLaunch in
         style.css. */
      launchIntroEl.classList.add(
        'phase-launch'
      );

    },
    LAUNCH_INTRO_ANTICIPATION_MS
  );

  setTimeout(
    () => {

      /*
        Scene 4 — "arrival": reuse the SAME galaxy-flash bloom,
        put the correct screen in place underneath, then crossfade
        the launch intro out as the app shell fades back in.
      */

      if (galaxyFlash) {

        galaxyFlash.classList.remove(
          'flash'
        );

        void galaxyFlash.offsetWidth;

        galaxyFlash.classList.add(
          'flash'
        );

      }

      if (!isReturningPlayer) {

        showDailyHomepage();

        if (appShell) {

          appShell.classList.remove(
            'transition-hide'
          );

        }

      }

      launchIntroEl.classList.add(
        'intro-done'
      );

    },
    LAUNCH_INTRO_DURATION_MS -
    LAUNCH_INTRO_REVEAL_MS
  );

  setTimeout(
    () => {

      stopIntroWarpAnimation();

      launchIntroEl.style.display =
        'none';

      /* Returning player: intro finished → go to the GALAXY HUB. */
      if (isReturningPlayer) {

        showDailyHomepage();

      }

    },
    LAUNCH_INTRO_DURATION_MS
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
      JST date changed. loadNickname() will now treat the saved
      nickname as invalid. We do NOT interrupt an active game;
      when the player returns home, showDailyHomepage() will
      display nickname entry.
    */

    lastKnownJstDate =
      current;

    stopChampionCountdown();

  },
  30000
);

/* ============================================================
FIT TO SCREEN — NO SCROLLBARS, EVER
============================================================
Measures the card at its natural size and, if it is taller or
wider than the space available, shrinks the whole card (text,
buttons, spacing) via CSS zoom until it fits. Re-runs whenever
the screen changes, content changes, the window resizes, the
device rotates, or web fonts finish loading.

style.css reads the result through: zoom: var(--fit-scale, 1)
on .card. The page itself is overflow: hidden.
============================================================ */

const fitCard =
  document.querySelector('.card');

let fitRafId =
  null;

function fitToScreen() {

  if (!fitCard) {
    return;
  }

  const body =
    document.body;

  const cs =
    getComputedStyle(body);

  // 16px is reserved for the card's floating animation.
  const availH =
    body.clientHeight -
    parseFloat(cs.paddingTop) -
    parseFloat(cs.paddingBottom) -
    16;

  if (availH <= 0) {
    return;
  }

  let scale = 1;

  fitCard.style.setProperty(
    '--fit-scale',
    '1'
  );

  for (let i = 0; i < 6; i++) {

    // Ancestor transforms (e.g. the .app scale transition) also
    // scale the bounding box, so divide them out.
    const appW =
      appShell
        ? appShell.offsetWidth
        : 0;

    const k =
      appW > 0
        ? appShell.getBoundingClientRect().width / appW
        : 1;

    const h =
      fitCard.getBoundingClientRect().height /
      (k || 1);

    if (h <= 0) {
      return;
    }

    const overflowW =
      fitCard.scrollWidth > fitCard.clientWidth + 1
        ? fitCard.clientWidth / fitCard.scrollWidth
        : 1;

    const ratio =
      Math.min(
        availH / h,
        overflowW
      );

    if (
      ratio < 0.995 ||
      (scale < 1 && ratio > 1.01)
    ) {

      scale =
        Math.max(
          0.25,
          Math.min(
            1,
            scale * ratio * 0.995
          )
        );

      fitCard.style.setProperty(
        '--fit-scale',
        scale.toFixed(4)
      );

    } else {

      break;

    }

  }

}

function scheduleFit() {

  if (fitRafId !== null) {
    return;
  }

  fitRafId =
    requestAnimationFrame(
      () => {

        fitRafId = null;

        fitToScreen();

      }
    );

}

if (fitCard) {

  // Catches every content change on its own: screen switches,
  // the Medium-mode word meaning appearing, the leaderboard
  // loading, feedback text, etc.
  if (window.ResizeObserver) {

    new ResizeObserver(
      scheduleFit
    ).observe(fitCard);

  }

  window.addEventListener(
    'resize',
    scheduleFit
  );

  window.addEventListener(
    'orientationchange',
    scheduleFit
  );

  if (
    document.fonts &&
    document.fonts.ready
  ) {

    document.fonts.ready.then(
      scheduleFit
    );

  }

  scheduleFit();

}

/* ============================================================
INITIALIZATION
============================================================ */

buildStarField();

setupWarpCanvas();

/*
Every page load goes through playLaunchIntro(), which either
plays the cinematic intro and then calls showDailyHomepage(),
or (reduced motion / arriving from the Hub via START) skips
straight to showDailyHomepage() with no delay.
*/

playLaunchIntro();

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
