/* ============================================================
   S.P.A.C.E. ALPHABETS — GAME LOGIC
   ============================================================

   FEATURES
   ------------------------------------------------------------
   • Daily nickname
   • EASY / MEDIUM / HARD modes
   • 50 questions per mode
   • 7 random questions per game
   • Automatic question transition after 2 seconds
   • Automatic audio playback twice
   • 2-second gap between automatic audio plays
   • Manual "Play Sound" button
   • Mission timer
   • Maximum score = 1000
   • Daily best score
   • Daily leaderboards
   • Japan-time midnight reset
   • Daily champion countdown
   ============================================================ */


/* ============================================================
   1. GAME SETTINGS
   ============================================================ */

const QUESTIONS_PER_GAME = 7;

const STAR_COUNT = 90;

const POINTS_PER_CORRECT_ANSWER = 100;


/* ------------------------------------------------------------
   Audio
   ------------------------------------------------------------ */

const AUTO_AUDIO_GAP_MS = 2000;


/* ------------------------------------------------------------
   Automatic next question
   ------------------------------------------------------------ */

const AUTO_NEXT_DELAY_MS = 2000;


/* ------------------------------------------------------------
   Warp effects
   ------------------------------------------------------------ */

const WARP_STAR_COUNT = 220;

const WARP_ACCEL_MS = 1600;

const WARP_HOLD_MS = 250;

const WARP_EXIT_MS = 650;


const QUESTION_WARP_STAR_COUNT = 70;

const QUESTION_WARP_ACCEL_MS = 450;

const QUESTION_EXIT_MS = 320;

const QUESTION_ENTER_MS = 360;


/* ------------------------------------------------------------
   Ambient effects
   ------------------------------------------------------------ */

const SHOOTING_STAR_MIN_DELAY_MS = 2200;

const SHOOTING_STAR_MAX_DELAY_MS = 5200;

const SHOOTING_STAR_MAX_CONCURRENT = 3;


const FLOATING_SATELLITE_MIN_DELAY_MS = 5000;

const FLOATING_SATELLITE_MAX_DELAY_MS = 11000;

const FLOATING_SATELLITE_MAX_CONCURRENT = 3;


/* ============================================================
   2. STORAGE KEYS
   ============================================================ */

const NICKNAME_STORAGE_KEY =
  'galaxyAlphabetQuiz.nickname.v2';

const NICKNAME_DATE_KEY =
  'galaxyAlphabetQuiz.nicknameDate.v2';

const LEADERBOARD_STORAGE_KEY =
  'galaxyAlphabetQuiz.leaderboards.v2';

const BEST_SCORE_KEY =
  'galaxyAlphabetQuiz.bestScore.v2';


/* ============================================================
   3. TIME BONUS
   ============================================================

   7 correct answers = 700 points.

   Maximum possible time bonus = 300.

   Therefore maximum possible score = 1000.
   ============================================================ */

function calcTimeBonus(seconds) {

  if (seconds < 20) return 300;

  if (seconds < 25) return 200;

  if (seconds < 30) return 100;

  if (seconds < 35) return 80;

  if (seconds < 40) return 60;

  if (seconds < 45) return 40;

  return 20;
}


/* ============================================================
   4. JAPAN DATE / TIME
   ============================================================ */

/*
   IMPORTANT:

   We deliberately use Asia/Tokyo rather than the player's
   computer timezone.

   This means the daily nickname and leaderboard reset at
   Japanese midnight.
*/

function getJapanDateParts() {

  const formatter =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }
    );

  const parts =
    formatter.formatToParts(new Date());

  const result = {};

  parts.forEach(part => {

    if (part.type !== 'literal') {
      result[part.type] = part.value;
    }

  });

  return result;
}


function getJapanDateKey() {

  const p = getJapanDateParts();

  return `${p.year}-${p.month}-${p.day}`;
}


/*
   Returns milliseconds remaining until the next
   00:00:00 in Japan.

   Using UTC calculation with Japan's current UTC offset
   keeps this correct for Japan Standard Time.
*/

function getMillisecondsUntilJapanMidnight() {

  const now = new Date();

  const parts =
    getJapanDateParts();

  const year =
    Number(parts.year);

  const month =
    Number(parts.month);

  const day =
    Number(parts.day);

  /*
     Japan is UTC+9 and does not use daylight saving time.
  */

  const japanMidnightAsUTC =
    Date.UTC(
      year,
      month - 1,
      day + 1,
      0,
      0,
      0
    );

  const japanMidnightReal =
    japanMidnightAsUTC - (9 * 60 * 60 * 1000);

  return Math.max(
    0,
    japanMidnightReal - now.getTime()
  );
}


function formatCountdown(milliseconds) {

  const totalSeconds =
    Math.max(
      0,
      Math.floor(milliseconds / 1000)
    );

  const hours =
    Math.floor(totalSeconds / 3600);

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60
    );

  const seconds =
    totalSeconds % 60;

  return (
    String(hours).padStart(2, '0') +
    'h ' +
    String(minutes).padStart(2, '0') +
    'm ' +
    String(seconds).padStart(2, '0') +
    's'
  );
}


/* ============================================================
   5. REDUCED MOTION
   ============================================================ */

const prefersReducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;


/* ============================================================
   6. STATE
   ============================================================ */

const state = {

  /* Current player */
  nickname: '',

  nicknameDateKey: '',

  /* Selected mode */
  mode: 'easy',

  /* Current round */
  roundQuestions: [],

  currentIndex: 0,

  score: 0,

  answeredCurrent: false,

  results: [],

  /* Transition lock */
  transitioning: false,

  /* Timer */
  startTime: null,

  elapsedSeconds: null

};


/* ============================================================
   7. DOM REFERENCES
   ============================================================ */

const screens = {

  nickname:
    document.getElementById(
      'nicknameScreen'
    ),

  start:
    document.getElementById(
      'startScreen'
    ),

  game:
    document.getElementById(
      'gameScreen'
    ),

  results:
    document.getElementById(
      'resultsScreen'
    )

};


const nicknameContent =
  document.getElementById(
    'nicknameContent'
  );

const nicknameInput =
  document.getElementById(
    'nicknameInput'
  );

const nicknameError =
  document.getElementById(
    'nicknameError'
  );

const nicknameBtn =
  document.getElementById(
    'nicknameBtn'
  );


const startBtn =
  document.getElementById(
    'startBtn'
  );

const shareBtn =
  document.getElementById(
    'shareBtn'
  );

const changeNicknameBtn =
  document.getElementById(
    'changeNicknameBtn'
  );


const playAgainBtn =
  document.getElementById(
    'playAgainBtn'
  );

const resultsHomeBtn =
  document.getElementById(
    'resultsHomeBtn'
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


const questionCounter =
  document.getElementById(
    'questionCounter'
  );

const scoreCounter =
  document.getElementById(
    'scoreCounter'
  );

const timerPill =
  document.getElementById(
    'timerPill'
  );

const modePill =
  document.getElementById(
    'modePill'
  );


const blackholeBtn =
  document.getElementById(
    'blackholeBtn'
  );


const constellationEl =
  document.getElementById(
    'constellation'
  );


const resultsPlayer =
  document.getElementById(
    'resultsPlayer'
  );

const resultsMode =
  document.getElementById(
    'resultsMode'
  );

const resultsScore =
  document.getElementById(
    'resultsScore'
  );

const resultsTime =
  document.getElementById(
    'resultsTime'
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


const easyLeaderboard =
  document.getElementById(
    'easyLeaderboard'
  );

const mediumLeaderboard =
  document.getElementById(
    'mediumLeaderboard'
  );

const hardLeaderboard =
  document.getElementById(
    'hardLeaderboard'
  );

const championCountdown =
  document.getElementById(
    'championCountdown'
  );


const playerWelcome =
  document.getElementById(
    'playerWelcome'
  );


const autoPlayStatus =
  document.getElementById(
    'autoPlayStatus'
  );


const starField =
  document.getElementById(
    'starField'
  );

const ambientLayer =
  document.getElementById(
    'ambientLayer'
  );

const appShell =
  document.getElementById(
    'appShell'
  );

const warpCanvas =
  document.getElementById(
    'warpCanvas'
  );

const galaxyFlash =
  document.getElementById(
    'galaxyFlash'
  );

const startContent =
  document.getElementById(
    'startContent'
  );

const questionContent =
  document.getElementById(
    'questionContent'
  );

const resultsContent =
  document.getElementById(
    'resultsContent'
  );


/* ============================================================
   8. MODE HELPERS
   ============================================================ */

function getModeName(mode) {

  if (mode === 'medium') {
    return 'MEDIUM';
  }

  if (mode === 'hard') {
    return 'HARD';
  }

  return 'EASY';
}


function getModeBank(mode) {

  if (mode === 'medium') {
    return MEDIUM_QUESTION_BANK;
  }

  if (mode === 'hard') {
    return HARD_QUESTION_BANK;
  }

  return EASY_QUESTION_BANK;
}


/*
   This also allows older questions.js versions using
   QUESTION_BANK to continue working for EASY mode.
*/

function getEasyBank() {

  if (Array.isArray(EASY_QUESTION_BANK)) {
    return EASY_QUESTION_BANK;
  }

  if (Array.isArray(QUESTION_BANK)) {
    return QUESTION_BANK;
  }

  return [];
}


/* ============================================================
   9. STAR FIELD
   ============================================================ */

function buildStarField() {

  starField.innerHTML = '';

  const frag =
    document.createDocumentFragment();

  for (
    let i = 0;
    i < STAR_COUNT;
    i++
  ) {

    const star =
      document.createElement('div');

    const size =
      Math.random() < .15
        ? Math.random() * 2 + 2.5
        : Math.random() * 1.5 + 1;

    const isBig =
      size > 3;

    star.className =
      'star' +
      (isBig ? ' big' : '');

    star.style.left =
      Math.random() * 100 + 'vw';

    star.style.top =
      Math.random() * 100 + 'vh';

    star.style.width =
      size + 'px';

    star.style.height =
      size + 'px';

    star.style.setProperty(
      '--min-o',
      (Math.random() * .25 + .1).toFixed(2)
    );

    star.style.setProperty(
      '--max-o',
      (Math.random() * .4 + .6).toFixed(2)
    );

    star.style.animationDuration =
      (Math.random() * 3 + 2.5).toFixed(2) +
      's';

    star.style.animationDelay =
      (Math.random() * 4).toFixed(2) +
      's';

    frag.appendChild(star);
  }

  starField.appendChild(frag);
}


/* ============================================================
   10. AMBIENT SHOOTING STARS
   ============================================================ */

function randRange(min, max) {

  return (
    Math.random() *
      (max - min) +
    min
  );
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

  const el =
    document.createElement('div');

  el.className =
    'shooting-star';

  const isNear =
    Math.random() < .3;

  const length =
    isNear
      ? randRange(55,90)
      : randRange(22,42);

  const distance =
    isNear
      ? randRange(150,230)
      : randRange(80,150);

  const duration =
    isNear
      ? randRange(550,850)
      : randRange(420,680);

  const peakOpacity =
    isNear
      ? 1
      : randRange(.4,.65);

  const thickness =
    isNear
      ? 2.2
      : 1.2;

  const startTop =
    randRange(-5,55);

  const startLeft =
    randRange(0,100);

  const angle =
    randRange(15,35) *
    (Math.random() < .75 ? 1 : -1);

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

  el.addEventListener(
    'animationend',
    () => {

      el.remove();

      activeShootingStarCount--;

    }
  );

  ambientLayer.appendChild(el);
}


function scheduleShootingStars() {

  const delay =
    randRange(
      SHOOTING_STAR_MIN_DELAY_MS,
      SHOOTING_STAR_MAX_DELAY_MS
    );

  setTimeout(
    () => {

      spawnShootingStar();

      scheduleShootingStars();

    },
    delay
  );
}


/* ============================================================
   11. FLOATING SATELLITES
   ============================================================ */

let activeSatelliteCount = 0;


function spawnFloatingSatellite() {

  if (!ambientLayer) return;

  if (
    activeSatelliteCount >=
    FLOATING_SATELLITE_MAX_CONCURRENT
  ) {
    return;
  }

  const el =
    document.createElement('div');

  el.className =
    'floating-satellite';

  el.textContent =
    '🛰️';

  const goingRight =
    Math.random() < .5;

  const goingDown =
    Math.random() < .5;

  const dx =
    (goingRight ? 1 : -1) *
    randRange(
      window.innerWidth * .35,
      window.innerWidth * .65
    );

  const dy =
    (goingDown ? 1 : -1) *
    randRange(
      window.innerHeight * .15,
      window.innerHeight * .35
    );

  const startLeft =
    goingRight
      ? randRange(-5,35)
      : randRange(65,100);

  const startTop =
    goingDown
      ? randRange(5,35)
      : randRange(55,90);

  const spin =
    (Math.random() < .5 ? 1 : -1) *
    randRange(180,420);

  const duration =
    randRange(10000,18000);

  const size =
    randRange(20,32);

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

  el.addEventListener(
    'animationend',
    () => {

      el.remove();

      activeSatelliteCount--;

    }
  );

  ambientLayer.appendChild(el);
}


function scheduleFloatingSatellites() {

  const delay =
    randRange(
      FLOATING_SATELLITE_MIN_DELAY_MS,
      FLOATING_SATELLITE_MAX_DELAY_MS
    );

  setTimeout(
    () => {

      spawnFloatingSatellite();

      scheduleFloatingSatellites();

    },
    delay
  );
}


/* ============================================================
   12. WARP CANVAS
   ============================================================ */

let warpCtx = null;

let warpStars = [];

let warpMaxRadius = 0;

let warpRAF = null;

let warpAnimStart = 0;

let warpAccelMsActive =
  WARP_ACCEL_MS;


function setupWarpCanvas() {

  if (!warpCanvas.getContext) {
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
        : Math.random() *
          warpMaxRadius *
          .5,

    spd:
      .6 +
      Math.random() * 1.4,

    hue:
      roll < .14
        ? 'gold'
        : (
          roll < .26
            ? 'teal'
            : 'white'
        )

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

  for (
    let i = 0;
    i < total;
    i++
  ) {

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
      elapsed /
      warpAccelMsActive,
      1
    );

  const eased =
    accelProgress *
    accelProgress;

  const speedFactor =
    .35 +
    eased * 5.5;

  const w =
    window.innerWidth;

  const h =
    window.innerHeight;

  const cx =
    w / 2;

  const cy =
    h / 2;

  warpCtx.fillStyle =
    'rgba(6,8,24,.28)';

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
      (2 + star.r * .045);

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
      .6 +
      ratio * 3.6;

    const alpha =
      Math.min(
        1,
        .2 +
        ratio * 1.1
      );

    let color;

    if (star.hue === 'gold') {

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

  warpRAF =
    requestAnimationFrame(
      warpFrame
    );
}


function stopWarpAnimation() {

  if (warpRAF) {

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
   13. GALAXY ENTRANCE
   ============================================================ */

function beginGalaxyEntrance() {

  if (state.transitioning) {
    return;
  }

  state.transitioning =
    true;

  startBtn.disabled =
    true;

  /*
     Timer starts when Start Mission is clicked.
  */

  startRoundTimer();

  if (
    prefersReducedMotion ||
    !warpCtx
  ) {

    appShell.classList.add(
      'transition-hide'
    );

    setTimeout(
      () => {

        startGame();

        appShell.classList.remove(
          'transition-hide'
        );

        state.transitioning =
          false;

        startBtn.disabled =
          false;

      },
      300
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

      startBtn.disabled =
        false;

    },
    WARP_ACCEL_MS +
    WARP_HOLD_MS +
    120 +
    WARP_EXIT_MS
  );
}


/* ============================================================
   14. QUESTION TRANSITION
   ============================================================ */

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


  setTimeout(
    () => {

      onSwap();

      if (
        exitEl !== enterEl
      ) {

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

      requestAnimationFrame(
        () => {

          enterEl.classList.remove(
            'q-enter'
          );

        }
      );

    },
    QUESTION_EXIT_MS
  );
}


/* ============================================================
   15. TIMER
   ============================================================ */

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
    Math.floor(
      s / 60
    );

  const sec =
    s % 60;

  return (
    m +
    ':' +
    String(sec).padStart(2,'0')
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

  if (
    gameTimerIntervalId
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
    formatTime(
      liveSeconds
    );
}


/* ============================================================
   16. NICKNAME STORAGE
   ============================================================ */

function loadDailyNickname() {

  try {

    const nickname =
      localStorage.getItem(
        NICKNAME_STORAGE_KEY
      );

    const savedDate =
      localStorage.getItem(
        NICKNAME_DATE_KEY
      );

    const today =
      getJapanDateKey();

    if (
      nickname &&
      savedDate === today
    ) {

      state.nickname =
        nickname;

      state.nicknameDateKey =
        savedDate;

      return nickname;
    }

    /*
       New Japanese day:
       old nickname is invalid.
    */

    localStorage.removeItem(
      NICKNAME_STORAGE_KEY
    );

    localStorage.removeItem(
      NICKNAME_DATE_KEY
    );

  } catch (error) {

    console.warn(
      'Nickname storage unavailable.',
      error
    );

  }

  return null;
}


function saveDailyNickname(
  nickname
) {

  const today =
    getJapanDateKey();

  state.nickname =
    nickname;

  state.nicknameDateKey =
    today;

  try {

    localStorage.setItem(
      NICKNAME_STORAGE_KEY,
      nickname
    );

    localStorage.setItem(
      NICKNAME_DATE_KEY,
      today
    );

  } catch (error) {

    console.warn(
      'Could not save nickname.',
      error
    );
  }
}


function showNicknameScreen() {

  showScreen(
    'nickname'
  );

  nicknameInput.value =
    '';

  nicknameError.textContent =
    '';

  setTimeout(
    () => nicknameInput.focus(),
    100
  );
}


/* ============================================================
   17. SCREEN NAVIGATION
   ============================================================ */

function showScreen(name) {

  Object.values(
    screens
  ).forEach(
    screen => {

      screen.classList.remove(
        'active'
      );

    }
  );

  screens[name].classList.add(
    'active'
  );
}


/* ============================================================
   18. START SCREEN
   ============================================================ */

function updateStartScreen() {

  playerWelcome.textContent =
    `🚀 Ready for launch, ${state.nickname}!`;

  document
    .querySelectorAll('.mode-btn')
    .forEach(btn => {

      btn.classList.toggle(
        'selected',
        btn.dataset.mode ===
        state.mode
      );

    });
}


/* ============================================================
   19. QUESTION SELECTION
   ============================================================ */

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
    ] =
    [
      arr[j],
      arr[i]
    ];
  }

  return arr;
}


function pickRoundQuestions() {

  const bank =
    getModeBank(
      state.mode
    );

  return shuffle(
    bank
  ).slice(
    0,
    QUESTIONS_PER_GAME
  );
}


/* ============================================================
   20. CONSTELLATION
   ============================================================ */

function renderConstellation() {

  const total =
    state.roundQuestions.length;

  const width = 600;

  const height = 54;

  const padding = 30;

  const step =
    total > 1
      ? (
        width -
        padding * 2
      ) /
      (total - 1)
      : 0;

  const y =
    height / 2;

  let pathD =
    `M ${padding} ${y}`;

  let nodesSvg =
    '';

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
      `<circle
        class="${cls}"
        cx="${x}"
        cy="${y}"
        r="${r}">
      </circle>`;
  }


  constellationEl.innerHTML =
    `
      <svg
        viewBox="0 0 ${width} ${height}"
        preserveAspectRatio="xMidYMid meet"
      >
        <path
          class="constellation-line"
          d="${pathD}"
        ></path>

        ${nodesSvg}

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
      ? (
        (
          padding +
          step *
          progressIndex
        ) /
        width
      ) *
      100
      : 50;

  rocket.style.left =
    xPercent + '%';
}


/* ============================================================
   21. START GAME
   ============================================================ */

function startGame() {

  state.roundQuestions =
    pickRoundQuestions();

  state.currentIndex =
    0;

  state.score =
    0;

  state.results =
    [];

  state.answeredCurrent =
    false;

  /*
     Do NOT restart the timer here.

     The timer already started when the player clicked
     Start Mission.
  */

  showScreen(
    'game'
  );

  modePill.textContent =
    getModeName(
      state.mode
    );

  renderQuestion();
}


/* ============================================================
   22. QUESTION RENDERING
   ============================================================ */

let questionAudioRunId = 0;

let autoNextTimeoutId = null;


function cancelQuestionAudioSequence() {

  questionAudioRunId++;

  if (autoNextTimeoutId) {

    clearTimeout(
      autoNextTimeoutId
    );

    autoNextTimeoutId =
      null;
  }

  letterAudio.pause();

  letterAudio.currentTime =
    0;

  playAudioBtn.classList.remove(
    'playing'
  );
}


function renderQuestion() {

  state.answeredCurrent =
    false;

  cancelQuestionAudioSequence();

  const total =
    state.roundQuestions.length;

  const q =
    state.roundQuestions[
      state.currentIndex
    ];


  questionCounter.textContent =
    `Question ${
      state.currentIndex + 1
    } / ${total}`;


  scoreCounter.textContent =
    `Score: ${
      state.score
    } / ${
      state.currentIndex
    }`;


  renderConstellation();


  feedbackEl.textContent =
    '';

  feedbackEl.className =
    'feedback';


  autoPlayStatus.textContent =
    '🔊 Listen carefully...';


  letterAudio.src =
    q.audio;


  /*
     Build answer choices.
  */

  optionsGrid.innerHTML =
    '';

  const shuffledOptions =
    shuffle(
      q.options
    );


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
        () => {

          handleAnswer(
            letter,
            btn,
            q.correctAnswer
          );

        }
      );

      optionsGrid.appendChild(
        btn
      );

    }
  );


  /*
     AUTOMATIC AUDIO TWICE.

     First play:
       immediately

     Second play:
       2 seconds AFTER the first audio finishes.

     If the audio itself is very long, the second playback
     naturally waits until it finishes + 2 seconds.
  */

  playAutomaticAudioTwice(
    q
  );
}


/* ============================================================
   23. AUTOMATIC AUDIO TWICE
   ============================================================ */

function playAutomaticAudioTwice(
  question
) {

  const runId =
    ++questionAudioRunId;

  let playCount =
    0;

  function playOnce() {

    if (
      runId !==
      questionAudioRunId
    ) {

      return;
    }

    playCount++;

    letterAudio.currentTime =
      0;

    playAudioBtn.classList.add(
      'playing'
    );

    autoPlayStatus.textContent =
      playCount === 1
        ? '🔊 Listening...'
        : '🔊 Listen again...';


    const promise =
      letterAudio.play();


    if (
      promise &&
      promise.catch
    ) {

      promise.catch(
        () => {

          /*
             Browser blocked autoplay.

             The player can still press the
             Play Sound button manually.
          */

          playAudioBtn.classList.remove(
            'playing'
          );

          autoPlayStatus.textContent =
            '👆 Tap Play Sound to hear it';

        }
      );
    }
  }


  letterAudio.onended =
    () => {

      if (
        runId !==
        questionAudioRunId
      ) {

        return;
      }

      playAudioBtn.classList.remove(
        'playing'
      );

      if (
        playCount < 2
      ) {

        autoPlayStatus.textContent =
          '⏳ Get ready...';

        setTimeout(
          () => {

            if (
              runId ===
              questionAudioRunId
            ) {

              playOnce();
            }

          },
          AUTO_AUDIO_GAP_MS
        );

      } else {

        autoPlayStatus.textContent =
          '🔊 Want to hear it again? Tap Play Sound';

      }

    };


  /*
     First play starts immediately.
  */

  playOnce();
}


/* ============================================================
   24. MANUAL PLAY SOUND
   ============================================================ */

playAudioBtn.addEventListener(
  'click',
  () => {

    /*
       Manual playback cancels nothing.

       The player can press this at any time.

       The automatic two-play sequence is allowed to
       finish independently, but this manual play simply
       restarts the sound from the beginning.
    */

    letterAudio.currentTime =
      0;

    playAudioBtn.classList.add(
      'playing'
    );

    autoPlayStatus.textContent =
      '🔊 Listening...';


    const promise =
      letterAudio.play();


    if (
      promise &&
      promise.catch
    ) {

      promise.catch(
        () => {

          playAudioBtn.classList.remove(
            'playing'
          );

        }
      );
    }
  }
);


letterAudio.addEventListener(
  'ended',
  () => {

    playAudioBtn.classList.remove(
      'playing'
    );

  }
);


/* ============================================================
   25. HANDLE ANSWER
   ============================================================ */

function handleAnswer(
  selectedLetter,
  btnEl,
  correctLetter
) {

  /*
     Prevent multiple answers.
  */

  if (
    state.answeredCurrent
  ) {

    return;
  }

  state.answeredCurrent =
    true;


  /*
     Stop automatic audio sequence.
  */

  questionAudioRunId++;


  if (autoNextTimeoutId) {

    clearTimeout(
      autoNextTimeoutId
    );

    autoNextTimeoutId =
      null;
  }


  letterAudio.pause();

  letterAudio.currentTime =
    0;

  playAudioBtn.classList.remove(
    'playing'
  );


  const isCorrect =
    selectedLetter ===
    correctLetter;


  state.results[
    state.currentIndex
  ] =
    isCorrect;


  const allOptionButtons =
    optionsGrid.querySelectorAll(
      '.option-btn'
    );


  allOptionButtons.forEach(
    button => {

      button.disabled =
        true;

      if (
        button.textContent ===
        correctLetter
      ) {

        button.classList.add(
          'correct'
        );

      } else if (
        button ===
        btnEl
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


  if (isCorrect) {

    state.score++;

    feedbackEl.textContent =
      '✓ Correct!';

    feedbackEl.classList.add(
      'correct-text'
    );

  } else {

    feedbackEl.textContent =
      `✗ Try again! It was "${correctLetter}".`;

    feedbackEl.classList.add(
      'incorrect-text'
    );

  }


  feedbackEl.classList.add(
    'show'
  );


  scoreCounter.textContent =
    `Score: ${
      state.score
    } / ${
      state.currentIndex + 1
    }`;


  renderConstellation();


  /*
     If this is the final question,
     freeze the timer immediately.
  */

  const total =
    state.roundQuestions.length;

  const isLastQuestion =
    state.currentIndex + 1 >=
    total;


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
     IMPORTANT:

     There is NO Next button anymore.

     The game waits exactly 2 seconds after the
     answer is selected, then automatically moves on.
  */

  autoNextTimeoutId =
    setTimeout(
      () => {

        autoNextTimeoutId =
          null;

        moveToNextQuestion();

      },
      AUTO_NEXT_DELAY_MS
    );
}


/* ============================================================
   26. AUTOMATIC NEXT QUESTION
   ============================================================ */

function moveToNextQuestion() {

  if (
    state.transitioning
  ) {

    return;
  }

  state.transitioning =
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

      if (
        isLastQuestion
      ) {

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

    },
    QUESTION_EXIT_MS +
    QUESTION_ENTER_MS +
    60
  );
}


/* ============================================================
   27. DAILY LEADERBOARD STORAGE
   ============================================================ */

function getEmptyLeaderboards() {

  return {

    dateKey:
      getJapanDateKey(),

    easy: [],

    medium: [],

    hard: []

  };
}


function loadLeaderboards() {

  try {

    const raw =
      localStorage.getItem(
        LEADERBOARD_STORAGE_KEY
      );

    if (!raw) {

      return getEmptyLeaderboards();

    }

    const parsed =
      JSON.parse(raw);

    /*
       If it is yesterday's leaderboard,
       it is automatically discarded.
    */

    if (
      parsed.dateKey !==
      getJapanDateKey()
    ) {

      return getEmptyLeaderboards();

    }


    return {

      dateKey:
        parsed.dateKey,

      easy:
        Array.isArray(parsed.easy)
          ? parsed.easy
          : [],

      medium:
        Array.isArray(parsed.medium)
          ? parsed.medium
          : [],

      hard:
        Array.isArray(parsed.hard)
          ? parsed.hard
          : []

    };

  } catch (error) {

    console.warn(
      'Could not load leaderboard.',
      error
    );

    return getEmptyLeaderboards();
  }
}


function saveLeaderboards(
  data
) {

  try {

    localStorage.setItem(
      LEADERBOARD_STORAGE_KEY,
      JSON.stringify(data)
    );

  } catch (error) {

    console.warn(
      'Could not save leaderboard.',
      error
    );
  }
}


/* ============================================================
   28. LEADERBOARD SORTING
   ============================================================

   Primary:
      Highest score

   Secondary:
      Fastest time

   Therefore:

      1000 points / 25 seconds
      beats
      1000 points / 31 seconds

   even though both have the same score.
   ============================================================ */

function sortLeaderboard(
  entries
) {

  return entries
    .slice()
    .sort(
      (a,b) => {

        if (
          b.points !==
          a.points
        ) {

          return (
            b.points -
            a.points
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
   29. ADD RESULT TO LEADERBOARD
   ============================================================ */

function addScoreToLeaderboard(
  mode,
  nickname,
  points,
  timeSeconds
) {

  const data =
    loadLeaderboards();


  /*
     Ensure today's date.
  */

  data.dateKey =
    getJapanDateKey();


  const entry = {

    nickname:
      nickname,

    points:
      Math.max(
        0,
        Math.min(
          1000,
          Math.round(points)
        )
      ),

    timeSeconds:
      Number(
        timeSeconds
      ),

    timeText:
      formatTime(
        timeSeconds
      ),

    timestamp:
      Date.now()

  };


  data[mode].push(
    entry
  );


  /*
     Keep only the best score for a particular
     nickname/mode combination.

     This means if "Alex" plays Easy 20 times,
     the leaderboard doesn't become 20 lines of Alex.

     Instead, Alex's BEST result remains.
  */

  const grouped =
    new Map();


  data[mode].forEach(
    item => {

      const key =
        item.nickname
          .trim()
          .toLowerCase();

      const existing =
        grouped.get(key);


      if (
        !existing ||
        item.points >
          existing.points ||
        (
          item.points ===
          existing.points &&
          item.timeSeconds <
            existing.timeSeconds
        )
      ) {

        grouped.set(
          key,
          item
        );
      }

    }
  );


  data[mode] =
    sortLeaderboard(
      Array.from(
        grouped.values()
      )
    );


  /*
     Keep top 20 players per mode.
  */

  data[mode] =
    data[mode].slice(
      0,
      20
    );


  saveLeaderboards(
    data
  );

  return data;
}


/* ============================================================
   30. BEST SCORE
   ============================================================ */

function loadBestScore() {

  try {

    const raw =
      localStorage.getItem(
        BEST_SCORE_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed =
      JSON.parse(raw);


    if (
      parsed.dateKey !==
      getJapanDateKey()
    ) {

      return null;

    }


    if (
      typeof parsed.points !==
        'number'
    ) {

      return null;

    }


    return parsed;

  } catch (error) {

    return null;
  }
}


function saveBestScore(
  points,
  timeSeconds,
  mode
) {

  try {

    localStorage.setItem(
      BEST_SCORE_KEY,
      JSON.stringify({

        points:
          points,

        timeSeconds:
          timeSeconds,

        mode:
          mode,

        dateKey:
          getJapanDateKey(),

        savedAt:
          Date.now()

      })
    );

  } catch (error) {

    console.warn(
      'Could not save best score.',
      error
    );
  }
}


/* ============================================================
   31. SHOW RESULTS
   ============================================================ */

function showResults() {

  const total =
    state.roundQuestions.length;


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
    Math.min(
      1000,
      correctPoints +
      timeBonus
    );


  resultsPlayer.textContent =
    `🚀 ${state.nickname}`;


  resultsMode.textContent =
    `${getModeName(state.mode)} MISSION`;


  resultsScore.textContent =
    `${totalPoints} POINTS`;


  resultsTime.textContent =
    `⏱ Time: ${formatTime(
      timeTakenSeconds
    )}`;


  const ratio =
    state.score / total;


  let message;


  if (
    ratio === 1
  ) {

    message =
      'Perfect mission — you heard every answer!';

  } else if (
    ratio >= .7
  ) {

    message =
      'Awesome listening, space explorer!';

  } else if (
    ratio >= .4
  ) {

    message =
      'Nice work! Keep practicing and keep exploring.';

  } else {

    message =
      'Good try! Blast off again and listen carefully!';

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
     Daily best score.
  */

  const previousBest =
    loadBestScore();


  const isNewBest =
    !previousBest ||
    totalPoints >
      previousBest.points ||
    (
      totalPoints ===
      previousBest.points &&
      timeTakenSeconds <
        previousBest.timeSeconds
    );


  if (
    isNewBest
  ) {

    saveBestScore(
      totalPoints,
      timeTakenSeconds,
      state.mode
    );

  }


  const best =
    isNewBest
      ? {
          points:
            totalPoints,

          timeSeconds:
            timeTakenSeconds
        }
      : previousBest;


  resultsBest.textContent =
    (
      isNewBest
        ? "🏆 Today's New Best! "
        : "🏆 Today's Best: "
    ) +
    best.points +
    ' POINTS';


  resultsBest.classList.toggle(
    'new-best',
    isNewBest
  );


  /*
     Add this result to the selected mode's
     daily leaderboard.
  */

  addScoreToLeaderboard(
    state.mode,
    state.nickname,
    totalPoints,
    timeTakenSeconds
  );


  /*
     Refresh all three leaderboards.
  */

  renderAllLeaderboards();


  showScreen(
    'results'
  );

}


/* ============================================================
   32. RENDER LEADERBOARD
   ============================================================ */

function renderLeaderboard(
  element,
  entries
) {

  element.innerHTML =
    '';


  if (
    !entries ||
    entries.length === 0
  ) {

    const empty =
      document.createElement(
        'div'
      );

    empty.className =
      'empty-board';

    empty.textContent =
      'No explorers yet — be the first CHAMPION! 🚀';

    element.appendChild(
      empty
    );

    return;
  }


  entries
    .slice(0,10)
    .forEach(
      (entry,index) => {

        const row =
          document.createElement(
            'div'
          );

        row.className =
          'leaderboard-row';


        const isCurrent =
          entry.nickname
            .trim()
            .toLowerCase() ===
          state.nickname
            .trim()
            .toLowerCase();


        if (
          isCurrent
        ) {

          row.classList.add(
            'current-player'
          );
        }


        const rank =
          document.createElement(
            'div'
          );

        rank.className =
          'rank';


        if (index === 0) {

          rank.textContent =
            '👑';

        } else if (
          index === 1
        ) {

          rank.textContent =
            '🥈';

        } else if (
          index === 2
        ) {

          rank.textContent =
            '🥉';

        } else {

          rank.textContent =
            String(index + 1);

        }


        const player =
          document.createElement(
            'div'
          );


        const name =
          document.createElement(
            'div'
          );

        name.className =
          'player-name';

        name.textContent =
          entry.nickname;


        const time =
          document.createElement(
            'span'
          );

        time.className =
          'player-time';

        time.textContent =
          `BEST SCORE TIME: ${
            formatTime(
              entry.timeSeconds
            )
          }`;


        player.appendChild(
          name
        );

        player.appendChild(
          time
        );


        const score =
          document.createElement(
            'div'
          );

        score.className =
          'player-score';

        score.textContent =
          `${entry.points}`;


        row.appendChild(
          rank
        );

        row.appendChild(
          player
        );

        row.appendChild(
          score
        );


        element.appendChild(
          row
        );

      }
    );
}


/* ============================================================
   33. RENDER ALL LEADERBOARDS
   ============================================================ */

function renderAllLeaderboards() {

  const data =
    loadLeaderboards();


  renderLeaderboard(
    easyLeaderboard,
    sortLeaderboard(
      data.easy
    )
  );


  renderLeaderboard(
    mediumLeaderboard,
    sortLeaderboard(
      data.medium
    )
  );


  renderLeaderboard(
    hardLeaderboard,
    sortLeaderboard(
      data.hard
    )
  );


  updateChampionCountdown();
}


/* ============================================================
   34. CHAMPION COUNTDOWN
   ============================================================ */

let countdownIntervalId =
  null;


function updateChampionCountdown() {

  const remaining =
    getMillisecondsUntilJapanMidnight();


  championCountdown.textContent =
    `You have ${
      formatCountdown(
        remaining
      )
    } left to become the new CHAMPION`;
}


function startChampionCountdown() {

  if (
    countdownIntervalId
  ) {

    clearInterval(
      countdownIntervalId
    );
  }


  updateChampionCountdown();


  countdownIntervalId =
    setInterval(
      () => {

        /*
           At Japanese midnight, refresh the
           nickname and leaderboard state.

           The current nickname expires automatically.
        */

        const nickname =
          loadDailyNickname();


        if (!nickname) {

          /*
             New day.

             Stop showing the old player's name.
          */

          state.nickname =
            '';

          state.nicknameDateKey =
            '';

          clearInterval(
            countdownIntervalId
          );

          countdownIntervalId =
            null;

          showNicknameScreen();

          return;
        }


        renderAllLeaderboards();

      },
      1000
    );
}


/* ============================================================
   35. CHANGE NICKNAME
   ============================================================ */

function changeNicknameNow() {

  /*
     This button does NOT allow the player to change their
     nickname during the same Japanese day.

     The only way to change it is after midnight.

     Therefore we explain this rather than accidentally
     allowing multiple identities on the daily leaderboard.
  */

  const today =
    getJapanDateKey();


  if (
    state.nicknameDateKey ===
    today
  ) {

    nicknameError.textContent =
      `Your explorer name is locked until midnight in Japan.`;

    return;
  }


  showNicknameScreen();
}


/* ============================================================
   36. NICKNAME SUBMISSION
   ============================================================ */

function submitNickname() {

  const nickname =
    nicknameInput.value
      .trim();


  nicknameError.textContent =
    '';


  if (
    nickname.length < 1
  ) {

    nicknameError.textContent =
      'Please enter a nickname.';

    nicknameInput.focus();

    return;
  }


  if (
    nickname.length > 15
  ) {

    nicknameError.textContent =
      'Your nickname can be up to 15 characters.';

    nicknameInput.focus();

    return;
  }


  /*
     Remove potentially confusing whitespace.
  */

  const cleaned =
    nickname
      .replace(/\s+/g,' ')
      .trim();


  saveDailyNickname(
    cleaned
  );


  updateStartScreen();


  /*
     Show the existing START MISSION page.
  */

  showScreen(
    'start'
  );
}


/* ============================================================
   37. MODE SELECTION
   ============================================================ */

document
  .querySelectorAll('.mode-btn')
  .forEach(
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
            button.dataset.mode;


          document
            .querySelectorAll(
              '.mode-btn'
            )
            .forEach(
              btn => {

                btn.classList.toggle(
                  'selected',
                  btn.dataset.mode ===
                  state.mode
                );

              }
            );

        }
      );

    }
  );


/* ============================================================
   38. PLAY AGAIN
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


    startRoundTimer();


    playGalaxyZoomTransition(
      resultsContent,
      questionContent,
      startGame
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
   39. BLACK HOLE / HOME
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


    stopGameTimer();

    cancelQuestionAudioSequence();


    playGalaxyZoomTransition(
      questionContent,
      startContent,
      () => {

        updateStartScreen();

        showScreen(
          'start'
        );

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
   40. RESULTS HOME BUTTON
   ============================================================ */

resultsHomeBtn.addEventListener(
  'click',
  () => {

    if (
      state.transitioning
    ) {

      return;
    }


    stopGameTimer();


    playGalaxyZoomTransition(
      resultsContent,
      startContent,
      () => {

        updateStartScreen();

        showScreen(
          'start'
        );

      },
      'q-suck'
    );

  }
);


/* ============================================================
   41. SHARE BUTTON
   ============================================================ */

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


  setTimeout(
    () => {

      shareBtn.textContent =
        original;

      shareBtn.disabled =
        false;

    },
    durationMs || 2000
  );
}


if (shareBtn) {

  shareBtn.addEventListener(
    'click',
    async () => {

      const shareData = {

        title:
          document.title,

        text:
          'Come play S.P.A.C.E. ALPHABETS with me! 🚀',

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

          /*
             Player cancelled sharing.
          */

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

          /*
             Fall through.
          */

        }
      }


      window.prompt(
        'Copy this link to share:',
        shareData.url
      );

    }
  );

}


/* ============================================================
   42. CLICK SOUND
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
    now + .15
  );


  gain.gain.setValueAtTime(
    .16,
    now
  );


  gain.gain.exponentialRampToValueAtTime(
    .001,
    now + .16
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
    now + .18
  );
}


document.addEventListener(
  'click',
  event => {

    const btn =
      event.target.closest(
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


/* ============================================================
   43. NICKNAME ENTER KEY
   ============================================================ */

nicknameInput.addEventListener(
  'keydown',
  event => {

    if (
      event.key ===
      'Enter'
    ) {

      submitNickname();

    }

  }
);


/* ============================================================
   44. EVENT WIRING
   ============================================================ */

nicknameBtn.addEventListener(
  'click',
  submitNickname
);


startBtn.addEventListener(
  'click',
  beginGalaxyEntrance
);


/*
   This is intentionally NOT a free nickname changer.

   The name is locked for the entire Japanese calendar day.
*/

changeNicknameBtn.addEventListener(
  'click',
  () => {

    nicknameError.textContent =
      '';

    showNicknameScreen();

  }
);


/* ============================================================
   45. INITIALIZATION
   ============================================================ */

function initializeGame() {

  buildStarField();

  setupWarpCanvas();


  /*
     Load today's nickname.

     If there isn't one, nickname screen is shown.
     Otherwise we go directly to the existing START screen.
  */

  const savedNickname =
    loadDailyNickname();


  if (
    savedNickname
  ) {

    state.nickname =
      savedNickname;

    state.nicknameDateKey =
      getJapanDateKey();

    updateStartScreen();

    showScreen(
      'start'
    );

  } else {

    showNicknameScreen();

  }


  startChampionCountdown();


  if (
    !prefersReducedMotion
  ) {

    scheduleShootingStars();

    scheduleFloatingSatellites();

  }

}


initializeGame();
