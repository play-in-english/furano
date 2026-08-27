/* ============================================================
   ALPHABET LISTENING QUIZ — GAME LOGIC
   ============================================================
   Features:
   - 7 random questions
   - Alphabet listening audio
   - Galaxy entrance / question transitions
   - Black-hole HOME button during game
   - Mission timer
   - Correct-answer points
   - Time bonus
   - Best score saved in localStorage
   - Final TOTAL SCORES screen
   ============================================================ */


/* ============================================================
   SETTINGS
   ============================================================ */

const QUESTIONS_PER_GAME = 7;
const STAR_COUNT = 90;


/* ------------------------------------------------------------
   AMBIENT SHOOTING STARS & ROCKETS
   ------------------------------------------------------------ */

const SHOOTING_STAR_MIN_DELAY_MS = 2200;
const SHOOTING_STAR_MAX_DELAY_MS = 5200;

const FLOATING_ROCKET_MIN_DELAY_MS = 4500;
const FLOATING_ROCKET_MAX_DELAY_MS = 9500;


/* ------------------------------------------------------------
   GALAXY ENTRANCE TRANSITION
   ------------------------------------------------------------ */

const WARP_STAR_COUNT = 220;
const WARP_ACCEL_MS = 1600;
const WARP_HOLD_MS = 250;
const WARP_EXIT_MS = 650;


/* ------------------------------------------------------------
   QUESTION-TO-QUESTION GALAXY TRANSITION
   ------------------------------------------------------------ */

const QUESTION_WARP_STAR_COUNT = 70;
const QUESTION_WARP_ACCEL_MS = 450;

const QUESTION_EXIT_MS = 320;
const QUESTION_ENTER_MS = 360;


/* ============================================================
   MOTION PREFERENCE
   ============================================================ */

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;


/* ============================================================
   LOCAL STORAGE
   ============================================================ */

const BEST_SCORE_KEY = 'alphabetListeningQuizBestScore';
const BEST_TIME_KEY = 'alphabetListeningQuizBestTime';


/* ============================================================
   GAME STATE
   ============================================================ */

const state = {

  // Questions selected for this round
  roundQuestions: [],

  // Current question index
  currentIndex: 0,

  // Number of correct answers
  correctAnswers: 0,

  // Total points earned from correct answers
  answerPoints: 0,

  // Time bonus earned
  timeBonus: 0,

  // Final total score
  totalPoints: 0,

  // Whether current question has been answered
  answeredCurrent: false,

  // True/false results for constellation
  results: [],

  // Prevent double transitions
  transitioning: false,

  // Timer
  timerStartedAt: null,
  timerStoppedAt: null,
  elapsedSeconds: 0,

  // Whether the timer is currently running
  timerRunning: false,

  // Interval ID
  timerInterval: null

};


/* ============================================================
   DOM REFERENCES
   ============================================================ */

const screens = {

  start: document.getElementById('startScreen'),

  game: document.getElementById('gameScreen'),

  results: document.getElementById('resultsScreen')

};


const startBtn =
  document.getElementById('startBtn');

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

const constellationEl =
  document.getElementById('constellation');

const resultsScore =
  document.getElementById('resultsScore');

const resultsMsg =
  document.getElementById('resultsMsg');

const resultsStars =
  document.getElementById('resultsStars');

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

const questionContent =
  document.getElementById('questionContent');

const resultsContent =
  document.getElementById('resultsContent');


/* ============================================================
   CREATE / FIND TIMER ELEMENT
   ============================================================ */

let timerEl = document.getElementById('gameTimer');

if (!timerEl) {

  timerEl = document.createElement('div');

  timerEl.id = 'gameTimer';

  timerEl.setAttribute('aria-label', 'Mission time');

  timerEl.textContent = '00:00';

  /*
     Put the timer near the score area.

     If the new HTML already has a score/timer container,
     this will try to use it.
  */

  const scoreArea =
    scoreCounter ? scoreCounter.parentElement : null;

  if (scoreArea) {

    scoreArea.insertBefore(timerEl, scoreCounter);

  } else if (screens.game) {

    screens.game.prepend(timerEl);

  }

}


/* ============================================================
   CREATE / FIND HOME BLACK HOLE BUTTON
   ============================================================ */

let homeBlackhole =
  document.getElementById('homeBlackhole');


/*
   If the HTML already contains the black-hole button,
   use it.

   If it doesn't, create it automatically so the game
   will still work.
*/

if (!homeBlackhole) {

  homeBlackhole = document.createElement('button');

  homeBlackhole.id = 'homeBlackhole';

  homeBlackhole.type = 'button';

  homeBlackhole.className = 'home-blackhole';

  homeBlackhole.setAttribute(
    'aria-label',
    'Return to homepage'
  );

  homeBlackhole.setAttribute(
    'title',
    'Return to homepage'
  );

  homeBlackhole.innerHTML = `
    <span class="blackhole-visual" aria-hidden="true">🕳️</span>
  `;


  /*
     Place it beside the question counter.
  */

  if (questionCounter) {

    const questionHeader =
      questionCounter.parentElement;

    if (questionHeader) {

      questionHeader.insertBefore(
        homeBlackhole,
        questionCounter
      );

    }

  }

}


/* ============================================================
   BEST SCORE FUNCTIONS
   ============================================================ */

function getBestScore() {

  const saved =
    localStorage.getItem(BEST_SCORE_KEY);

  if (saved === null) {
    return 0;
  }

  const number =
    Number(saved);

  return Number.isFinite(number) ? number : 0;

}


function getBestTime() {

  const saved =
    localStorage.getItem(BEST_TIME_KEY);

  if (saved === null) {
    return null;
  }

  const number =
    Number(saved);

  return Number.isFinite(number) ? number : null;

}


function saveBestScore() {

  const oldBest =
    getBestScore();

  const oldBestTime =
    getBestTime();


  /*
     Higher total points = better score.
  */

  if (state.totalPoints > oldBest) {

    localStorage.setItem(
      BEST_SCORE_KEY,
      String(state.totalPoints)
    );

    localStorage.setItem(
      BEST_TIME_KEY,
      String(state.elapsedSeconds)
    );

    return true;

  }


  /*
     If total points are exactly tied,
     the faster time becomes the better result.
  */

  if (
    state.totalPoints === oldBest &&
    (
      oldBestTime === null ||
      state.elapsedSeconds < oldBestTime
    )
  ) {

    localStorage.setItem(
      BEST_TIME_KEY,
      String(state.elapsedSeconds)
    );

    return true;

  }


  return false;

}


/* ============================================================
   TIME FORMATTING
   ============================================================ */

function formatTime(totalSeconds) {

  const seconds =
    Math.max(0, Math.floor(totalSeconds));

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  return (
    String(minutes).padStart(2, '0') +
    ':' +
    String(remainingSeconds).padStart(2, '0')
  );

}


/* ============================================================
   TIMER
   ============================================================ */

function updateTimerDisplay() {

  if (!timerEl) return;

  timerEl.textContent =
    formatTime(state.elapsedSeconds);

}


function updateTimer() {

  if (!state.timerRunning) return;

  const now =
    performance.now();

  const elapsedMs =
    now - state.timerStartedAt;

  state.elapsedSeconds =
    Math.floor(elapsedMs / 1000);

  updateTimerDisplay();

}


function startTimer() {

  stopTimer();

  state.timerStartedAt =
    performance.now();

  state.timerStoppedAt =
    null;

  state.elapsedSeconds =
    0;

  state.timerRunning =
    true;

  updateTimerDisplay();


  state.timerInterval =
    setInterval(updateTimer, 100);

}


function stopTimer() {

  if (state.timerRunning) {

    updateTimer();

    state.timerStoppedAt =
      performance.now();

  }

  state.timerRunning =
    false;


  if (state.timerInterval !== null) {

    clearInterval(
      state.timerInterval
    );

    state.timerInterval =
      null;

  }

  updateTimerDisplay();

}


/* ============================================================
   TIME BONUS
   ============================================================

   > 120 seconds       = +10
   110–119 seconds     = +20
   100–109 seconds     = +30
   90–99 seconds       = +40
   80–89 seconds       = +50
   70–79 seconds       = +60
   60–69 seconds       = +70
   50–59 seconds       = +80
   40–49 seconds       = +90
   < 40 seconds        = +100
   ============================================================ */

function calculateTimeBonus(seconds) {

  if (seconds < 40) {
    return 100;
  }

  if (seconds < 50) {
    return 90;
  }

  if (seconds < 60) {
    return 80;
  }

  if (seconds < 70) {
    return 70;
  }

  if (seconds < 80) {
    return 60;
  }

  if (seconds < 90) {
    return 50;
  }

  if (seconds < 100) {
    return 40;
  }

  if (seconds < 110) {
    return 30;
  }

  if (seconds < 120) {
    return 20;
  }

  return 10;

}


/* ============================================================
   RESET MISSION
   ============================================================ */

function resetMissionState() {

  stopTimer();

  state.roundQuestions = [];

  state.currentIndex = 0;

  state.correctAnswers = 0;

  state.answerPoints = 0;

  state.timeBonus = 0;

  state.totalPoints = 0;

  state.answeredCurrent = false;

  state.results = [];

  state.timerStartedAt = null;

  state.timerStoppedAt = null;

  state.elapsedSeconds = 0;

  state.timerRunning = false;

  updateTimerDisplay();

}


/* ============================================================
   RETURN TO HOME PAGE
   ============================================================ */

function returnToHome() {

  /*
     Stop everything associated with the current mission.
  */

  stopTimer();

  state.transitioning = false;

  if (letterAudio) {

    letterAudio.pause();

    letterAudio.currentTime = 0;

  }


  /*
     Cancel any active warp animation.
  */

  stopWarpAnimation();

  if (warpCanvas) {
    warpCanvas.classList.remove('active');
  }

  document.body.classList.remove('warping');

  appShell.classList.remove('transition-hide');


  /*
     Reset game data.
  */

  resetMissionState();


  /*
     Show the FIRST screen.
  */

  showScreen('start');


  /*
     Reset buttons.
  */

  if (startBtn) {
    startBtn.disabled = false;
  }

  if (nextBtn) {
    nextBtn.disabled = false;
    nextBtn.style.display = 'none';
  }

  if (playAgainBtn) {
    playAgainBtn.disabled = false;
  }


  /*
     Scroll to the top in case the page has moved.
  */

  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* ============================================================
   BLACK HOLE HOME BUTTON
   ============================================================ */

if (homeBlackhole) {

  homeBlackhole.addEventListener(
    'click',
    returnToHome
  );

}


/* ============================================================
   BACKGROUND STAR FIELD
   ============================================================ */

function buildStarField() {

  if (!starField) return;

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
      Math.random() < 0.15
        ? Math.random() * 2 + 2.5
        : Math.random() * 1.5 + 1;

    const isBig =
      size > 3;

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
      (
        Math.random() * 3 + 2.5
      ).toFixed(2);

    const delay =
      (
        Math.random() * 4
      ).toFixed(2);


    star.style.setProperty(
      '--min-o',
      (
        Math.random() * 0.25 + 0.1
      ).toFixed(2)
    );

    star.style.setProperty(
      '--max-o',
      (
        Math.random() * 0.4 + 0.6
      ).toFixed(2)
    );

    star.style.animationDuration =
      duration + 's';

    star.style.animationDelay =
      delay + 's';


    frag.appendChild(star);

  }


  starField.appendChild(frag);

}


/* ============================================================
   RANDOM RANGE
   ============================================================ */

function randRange(min, max) {

  return (
    Math.random() * (max - min) + min
  );

}


/* ============================================================
   SHOOTING STARS
   ============================================================ */

function spawnShootingStar() {

  if (!ambientLayer) return;

  const el =
    document.createElement('div');

  el.className =
    'shooting-star';


  const startTop =
    randRange(-5, 55);

  const startLeft =
    randRange(0, 100);

  const angle =
    randRange(15, 35) *
    (Math.random() < 0.75 ? 1 : -1);

  const distance =
    randRange(260, 520);

  const duration =
    randRange(900, 1500);

  const length =
    randRange(90, 160);


  el.style.top =
    startTop + '%';

  el.style.left =
    startLeft + '%';

  el.style.width =
    length + 'px';

  el.style.setProperty(
    '--angle',
    angle.toFixed(1) + 'deg'
  );

  el.style.setProperty(
    '--distance',
    distance.toFixed(0) + 'px'
  );

  el.style.animationDuration =
    duration.toFixed(0) + 'ms';


  el.addEventListener(
    'animationend',
    () => el.remove()
  );


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


    if (Math.random() < 0.3) {

      setTimeout(
        spawnShootingStar,
        randRange(150, 500)
      );

    }


    scheduleShootingStars();

  }, delay);

}


/* ============================================================
   FLOATING ROCKETS
   ============================================================ */

function spawnFloatingRocket() {

  if (!ambientLayer) return;

  const el =
    document.createElement('div');

  el.className =
    'floating-rocket';

  el.textContent =
    '🚀';


  const startTop =
    randRange(8, 85);

  const startLeft =
    randRange(-5, 90);

  const dx =
    randRange(220, 420) *
    (Math.random() < 0.5 ? 1 : -1);

  const dy =
    randRange(-180, -30);

  const angle =
    randRange(-15, 15);

  const duration =
    randRange(9000, 15000);

  const size =
    randRange(20, 34);


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
    '--angle',
    angle.toFixed(1) + 'deg'
  );

  el.style.animationDuration =
    duration.toFixed(0) + 'ms';


  el.addEventListener(
    'animationend',
    () => el.remove()
  );


  ambientLayer.appendChild(el);

}


function scheduleFloatingRockets() {

  const delay =
    randRange(
      FLOATING_ROCKET_MIN_DELAY_MS,
      FLOATING_ROCKET_MAX_DELAY_MS
    );


  setTimeout(() => {

    spawnFloatingRocket();

    scheduleFloatingRockets();

  }, delay);

}


/* ============================================================
   GALAXY WARP CANVAS
   ============================================================ */

let warpCtx = null;
let warpStars = [];
let warpMaxRadius = 0;
let warpRAF = null;
let warpAnimStart = 0;

let warpAccelMsActive =
  WARP_ACCEL_MS;


/* ============================================================
   SETUP WARP CANVAS
   ============================================================ */

function setupWarpCanvas() {

  if (!warpCanvas) return;

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


/* ============================================================
   WARP STAR CREATION
   ============================================================ */

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
          0.5,

    spd:
      0.6 +
      Math.random() * 1.4,

    hue:
      roll < 0.14
        ? 'gold'
        : (
            roll < 0.26
              ? 'teal'
              : 'white'
          )

  };

}


/* ============================================================
   INITIALIZE WARP STARS
   ============================================================ */

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


/* ============================================================
   WARP FRAME
   ============================================================ */

function warpFrame(now) {

  if (!warpCtx) return;


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
    0.35 +
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
      (
        2 +
        star.r * 0.045
      );


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


    if (
      star.hue === 'gold'
    ) {

      color =
        `rgba(255, 217, 102, ${alpha})`;

    } else if (
      star.hue === 'teal'
    ) {

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


/* ============================================================
   STOP WARP ANIMATION
   ============================================================ */

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
   GALAXY ENTRANCE
   ============================================================ */

function beginGalaxyEntrance() {

  if (state.transitioning) return;


  /*
     IMPORTANT:

     The timer begins RIGHT HERE.

     This is the exact moment the player clicks
     START MISSION.
  */

  startTimer();


  state.transitioning =
    true;


  startBtn.disabled =
    true;


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

      startBtn.disabled =
        false;

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

  },
  WARP_ACCEL_MS +
  WARP_HOLD_MS +
  120);


  setTimeout(() => {

    stopWarpAnimation();

    state.transitioning =
      false;

    startBtn.disabled =
      false;

  },
  WARP_ACCEL_MS +
  WARP_HOLD_MS +
  120 +
  WARP_EXIT_MS);

}


/* ============================================================
   QUESTION GALAXY TRANSITION
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


/* ============================================================
   GALAXY ZOOM TRANSITION
   ============================================================ */

function playGalaxyZoomTransition(
  exitEl,
  enterEl,
  onSwap
) {

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
    'q-enter'
  );

  exitEl.classList.add(
    'q-exit'
  );


  setTimeout(() => {

    onSwap();


    if (
      exitEl !== enterEl
    ) {

      exitEl.classList.remove(
        'q-exit'
      );

    }


    enterEl.classList.remove(
      'q-exit'
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


/* ============================================================
   SHUFFLE
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
    ] = [
      arr[j],
      arr[i]
    ];

  }


  return arr;

}


/* ============================================================
   PICK ROUND QUESTIONS
   ============================================================ */

function pickRoundQuestions() {

  const shuffledBank =
    shuffle(QUESTION_BANK);


  return shuffledBank.slice(
    0,
    QUESTIONS_PER_GAME
  );

}


/* ============================================================
   SCREEN NAVIGATION
   ============================================================ */

function showScreen(name) {

  Object.values(screens)
    .forEach(screen => {

      if (screen) {

        screen.classList.remove(
          'active'
        );

      }

    });


  if (screens[name]) {

    screens[name].classList.add(
      'active'
    );

  }

}


/* ============================================================
   CONSTELLATION
   ============================================================ */

function renderConstellation() {

  if (!constellationEl) return;


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
        ) / (total - 1)
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
      i === state.currentIndex
    ) {

      cls +=
        ' current';

    }


    const r =
      i === state.currentIndex &&
      i >= state.results.length
        ? 8
        : 6;


    nodesSvg += `
      <circle
        class="${cls}"
        cx="${x}"
        cy="${y}"
        r="${r}"
      ></circle>
    `;

  }


  constellationEl.innerHTML = `

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
    >🚀</div>

  `;


  const rocket =
    document.getElementById(
      'rocketIcon'
    );


  if (!rocket) return;


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
          ) / width
        ) * 100

      : 50;


  rocket.style.left =
    xPercent + '%';

}


/* ============================================================
   START GAME
   ============================================================ */

function startGame() {

  state.roundQuestions =
    pickRoundQuestions();

  state.currentIndex =
    0;

  state.correctAnswers =
    0;

  state.answerPoints =
    0;

  state.timeBonus =
    0;

  state.totalPoints =
    0;

  state.results =
    [];

  state.answeredCurrent =
    false;


  /*
     IMPORTANT:

     We do NOT start the timer here.

     It already started when START MISSION was clicked.
  */


  showScreen('game');


  renderQuestion();

}


/* ============================================================
   RENDER QUESTION
   ============================================================ */

function renderQuestion() {

  state.answeredCurrent =
    false;


  const total =
    state.roundQuestions.length;


  const q =
    state.roundQuestions[
      state.currentIndex
    ];


  /*
     QUESTION NUMBER
  */

  questionCounter.textContent =
    `Question ${state.currentIndex + 1} / ${total}`;


  /*
     SCORE DURING GAME

     Each correct answer = 100 points.
  */

  scoreCounter.textContent =
    `Score: ${state.answerPoints} pts`;


  /*
     TIMER
  */

  updateTimerDisplay();


  /*
     CONSTELLATION
  */

  renderConstellation();


  /*
     RESET AUDIO
  */

  letterAudio.pause();

  letterAudio.currentTime =
    0;

  letterAudio.src =
    q.audio;


  playAudioBtn.classList.remove(
    'playing'
  );


  /*
     RESET FEEDBACK
  */

  feedbackEl.textContent =
    '';

  feedbackEl.className =
    'feedback';


  /*
     HIDE NEXT BUTTON
  */

  nextBtn.style.display =
    'none';


  /*
     BUILD ANSWER BUTTONS
  */

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
     Try to autoplay audio.
  */

  playCurrentAudio();

}


/* ============================================================
   PLAY CURRENT AUDIO
   ============================================================ */

function playCurrentAudio() {

  playAudioBtn.classList.add(
    'playing'
  );


  const playPromise =
    letterAudio.play();


  if (
    playPromise &&
    playPromise.catch
  ) {

    playPromise.catch(() => {

      /*
         Autoplay may be blocked by
         browser/mobile policy.
      */

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


/* ============================================================
   MANUAL AUDIO BUTTON
   ============================================================ */

playAudioBtn.addEventListener(
  'click',
  () => {

    letterAudio.currentTime =
      0;

    playCurrentAudio();

  }
);


/* ============================================================
   HANDLE ANSWER
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
  ) return;


  state.answeredCurrent =
    true;


  const isCorrect =
    selectedLetter ===
    correctLetter;


  state.results[
    state.currentIndex
  ] =
    isCorrect;


  /*
     Disable all answer buttons.
  */

  const allOptionButtons =
    optionsGrid.querySelectorAll(
      '.option-btn'
    );


  allOptionButtons.forEach(
    b => {

      b.disabled = true;


      if (
        b.textContent ===
        correctLetter
      ) {

        b.classList.add(
          'correct'
        );

      } else if (
        b === btnEl
      ) {

        b.classList.add(
          'incorrect'
        );

      } else {

        b.classList.add(
          'dimmed'
        );

      }

    }
  );


  /* ----------------------------------------------------------
     CORRECT ANSWER
     ---------------------------------------------------------- */

  if (isCorrect) {

    state.correctAnswers++;

    /*
       Every correct answer = 100 points.
    */

    state.answerPoints =
      state.correctAnswers *
      100;


    feedbackEl.textContent =
      '✓ Correct!';


    feedbackEl.classList.add(
      'correct-text'
    );

  }


  /* ----------------------------------------------------------
     INCORRECT ANSWER
     ---------------------------------------------------------- */

  else {

    feedbackEl.textContent =
      `✗ Try again! It was "${correctLetter}".`;


    feedbackEl.classList.add(
      'incorrect-text'
    );

  }


  feedbackEl.classList.add(
    'show'
  );


  /*
     Update score immediately.
  */

  scoreCounter.textContent =
    `Score: ${state.answerPoints} pts`;


  renderConstellation();


  /*
     If this is Question 7,
     STOP THE TIMER NOW.

     This is deliberately done when the
     answer is selected, rather than when
     "See Results" is clicked.
  */

  const total =
    state.roundQuestions.length;


  const isLastQuestion =
    state.currentIndex + 1 >= total;


  if (isLastQuestion) {

    stopTimer();


    /*
       Calculate time bonus.
    */

    state.timeBonus =
      calculateTimeBonus(
        state.elapsedSeconds
      );


    /*
       Final score:
       
       Correct answers × 100
       +
       Time bonus
    */

    state.totalPoints =
      state.answerPoints +
      state.timeBonus;

  }


  /*
     Show next button.
  */

  nextBtn.textContent =
    isLastQuestion
      ? 'See Results →'
      : 'Next →';


  nextBtn.style.display =
    'inline-block';

}


/* ============================================================
   NEXT BUTTON
   ============================================================ */

nextBtn.addEventListener(
  'click',
  () => {

    if (
      state.transitioning
    ) return;


    state.transitioning =
      true;


    nextBtn.disabled =
      true;


    const total =
      state.roundQuestions.length;


    const isLastQuestion =
      state.currentIndex + 1 >= total;


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
    60);

  }
);


/* ============================================================
   RESULTS SCREEN
   ============================================================ */

function showResults() {

  const total =
    state.roundQuestions.length;


  /*
     Make absolutely sure the timer
     is stopped.
  */

  stopTimer();


  /*
     Recalculate in case results are
     reached from another route.
  */

  state.timeBonus =
    calculateTimeBonus(
      state.elapsedSeconds
    );


  state.totalPoints =
    state.answerPoints +
    state.timeBonus;


  /*
     SAVE BEST SCORE
  */

  const wasNewBest =
    saveBestScore();


  /*
     FINAL SCORE DISPLAY
     
     Example:
     650 POINTS
  */

  resultsScore.textContent =
    `${state.totalPoints} POINTS`;


  /*
     RESULTS MESSAGE
  */

  let message;


  const ratio =
    state.correctAnswers /
    total;


  if (ratio === 1) {

    message =
      'Perfect mission — you heard every letter!';

  }

  else if (ratio >= 0.7) {

    message =
      'Awesome listening, space explorer!';

  }

  else if (ratio >= 0.4) {

    message =
      'Nice work! Keep practicing those sounds.';

  }

  else {

    message =
      'Good try! Let’s blast off again and listen closely.';

  }


  /*
     Add time information.
  */

  message +=
    ` Mission time: ${formatTime(
      state.elapsedSeconds
    )}.`;


  /*
     Show time bonus.
  */

  message +=
    ` Time bonus: +${state.timeBonus} points.`;


  /*
     NEW BEST SCORE
  */

  if (wasNewBest) {

    message +=
      ' 🏆 NEW BEST SCORE!';

  }


  resultsMsg.textContent =
    message;


  /*
     RESULTS STARS

     Stars are still based on
     number of correct answers.
  */

  const filled =
    Math.round(
      ratio * 5
    );


  resultsStars.textContent =
    '⭐'.repeat(filled) +
    '☆'.repeat(
      5 - filled
    );


  showScreen('results');

}


/* ============================================================
   START MISSION BUTTON
   ============================================================ */

startBtn.addEventListener(
  'click',
  beginGalaxyEntrance
);


/* ============================================================
   PLAY AGAIN BUTTON
   ============================================================ */

playAgainBtn.addEventListener(
  'click',
  () => {

    if (
      state.transitioning
    ) return;


    state.transitioning =
      true;


    playAgainBtn.disabled =
      true;


    /*
       IMPORTANT:

       Starting another mission should
       start a completely new timer from
       the moment Play Again is clicked.

       The timer is therefore restarted here.
    */

    startTimer();


    playGalaxyZoomTransition(

      resultsContent,

      questionContent,

      startGame

    );


    setTimeout(() => {

      state.transitioning =
        false;

      playAgainBtn.disabled =
        false;

    },
    QUESTION_EXIT_MS +
    QUESTION_ENTER_MS +
    60);

  }
);


/* ============================================================
   INITIALIZATION
   ============================================================ */

buildStarField();

setupWarpCanvas();


/*
   Timer should show 00:00 when the site loads.
*/

updateTimerDisplay();


/*
   Ambient rockets and shooting stars.
*/

if (!prefersReducedMotion) {

  scheduleShootingStars();

  scheduleFloatingRockets();

}
