/* ============================================================
   ALPHABET LISTENING QUIZ — GAME LOGIC

   You generally should NOT need to edit this file to update
   quiz content — that all lives in questions.js.

   Settings you CAN safely change below:

     QUESTIONS_PER_GAME       : how many questions are played each round
     STAR_COUNT                : how many background stars are drawn
     WARP_*                    : timing/density of the big galaxy-entrance
                                  hyperspace sequence (mission launch)
     QUESTION_WARP_*           : timing/density of the shorter galaxy zoom
                                  that plays between every question
     SHOOTING_STAR_*           : how often shooting stars streak by, and
                                  how many can be on screen at once
     FLOATING_SATELLITE_*      : how often 🛰️ satellites drift across the
                                  screen, and how many can be on screen at once
     AUTO_ADVANCE_DELAY_MS     : how long feedback shows before auto-advancing
     AUTOPLAY_GAP_MS           : gap between the two automatic audio plays
     calcTimeBonus()           : the time-bonus point table for scoring
     BEST_SCORE_KEY            : the localStorage key the best score is
                                  saved under (resets daily at local midnight)
     LEADERBOARD_MAX_ROWS      : how many rows show on each leaderboard
   ============================================================ */

const QUESTIONS_PER_GAME = 7; // <-- change this to play more/fewer questions per game
const STAR_COUNT = 90; // <-- change this to make the sky sparser/denser

/* Ambient shooting stars & floating satellites — these play
   continuously throughout the WHOLE site (every screen), independent
   of the hyperspace transitions below. Each spawns on a random delay
   somewhere between its MIN and MAX, forever. */
const SHOOTING_STAR_MIN_DELAY_MS = 2200;
const SHOOTING_STAR_MAX_DELAY_MS = 5200;
const SHOOTING_STAR_MAX_CONCURRENT = 3;

const FLOATING_SATELLITE_MIN_DELAY_MS = 5000;
const FLOATING_SATELLITE_MAX_DELAY_MS = 11000;
const FLOATING_SATELLITE_MAX_CONCURRENT = 3;

/* Galaxy entrance transition timing */
const WARP_STAR_COUNT = 220;
const WARP_ACCEL_MS = 1600;
const WARP_HOLD_MS = 250;
const WARP_EXIT_MS = 650;

/* Question-to-question galaxy zoom transition */
const QUESTION_WARP_STAR_COUNT = 70;
const QUESTION_WARP_ACCEL_MS = 450;
const QUESTION_EXIT_MS = 320;
const QUESTION_ENTER_MS = 360;

/* Auto-advance */
const AUTO_ADVANCE_DELAY_MS = 2000;

/* Auto-play-twice */
const AUTOPLAY_GAP_MS = 2000;

/* Scoring & best-score persistence */
const POINTS_PER_CORRECT_ANSWER = 100;
const BEST_SCORE_KEY = 'galaxyAlphabetQuiz.bestScore.v1';

/* Time-bonus table */
function calcTimeBonus(seconds) {
  if (seconds < 20) return 300;
  if (seconds < 25) return 200;
  if (seconds < 30) return 100;
  if (seconds < 35) return 80;
  if (seconds < 40) return 60;
  if (seconds < 45) return 40;
  return 20;
}

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   NICKNAME + LEADERBOARD PERSISTENCE
   ------------------------------------------------------------ */

const NICKNAME_KEY = 'galaxyAlphabetQuiz.nickname.v1';
const LEADERBOARD_KEY_PREFIX = 'galaxyAlphabetQuiz.leaderboard.';
const LEADERBOARD_MAX_ROWS = 5;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const MODE_LABELS = {
  easy: 'EASY',
  medium: 'MEDIUM',
  hard: 'HARD'
};

function getJstDateKey(date) {
  const now = date || new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);

  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

function msUntilNextJstMidnight() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);

  const jstMidnight = new Date(Date.UTC(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate() + 1,
    0,
    0,
    0
  ));

  return jstMidnight.getTime() - jstNow.getTime();
}

function loadNickname() {
  try {
    const raw = localStorage.getItem(NICKNAME_KEY);

    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed.nickname !== 'string' ||
      !parsed.nickname.trim()
    ) {
      return null;
    }

    if (parsed.dateKey !== getJstDateKey()) {
      return null;
    }

    return parsed.nickname;
  } catch (e) {
    return null;
  }
}

function saveNickname(nickname) {
  try {
    localStorage.setItem(
      NICKNAME_KEY,
      JSON.stringify({
        nickname: nickname,
        dateKey: getJstDateKey()
      })
    );
  } catch (e) {
    // Storage unavailable
  }
}

function loadLeaderboard(mode) {
  const key = LEADERBOARD_KEY_PREFIX + mode + '.v1';

  try {
    const raw = localStorage.getItem(key);

    if (raw) {
      const parsed = JSON.parse(raw);

      if (
        parsed &&
        parsed.dateKey === getJstDateKey() &&
        Array.isArray(parsed.entries)
      ) {
        return parsed;
      }
    }
  } catch (e) {
    // fall through
  }

  return {
    dateKey: getJstDateKey(),
    entries: []
  };
}

function saveLeaderboard(mode, board) {
  const key = LEADERBOARD_KEY_PREFIX + mode + '.v1';

  try {
    localStorage.setItem(key, JSON.stringify(board));
  } catch (e) {
    // Storage unavailable
  }
}

function recordLeaderboardResult(
  mode,
  nickname,
  score,
  timeSeconds
) {
  const board = loadLeaderboard(mode);

  const existingIndex = board.entries.findIndex(
    e => e.nickname === nickname
  );

  const candidate = {
    nickname: nickname,
    score: score,
    timeSeconds: timeSeconds
  };

  if (existingIndex === -1) {
    board.entries.push(candidate);
  } else {
    const existing = board.entries[existingIndex];

    const isBetter =
      score > existing.score ||
      (
        score === existing.score &&
        timeSeconds < existing.timeSeconds
      );

    if (isBetter) {
      board.entries[existingIndex] = candidate;
    }
  }

  saveLeaderboard(mode, board);

  return board;
}

function sortedLeaderboardEntries(board) {
  return board.entries.slice().sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.timeSeconds - b.timeSeconds;
  });
}

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */

const state = {
  mode: 'easy',

  nickname: '',

  roundQuestions: [],

  currentIndex: 0,

  score: 0,

  answeredCurrent: false,

  results: [],

  transitioning: false,

  startTime: null,

  elapsedSeconds: null,

  autoAdvanceTimeoutId: null,

  autoplaySecondTimeoutId: null
};

/* ------------------------------------------------------------
   DOM REFERENCES
   ------------------------------------------------------------ */

const screens = {
  nickname: document.getElementById('nicknameScreen'),
  start: document.getElementById('startScreen'),
  difficulty: document.getElementById('difficultyScreen'),
  game: document.getElementById('gameScreen'),
  results: document.getElementById('resultsScreen')
};

const nicknameForm =
  document.getElementById('nicknameForm');

const nicknameInput =
  document.getElementById('nicknameInput');

const nicknameSubmitBtn =
  document.getElementById('nicknameSubmitBtn');

const welcomeBackEl =
  document.getElementById('welcomeBack');

const startBtn =
  document.getElementById('startBtn');

const shareBtn =
  document.getElementById('shareBtn');

const difficultyButtons =
  document.querySelectorAll('.difficulty-btn');

const playAgainBtn =
  document.getElementById('playAgainBtn');

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

const starField =
  document.getElementById('starField');

const ambientLayer =
  document.getElementById('ambientLayer');

const appShell =
  document.getElementById('appShell');

const warpCanvas =
  document.getElementById('warpCanvas');

const galaxyFlash =
  document.getElementById('galaxyFlash');

const startContent =
  document.getElementById('startContent');

const questionContent =
  document.getElementById('questionContent');

const resultsContent =
  document.getElementById('resultsContent');

/* ------------------------------------------------------------
   BACKGROUND STAR FIELD
   ------------------------------------------------------------ */

function buildStarField() {
  starField.innerHTML = '';

  const frag = document.createDocumentFragment();

  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement('div');

    const size =
      Math.random() < 0.15
        ? (Math.random() * 2 + 2.5)
        : (Math.random() * 1.5 + 1);

    const isBig = size > 3;

    star.className =
      'star' + (isBig ? ' big' : '');

    star.style.left =
      Math.random() * 100 + 'vw';

    star.style.top =
      Math.random() * 100 + 'vh';

    star.style.width =
      size + 'px';

    star.style.height =
      size + 'px';

    const duration =
      (Math.random() * 3 + 2.5).toFixed(2);

    const delay =
      (Math.random() * 4).toFixed(2);

    star.style.setProperty(
      '--min-o',
      (Math.random() * 0.25 + 0.1).toFixed(2)
    );

    star.style.setProperty(
      '--max-o',
      (Math.random() * 0.4 + 0.6).toFixed(2)
    );

    star.style.animationDuration =
      duration + 's';

    star.style.animationDelay =
      delay + 's';

    frag.appendChild(star);
  }

  starField.appendChild(frag);
}

/* ------------------------------------------------------------
   AMBIENT FLOATING SATELLITES & SHOOTING STARS
   ------------------------------------------------------------ */

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

let activeShootingStarCount = 0;

function spawnShootingStar() {
  if (!ambientLayer) return;

  if (
    activeShootingStarCount >=
    SHOOTING_STAR_MAX_CONCURRENT
  ) {
    return;
  }

  const el = document.createElement('div');

  el.className = 'shooting-star';

  const isNear = Math.random() < 0.3;

  const length = isNear
    ? randRange(55, 90)
    : randRange(22, 42);

  const distance = isNear
    ? randRange(150, 230)
    : randRange(80, 150);

  const duration = isNear
    ? randRange(550, 850)
    : randRange(420, 680);

  const peakOpacity = isNear
    ? 1
    : randRange(0.4, 0.65);

  const thickness = isNear
    ? 2.2
    : 1.2;

  const startTop =
    randRange(-5, 55);

  const startLeft =
    randRange(0, 100);

  const angle =
    randRange(15, 35) *
    (Math.random() < 0.75 ? 1 : -1);

  el.style.top =
    startTop + '%';

  el.style.left =
    startLeft + '%';

  el.style.width =
    length.toFixed(0) + 'px';

  el.style.height =
    thickness + 'px';

  el.style.setProperty(
    '--angle',
    angle.toFixed(1) + 'deg'
  );

  el.style.setProperty(
    '--distance',
    distance.toFixed(0) + 'px'
  );

  el.style.setProperty(
    '--peak-opacity',
    peakOpacity.toFixed(2)
  );

  el.style.animationDuration =
    duration.toFixed(0) + 'ms';

  activeShootingStarCount++;

  el.addEventListener('animationend', () => {
    el.remove();
    activeShootingStarCount--;
  });

  ambientLayer.appendChild(el);
}

function scheduleShootingStars() {
  const delay =
    randRange(
      SHOOTING_STAR_MIN_DELAY_MS,
      SHOOTING_STAR_MAX_DELAY_MS
    );

  setTimeout(() => {
    spawnShootingStar();
    scheduleShootingStars();
  }, delay);
}

let activeSatelliteCount = 0;

function spawnFloatingSatellite() {
  if (!ambientLayer) return;

  if (
    activeSatelliteCount >=
    FLOATING_SATELLITE_MAX_CONCURRENT
  ) {
    return;
  }

  const el = document.createElement('div');

  el.className =
    'floating-satellite';

  el.textContent = '🛰️';

  const goingRight =
    Math.random() < 0.5;

  const goingDown =
    Math.random() < 0.5;

  const dx =
    (goingRight ? 1 : -1) *
    randRange(
      window.innerWidth * 0.35,
      window.innerWidth * 0.65
    );

  const dy =
    (goingDown ? 1 : -1) *
    randRange(
      window.innerHeight * 0.15,
      window.innerHeight * 0.35
    );

  const startLeft =
    goingRight
      ? randRange(-5, 35)
      : randRange(65, 100);

  const startTop =
    goingDown
      ? randRange(5, 35)
      : randRange(55, 90);

  const spin =
    (Math.random() < 0.5 ? 1 : -1) *
    randRange(180, 420);

  const duration =
    randRange(10000, 18000);

  const size =
    randRange(20, 32);

  el.style.top =
    startTop + '%';

  el.style.left =
    startLeft + '%';

  el.style.fontSize =
    size.toFixed(1) + 'px';

  el.style.setProperty(
    '--dx',
    dx.toFixed(0) + 'px'
  );

  el.style.setProperty(
    '--dy',
    dy.toFixed(0) + 'px'
  );

  el.style.setProperty(
    '--spin',
    spin.toFixed(0) + 'deg'
  );

  el.style.animationDuration =
    duration.toFixed(0) + 'ms';

  activeSatelliteCount++;

  el.addEventListener('animationend', () => {
    el.remove();
    activeSatelliteCount--;
  });

  ambientLayer.appendChild(el);
}

function scheduleFloatingSatellites() {
  const delay =
    randRange(
      FLOATING_SATELLITE_MIN_DELAY_MS,
      FLOATING_SATELLITE_MAX_DELAY_MS
    );

  setTimeout(() => {
    spawnFloatingSatellite();
    scheduleFloatingSatellites();
  }, delay);
}

/* ------------------------------------------------------------
   GALAXY ENTRANCE TRANSITION
   ------------------------------------------------------------ */

let warpCtx = null;
let warpStars = [];
let warpMaxRadius = 0;
let warpRAF = null;
let warpAnimStart = 0;
let warpAccelMsActive =
  WARP_ACCEL_MS;

function setupWarpCanvas() {
  if (!warpCanvas.getContext) return;

  warpCtx =
    warpCanvas.getContext('2d');

  resizeWarpCanvas();

  window.addEventListener(
    'resize',
    resizeWarpCanvas
  );
}

function resizeWarpCanvas() {
  if (!warpCtx) return;

  const dpr =
    window.devicePixelRatio || 1;

  const w =
    window.innerWidth;

  const h =
    window.innerHeight;

  warpCanvas.width =
    w * dpr;

  warpCanvas.height =
    h * dpr;

  warpCanvas.style.width =
    w + 'px';

  warpCanvas.style.height =
    h + 'px';

  warpCtx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}

function makeWarpStar(nearCenter) {
  const roll = Math.random();

  return {
    angle:
      Math.random() * Math.PI * 2,

    r:
      nearCenter
        ? Math.random() * 24
        : Math.random() *
          warpMaxRadius *
          0.5,

    spd:
      0.6 + Math.random() * 1.4,

    hue:
      roll < 0.14
        ? 'gold'
        : roll < 0.26
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

  const total =
    count || WARP_STAR_COUNT;

  for (let i = 0; i < total; i++) {
    warpStars.push(
      makeWarpStar(false)
    );
  }
}

function warpFrame(now) {
  const elapsed =
    now - warpAnimStart;

  const accelProgress =
    Math.min(
      elapsed / warpAccelMsActive,
      1
    );

  const eased =
    accelProgress *
    accelProgress;

  const speedFactor =
    0.35 + eased * 5.5;

  const w =
    window.innerWidth;

  const h =
    window.innerHeight;

  const cx =
    w / 2;

  const cy =
    h / 2;

  warpCtx.fillStyle =
    'rgba(6, 8, 24, 0.28)';

  warpCtx.fillRect(
    0,
    0,
    w,
    h
  );

  for (
    let i = 0;
    i < warpStars.length;
    i++
  ) {
    const star =
      warpStars[i];

    const delta =
      speedFactor *
      star.spd *
      (2 + star.r * 0.045);

    star.r += delta;

    if (
      star.r >
      warpMaxRadius
    ) {
      warpStars[i] =
        makeWarpStar(true);

      continue;
    }

    const ratio =
      star.r /
      warpMaxRadius;

    const x =
      cx +
      Math.cos(star.angle) *
      star.r;

    const y =
      cy +
      Math.sin(star.angle) *
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

    if (star.hue === 'gold') {
      color =
        `rgba(255, 217, 102, ${alpha})`;
    } else if (star.hue === 'teal') {
      color =
        `rgba(79, 227, 193, ${alpha})`;
    } else {
      color =
        `rgba(255, 255, 255, ${alpha})`;
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

  warpRAF =
    requestAnimationFrame(
      warpFrame
    );
}

function stopWarpAnimation() {
  if (warpRAF) {
    cancelAnimationFrame(warpRAF);
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

function beginGalaxyEntrance() {
  if (state.transitioning) return;

  state.transitioning = true;

  setDifficultyButtonsDisabled(
    true
  );

  startRoundTimer();

  if (
    prefersReducedMotion ||
    !warpCtx
  ) {
    appShell.classList.add(
      'transition-hide'
    );

    setTimeout(() => {
      startGame();

      appShell.classList.remove(
        'transition-hide'
      );

      state.transitioning =
        false;

      setDifficultyButtonsDisabled(
        false
      );
    }, 300);

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

  setTimeout(() => {
    galaxyFlash.classList.remove(
      'flash'
    );

    void galaxyFlash.offsetWidth;

    galaxyFlash.classList.add(
      'flash'
    );
  }, WARP_ACCEL_MS);

  setTimeout(() => {
    startGame();
  }, WARP_ACCEL_MS + WARP_HOLD_MS);

  setTimeout(() => {
    appShell.classList.remove(
      'transition-hide'
    );

    warpCanvas.classList.remove(
      'active'
    );

    document.body.classList.remove(
      'warping'
    );
  }, WARP_ACCEL_MS + WARP_HOLD_MS + 120);

  setTimeout(() => {
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

function setDifficultyButtonsDisabled(
  disabled
) {
  difficultyButtons.forEach(btn => {
    btn.disabled =
      disabled;
  });
}

/* ------------------------------------------------------------
   QUESTION-TO-QUESTION GALAXY TRANSITION
   ------------------------------------------------------------ */

function playQuestionWarpBurst(
  visibleMs
) {
  if (!warpCtx) return;

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

  setTimeout(() => {
    warpCanvas.classList.remove(
      'active'
    );

    document.body.classList.remove(
      'warping'
    );
  }, visibleMs);

  setTimeout(() => {
    stopWarpAnimation();
  }, visibleMs + 650);
}

function playGalaxyZoomTransition(
  exitEl,
  enterEl,
  onSwap,
  exitClass
) {
  exitClass =
    exitClass || 'q-exit';

  if (prefersReducedMotion) {
    onSwap();
    return;
  }

  playQuestionWarpBurst(
    QUESTION_EXIT_MS +
    QUESTION_ENTER_MS -
    60
  );

  exitEl.classList.remove(
    'q-enter',
    'q-exit',
    'q-suck'
  );

  exitEl.classList.add(
    exitClass
  );

  setTimeout(() => {
    onSwap();

    if (exitEl !== enterEl) {
      exitEl.classList.remove(
        exitClass
      );
    }

    enterEl.classList.remove(
      'q-exit',
      'q-suck',
      'q-enter'
    );

    enterEl.classList.add(
      'q-enter'
    );

    void enterEl.offsetWidth;

    requestAnimationFrame(() => {
      enterEl.classList.remove(
        'q-enter'
      );
    });
  }, QUESTION_EXIT_MS);
}

/* ------------------------------------------------------------
   MISSION TIMER
   ------------------------------------------------------------ */

let gameTimerIntervalId =
  null;

function formatTime(
  totalSeconds
) {
  const s =
    Math.max(
      0,
      Math.round(
        totalSeconds || 0
      )
    );

  const m =
    Math.floor(s / 60);

  const sec =
    s % 60;

  return (
    m +
    ':' +
    String(sec).padStart(2, '0')
  );
}

function startRoundTimer() {
  state.startTime =
    performance.now();

  state.elapsedSeconds =
    null;

  stopGameTimer();

  updateTimerDisplay();

  gameTimerIntervalId =
    setInterval(
      updateTimerDisplay,
      250
    );
}

function stopGameTimer() {
  if (gameTimerIntervalId) {
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
    state.startTime == null
  ) {
    return;
  }

  const liveSeconds =
    state.elapsedSeconds != null
      ? state.elapsedSeconds
      : (
          performance.now() -
          state.startTime
        ) / 1000;

  timerPill.textContent =
    '⏱ ' +
    formatTime(liveSeconds);
}

/* ------------------------------------------------------------
   BEST SCORE
   ------------------------------------------------------------ */

function getTodayDateKey() {
  const d =
    new Date();

  const y =
    d.getFullYear();

  const m =
    String(
      d.getMonth() + 1
    ).padStart(2, '0');

  const day =
    String(
      d.getDate()
    ).padStart(2, '0');

  return (
    `${y}-${m}-${day}`
  );
}

function loadBestScore() {
  try {
    const raw =
      localStorage.getItem(
        BEST_SCORE_KEY
      );

    if (!raw) return null;

    const parsed =
      JSON.parse(raw);

    if (
      typeof parsed.points !==
        'number' ||
      !isFinite(parsed.points)
    ) {
      return null;
    }

    if (
      parsed.dateKey !==
      getTodayDateKey()
    ) {
      return null;
    }

    return parsed;
  } catch (e) {
    return null;
  }
}

function saveBestScore(points) {
  try {
    localStorage.setItem(
      BEST_SCORE_KEY,
      JSON.stringify({
        points: points,
        dateKey:
          getTodayDateKey(),
        savedAt:
          Date.now()
      })
    );
  } catch (e) {
    // Storage unavailable
  }
}

/* ------------------------------------------------------------
   QUESTION SELECTION
   ------------------------------------------------------------ */

function shuffle(array) {
  const arr =
    array.slice();

  for (
    let i = arr.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() *
        (i + 1)
      );

    [
      arr[i],
      arr[j]
    ] = [
      arr[j],
      arr[i]
    ];
  }

  return arr;
}

function pickRoundQuestions() {
  const bank =
    QUESTION_BANKS[state.mode] ||
    QUESTION_BANKS.easy;

  const shuffledBank =
    shuffle(bank);

  return shuffledBank.slice(
    0,
    QUESTIONS_PER_GAME
  );
}

/* ------------------------------------------------------------
   SCREEN NAVIGATION
   ------------------------------------------------------------ */

function showScreen(name) {
  Object.values(screens)
    .forEach(s =>
      s.classList.remove(
        'active'
      )
    );

  screens[name].classList.add(
    'active'
  );
}

/* ------------------------------------------------------------
   CONSTELLATION PROGRESS TRAIL
   ------------------------------------------------------------ */

function renderConstellation() {
  const total =
    state.roundQuestions.length;

  const width = 600;
  const height = 54;
  const padding = 30;

  const step =
    total > 1
      ? (width - padding * 2) /
        (total - 1)
      : 0;

  const y =
    height / 2;

  let pathD =
    `M ${padding} ${y}`;

  let nodesSvg = '';

  for (
    let i = 0;
    i < total;
    i++
  ) {
    const x =
      padding +
      step * i;

    if (i > 0) {
      pathD +=
        ` L ${x} ${y}`;
    }

    let cls =
      'constellation-node';

    if (
      i <
      state.results.length
    ) {
      cls +=
        state.results[i]
          ? ' done'
          : ' wrong-node';
    } else if (
      i ===
      state.currentIndex
    ) {
      cls +=
        ' current';
    }

    const r =
      i === state.currentIndex &&
      i >= state.results.length
        ? 8
        : 6;

    nodesSvg +=
      `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"></circle>`;
  }

  constellationEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <path class="constellation-line" d="${pathD}"></path>
      ${nodesSvg}
    </svg>
    <div class="rocket" id="rocketIcon" aria-hidden="true">🚀</div>
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
      ? (
          (
            padding +
            step *
              progressIndex
          ) /
          width
        ) * 100
      : 50;

  rocket.style.left =
    xPercent + '%';
}

/* ------------------------------------------------------------
   GAME FLOW
   ------------------------------------------------------------ */

function startGame() {
  state.roundQuestions =
    pickRoundQuestions();

  state.currentIndex =
    0;

  state.score =
    0;

  state.results =
    [];

  modePill.textContent =
    MODE_LABELS[state.mode] ||
    'EASY';

  showScreen('game');

  renderQuestion();
}

function clearAutoAdvanceTimer() {
  if (
    state.autoAdvanceTimeoutId
  ) {
    clearTimeout(
      state.autoAdvanceTimeoutId
    );

    state.autoAdvanceTimeoutId =
      null;
  }
}

function clearAutoplaySecondTimer() {
  if (
    state.autoplaySecondTimeoutId
  ) {
    clearTimeout(
      state.autoplaySecondTimeoutId
    );

    state.autoplaySecondTimeoutId =
      null;
  }
}

function renderQuestion() {
  state.answeredCurrent =
    false;

  clearAutoAdvanceTimer();

  clearAutoplaySecondTimer();

  const total =
    state.roundQuestions.length;

  const q =
    state.roundQuestions[
      state.currentIndex
    ];

  questionCounter.textContent =
    `Question ${state.currentIndex + 1} / ${total}`;

  scoreCounter.textContent =
    `Score: ${state.score} / ${state.currentIndex}`;

  renderConstellation();

  letterAudio.pause();

  letterAudio.currentTime =
    0;

  letterAudio.src =
    q.audio;

  letterAudio.onended =
    null;

  playAudioBtn.classList.remove(
    'playing'
  );

  feedbackEl.textContent =
    '';

  feedbackEl.className =
    'feedback';

  nextBtn.style.display =
    'none';

  optionsGrid.innerHTML =
    '';

  const shuffledOptions =
    shuffle(q.options);

  shuffledOptions.forEach(
    letter => {
      const btn =
        document.createElement(
          'button'
        );

      btn.className =
        'option-btn';

      btn.type =
        'button';

      btn.textContent =
        letter;

      btn.setAttribute(
        'aria-label',
        `Answer ${letter}`
      );

      btn.addEventListener(
        'click',
        () =>
          handleAnswer(
            letter,
            btn,
            q.correctAnswer
          )
      );

      optionsGrid.appendChild(
        btn
      );
    }
  );

  startAutoplaySequence();
}

/* ------------------------------------------------------------
   AUTOMATIC AUDIO PLAYBACK
   ------------------------------------------------------------ */

function startAutoplaySequence() {
  playAudioBtn.classList.add(
    'playing'
  );

  letterAudio.currentTime =
    0;

  const playPromise =
    letterAudio.play();

  if (
    playPromise &&
    playPromise.catch
  ) {
    playPromise.catch(() => {
      playAudioBtn.classList.remove(
        'playing'
      );
    });
  }

  letterAudio.onended =
    () => {
      playAudioBtn.classList.remove(
        'playing'
      );

      if (
        state.answeredCurrent
      ) {
        return;
      }

      state.autoplaySecondTimeoutId =
        setTimeout(() => {
          if (
            state.answeredCurrent
          ) {
            return;
          }

          playAudioBtn.classList.add(
            'playing'
          );

          letterAudio.currentTime =
            0;

          const secondPlayPromise =
            letterAudio.play();

          if (
            secondPlayPromise &&
            secondPlayPromise.catch
          ) {
            secondPlayPromise.catch(
              () => {
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
        }, AUTOPLAY_GAP_MS);
    };
}

/* ------------------------------------------------------------
   MANUAL AUDIO BUTTON
   ------------------------------------------------------------ */

playAudioBtn.addEventListener(
  'click',
  () => {
    clearAutoplaySecondTimer();

    playAudioBtn.classList.add(
      'playing'
    );

    letterAudio.currentTime =
      0;

    const playPromise =
      letterAudio.play();

    if (
      playPromise &&
      playPromise.catch
    ) {
      playPromise.catch(() => {
        playAudioBtn.classList.remove(
          'playing'
        );
      });
    }

    letterAudio.onended =
      () => {
        playAudioBtn.classList.remove(
          'playing'
        );
      };
  }
);

/* ------------------------------------------------------------
   ANSWER HANDLING
   IMPORTANT:
   correctAnswer can be:
     "K"
   OR:
     ["K", "C"]

   When it is an array, ANY answer inside the array
   is accepted as correct.
   ------------------------------------------------------------ */

function handleAnswer(
  selectedLetter,
  btnEl,
  correctLetter
) {
  // Prevent multiple submissions
  if (state.answeredCurrent) {
    return;
  }

  state.answeredCurrent =
    true;

  clearAutoplaySecondTimer();

  /*
    Support both:

      correctAnswer: "K"

    and:

      correctAnswer: ["K", "C"]
  */
  const correctAnswers =
    Array.isArray(correctLetter)
      ? correctLetter
      : [correctLetter];

  /*
    ANY answer contained in correctAnswers
    is considered correct.
  */
  const isCorrect =
    correctAnswers.includes(
      selectedLetter
    );

  state.results[
    state.currentIndex
  ] = isCorrect;

  const allOptionButtons =
    optionsGrid.querySelectorAll(
      '.option-btn'
    );

  allOptionButtons.forEach(
    b => {
      b.disabled = true;

      /*
        Highlight ALL correct answers.

        Example:
        correctAnswer: ["K", "C"]

        Both K and C receive the
        "correct" class.
      */
      if (
        correctAnswers.includes(
          b.textContent
        )
      ) {
        b.classList.add(
          'correct'
        );
      }

      /*
        If the player's selected answer
        was wrong, highlight it as incorrect.
      */
      else if (b === btnEl) {
        b.classList.add(
          'incorrect'
        );
      }

      /*
        Everything else is dimmed.
      */
      else {
        b.classList.add(
          'dimmed'
        );
      }
    }
  );

  /* ----------------------------------------------------------
     SCORE
     ---------------------------------------------------------- */

  if (isCorrect) {
    state.score++;

    feedbackEl.textContent =
      '✓ Correct!';

    feedbackEl.classList.add(
      'correct-text'
    );
  } else {
    feedbackEl.textContent =
      `✗ Try again! The answer was "${correctAnswers.join(' or ')}".`;

    feedbackEl.classList.add(
      'incorrect-text'
    );
  }

  feedbackEl.classList.add(
    'show'
  );

  scoreCounter.textContent =
    `Score: ${state.score} / ${state.currentIndex + 1}`;

  renderConstellation();

  const total =
    state.roundQuestions.length;

  const isLastQuestion =
    state.currentIndex + 1 >=
    total;

  /*
    Stop the mission timer the instant
    the final question is answered.
  */
  if (
    isLastQuestion &&
    state.elapsedSeconds == null
  ) {
    state.elapsedSeconds =
      (
        performance.now() -
        state.startTime
      ) / 1000;

    stopGameTimer();

    updateTimerDisplay();
  }

  /*
    The player can still manually press Next,
    but the game automatically advances after
    AUTO_ADVANCE_DELAY_MS.
  */
  nextBtn.textContent =
    isLastQuestion
      ? 'See Results →'
      : 'Next →';

  nextBtn.style.display =
    'inline-block';

  clearAutoAdvanceTimer();

  state.autoAdvanceTimeoutId =
    setTimeout(() => {
      advanceFromCurrentQuestion();
    }, AUTO_ADVANCE_DELAY_MS);
}

/* ------------------------------------------------------------
   ADVANCE TO NEXT QUESTION / RESULTS
   ------------------------------------------------------------ */

function advanceFromCurrentQuestion() {
  if (state.transitioning) {
    return;
  }

  clearAutoAdvanceTimer();

  state.transitioning =
    true;

  nextBtn.disabled =
    true;

  const total =
    state.roundQuestions.length;

  const isLastQuestion =
    state.currentIndex + 1 >=
    total;

  playGalaxyZoomTransition(
    questionContent,
    isLastQuestion
      ? resultsContent
      : questionContent,
    () => {
      if (isLastQuestion) {
        showResults();
      } else {
        state.currentIndex++;

        renderQuestion();
      }
    }
  );

  setTimeout(() => {
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
  () => {
    advanceFromCurrentQuestion();
  }
);

/* ------------------------------------------------------------
   CHAMPION COUNTDOWN
   ------------------------------------------------------------ */

let championCountdownIntervalId =
  null;

function updateChampionCountdown() {
  if (!championCountdownEl) {
    return;
  }

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
    championCountdownIntervalId
  ) {
    clearInterval(
      championCountdownIntervalId
    );

    championCountdownIntervalId =
      null;
  }
}

/* ------------------------------------------------------------
   LEADERBOARD RENDERING
   ------------------------------------------------------------ */

function renderLeaderboard(
  mode,
  board
) {
  leaderboardTitleEl.textContent =
    `${MODE_LABELS[mode] || mode.toUpperCase()} LEADERBOARD`;

  const entries =
    sortedLeaderboardEntries(
      board
    ).slice(
      0,
      LEADERBOARD_MAX_ROWS
    );

  if (entries.length === 0) {
    leaderboardListEl.innerHTML =
      '<li class="leaderboard-empty">Be the first Space Explorer on today\u2019s board!</li>';

    return;
  }

  leaderboardListEl.innerHTML =
    entries.map(
      (entry, i) => {
        const rank =
          i + 1;

        const isMe =
          entry.nickname ===
          state.nickname;

        const medal =
          rank === 1
            ? '🥇'
            : rank === 2
              ? '🥈'
              : rank === 3
                ? '🥉'
                : String(rank);

        return `
          <li class="leaderboard-row rank-${rank}${isMe ? ' me' : ''}">
            <span class="leaderboard-rank">${medal}</span>
            <span class="leaderboard-name">
              ${escapeHtml(entry.nickname)}${isMe ? ' (you)' : ''}
            </span>
            <span class="leaderboard-meta">
              <span class="lb-score">
                ${entry.score} pts
              </span>
              ${formatTime(entry.timeSeconds)}
            </span>
          </li>
        `;
      }
    ).join('');
}

function escapeHtml(str) {
  const div =
    document.createElement(
      'div'
    );

  div.textContent =
    str;

  return div.innerHTML;
}

/* ------------------------------------------------------------
   RESULTS SCREEN
   ------------------------------------------------------------ */

function showResults() {
  const total =
    state.roundQuestions.length;

  /*
    Correct-answer points:
    7 questions × 100 = maximum 700 points.

    Time bonus:
    maximum 300 points.

    Maximum total = 1000 points.
  */
  const correctPoints =
    state.score *
    POINTS_PER_CORRECT_ANSWER;

  const timeTakenSeconds =
    state.elapsedSeconds != null
      ? state.elapsedSeconds
      : 0;

  const timeBonus =
    calcTimeBonus(
      timeTakenSeconds
    );

  const totalPoints =
    correctPoints +
    timeBonus;

  resultsScore.textContent =
    `${totalPoints} POINTS`;

  let message;

  const ratio =
    state.score / total;

  if (ratio === 1) {
    message =
      'Perfect mission — you heard every letter!';
  } else if (ratio >= 0.7) {
    message =
      'Awesome listening, space explorer!';
  } else if (ratio >= 0.4) {
    message =
      'Nice work! Keep practicing those sounds.';
  } else {
    message =
      'Good try! Let\u2019s blast off again and listen closely.';
  }

  resultsMsg.textContent =
    message;

  const filled =
    Math.round(
      ratio * 5
    );

  resultsStars.textContent =
    '⭐'.repeat(filled) +
    '☆'.repeat(5 - filled);

  /*
    Personal best score.
  */
  const previousBest =
    loadBestScore();

  const isNewBest =
    !previousBest ||
    totalPoints >
      previousBest.points;

  if (isNewBest) {
    saveBestScore(
      totalPoints
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
    Daily leaderboard for the mode
    just played.
  */
  const updatedBoard =
    recordLeaderboardResult(
      state.mode,
      state.nickname,
      totalPoints,
      timeTakenSeconds
    );

  renderLeaderboard(
    state.mode,
    updatedBoard
  );

  startChampionCountdown();

  showScreen(
    'results'
  );
}

/* ------------------------------------------------------------
   NICKNAME SCREEN
   ------------------------------------------------------------ */

function sanitizeNickname(raw) {
  return raw
    .trim()
    .toUpperCase()
    .slice(0, 12);
}

nicknameInput.addEventListener(
  'input',
  () => {
    nicknameSubmitBtn.disabled =
      sanitizeNickname(
        nicknameInput.value
      ).length === 0;
  }
);

function submitNickname() {
  const nickname =
    sanitizeNickname(
      nicknameInput.value
    );

  if (!nickname) {
    return;
  }

  state.nickname =
    nickname;

  saveNickname(
    nickname
  );

  showScreen(
    'start'
  );
}

nicknameSubmitBtn.addEventListener(
  'click',
  submitNickname
);

nicknameInput.addEventListener(
  'keydown',
  e => {
    if (e.key === 'Enter') {
      e.preventDefault();

      submitNickname();
    }
  }
);

nicknameForm.addEventListener(
  'submit',
  e => {
    e.preventDefault();

    submitNickname();
  }
);

function initNicknameGate() {
  const existing =
    loadNickname();

  if (existing) {
    state.nickname =
      existing;

    welcomeBackEl.textContent =
      `Welcome back, ${existing}! 👋`;

    showScreen(
      'start'
    );
  } else {
    showScreen(
      'nickname'
    );
  }
}

/* ------------------------------------------------------------
   DIFFICULTY SCREEN
   ------------------------------------------------------------ */

startBtn.addEventListener(
  'click',
  () => {
    showScreen(
      'difficulty'
    );
  }
);

difficultyButtons.forEach(
  btn => {
    btn.addEventListener(
      'click',
      () => {
        if (
          state.transitioning
        ) {
          return;
        }

        state.mode =
          btn.getAttribute(
            'data-mode'
          ) || 'easy';

        beginGalaxyEntrance();
      }
    );
  }
);

/* ------------------------------------------------------------
   PLAY AGAIN
   ------------------------------------------------------------ */

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

    setTimeout(() => {
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

/* ------------------------------------------------------------
   BLACK HOLE BUTTON
   ------------------------------------------------------------ */

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

    clearAutoplaySecondTimer();

    stopGameTimer();

    letterAudio.pause();

    playGalaxyZoomTransition(
      questionContent,
      startContent,
      () => {
        showScreen(
          'start'
        );
      },
      'q-suck'
    );

    setTimeout(() => {
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

/* ------------------------------------------------------------
   SHARE BUTTON
   ------------------------------------------------------------ */

function showShareFeedback(
  message,
  durationMs
) {
  const original =
    shareBtn.textContent;

  shareBtn.textContent =
    message;

  shareBtn.disabled =
    true;

  setTimeout(() => {
    shareBtn.textContent =
      original;

    shareBtn.disabled =
      false;
  }, durationMs || 2000);
}

if (shareBtn) {
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
        } catch (err) {
          // User cancelled
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
        } catch (err) {
          // fall through
        }
      }

      window.prompt(
        'Copy this link to share:',
        shareData.url
      );
    }
  );
}

/* ------------------------------------------------------------
   SPACE GUN CLICK SOUND
   ------------------------------------------------------------ */

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

  const ctx =
    clickSoundCtx;

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

  osc.connect(
    gain
  );

  gain.connect(
    ctx.destination
  );

  osc.start(
    now
  );

  osc.stop(
    now + 0.18
  );
}

document.addEventListener(
  'click',
  e => {
    const btn =
      e.target.closest(
        'button'
      );

    if (
      btn &&
      !btn.disabled
    ) {
      playClickSound();
    }
  },
  true
);

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */

buildStarField();

setupWarpCanvas();

initNicknameGate();

if (
  !prefersReducedMotion
) {
  scheduleShootingStars();

  scheduleFloatingSatellites();
}
