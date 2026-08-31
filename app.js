/* ============================================================
   ALPHABET LISTENING QUIZ — GAME LOGIC

   You generally should NOT need to edit this file to update
   quiz content — that all lives in questions.js.

   Settings you CAN safely change below:

     QUESTIONS_PER_GAME       : how many questions are played each round
     STAR_COUNT                : how many background stars are drawn
     WARP_*                     : timing/density of the big galaxy-entrance
                                   hyperspace sequence (mission launch)
     QUESTION_WARP_*            : timing/density of the shorter galaxy zoom
                                   that plays between every question
     SHOOTING_STAR_*            : how often shooting stars streak by, and
                                   how many can be on screen at once
     FLOATING_SATELLITE_*       : how often 🛰️ satellites drift across the
                                   screen, and how many can be on screen at once
     AUTO_ADVANCE_DELAY_MS      : how long feedback shows before auto-advancing
     AUTOPLAY_GAP_MS            : gap between the two automatic audio plays
     calcTimeBonus()            : the time-bonus point table for scoring
     BEST_SCORE_KEY             : the localStorage key the best score is
                                   saved under (resets daily at local midnight)
     LEADERBOARD_MAX_ROWS       : how many rows show on each leaderboard
   ============================================================ */

const QUESTIONS_PER_GAME = 7; // <-- change this to play more/fewer questions per game
const STAR_COUNT = 90; // <-- change this to make the sky sparser/denser

/* Ambient shooting stars & floating satellites — these play
   continuously throughout the WHOLE site (every screen), independent
   of the hyperspace transitions below. Each spawns on a random delay
   somewhere between its MIN and MAX, forever. */
const SHOOTING_STAR_MIN_DELAY_MS = 2200;
const SHOOTING_STAR_MAX_DELAY_MS = 5200;
const SHOOTING_STAR_MAX_CONCURRENT = 3; // never more than this many streaking at once
const FLOATING_SATELLITE_MIN_DELAY_MS = 5000;
const FLOATING_SATELLITE_MAX_DELAY_MS = 11000;
const FLOATING_SATELLITE_MAX_CONCURRENT = 3; // never more than this many on screen at once

/* Galaxy entrance transition timing (all in milliseconds).
   Feel free to tune these — see beginGalaxyEntrance() below for how
   they fit together. */
const WARP_STAR_COUNT = 220; // how many streaking stars during hyperspace
const WARP_ACCEL_MS = 1600; // time to accelerate to full hyperspace speed
const WARP_HOLD_MS = 250; // brief hold at top speed before the flash
const WARP_EXIT_MS = 650; // fade from warp back into the quiz

/* Question-to-question galaxy zoom transition (a shorter, lighter
   version of the same hyperspace effect, replayed every time the
   student moves to a new question). NOTE: QUESTION_EXIT_MS and
   QUESTION_ENTER_MS must match the transition durations set on
   .question-content / .question-content.q-exit in style.css — keep
   all three in sync if you change any of them. */
const QUESTION_WARP_STAR_COUNT = 70; // fewer stars than the big entrance
const QUESTION_WARP_ACCEL_MS = 450; // quick ramp — this is a short hop, not a full jump
const QUESTION_EXIT_MS = 320; // outgoing question rushing/blurring past (matches CSS q-exit)
const QUESTION_ENTER_MS = 360; // incoming question easing in from the distance (matches base CSS)

/* Auto-advance: once a question is answered, how long the
   correct/incorrect feedback stays on screen before the game moves
   on to the next question by itself. */
const AUTO_ADVANCE_DELAY_MS = 2000;

/* Auto-play-twice: gap between the first automatic playback ending
   and the second automatic playback starting. Only applies to the
   automatic sequence — manual "Play Sound" clicks are never chained
   or limited. */
const AUTOPLAY_GAP_MS = 2000;

/* Scoring & best-score persistence.
   Total score for a round = (correct answers × 100) + a time bonus.
   The best score is saved in the browser's localStorage, but only
   counts for the CURRENT calendar day. */

const POINTS_PER_CORRECT_ANSWER = 100;
const BEST_SCORE_KEY = 'galaxyAlphabetQuiz.bestScore.v1';

// Time-bonus table:
// Time taken to answer all 7 questions → bonus points.
//
//   45 seconds or more  → 20 points
//   40–44 seconds       → 40 points
//   35–39 seconds       → 60 points
//   30–34 seconds       → 80 points
//   25–29 seconds       → 100 points
//   20–24 seconds       → 200 points
//   Under 20 seconds    → 300 points
function calcTimeBonus(seconds) {
  if (seconds < 20) return 300; // under 20s
  if (seconds < 25) return 200; // 20–24s
  if (seconds < 30) return 100; // 25–29s
  if (seconds < 35) return 80;  // 30–34s
  if (seconds < 40) return 60;  // 35–39s
  if (seconds < 45) return 40;  // 40–44s
  return 20; // 45s or more
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   NICKNAME + LEADERBOARD PERSISTENCE (NEW)

   Everything here is stored in localStorage on THIS device/browser
   only — there is no backend/server in this project, so a "daily
   leaderboard" is really "the daily best runs recorded on this
   device." Every value is tagged with the current JST calendar date
   (see getJstDateKey()) and is treated as expired the moment that
   date no longer matches "today" — which is what makes everything
   reset automatically at 00:00 JST with no background timer needed.
   ------------------------------------------------------------ */

const NICKNAME_KEY = 'galaxyAlphabetQuiz.nickname.v1';
const LEADERBOARD_KEY_PREFIX = 'galaxyAlphabetQuiz.leaderboard.'; // + mode + '.v1'
const LEADERBOARD_MAX_ROWS = 5;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const MODE_LABELS = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };

// Returns the current calendar date in Japan Standard Time as
// "YYYY-MM-DD", regardless of the player's own device timezone.
function getJstDateKey(date) {
  const now = date || new Date();
  const jst = new Date(now.getTime() + JST_OFFSET_MS);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Milliseconds remaining until the next 00:00:00 JST.
function msUntilNextJstMidnight() {
  const now = new Date();
  const jstNow = new Date(now.getTime() + JST_OFFSET_MS);
  const jstMidnight = new Date(Date.UTC(
    jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate() + 1, 0, 0, 0
  ));
  return jstMidnight.getTime() - jstNow.getTime();
}

function loadNickname() {
  try {
    const raw = localStorage.getItem(NICKNAME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.nickname !== 'string' || !parsed.nickname.trim()) return null;
    if (parsed.dateKey !== getJstDateKey()) return null; // from a previous JST day — expired
    return parsed.nickname;
  } catch (e) {
    return null;
  }
}

function saveNickname(nickname) {
  try {
    localStorage.setItem(NICKNAME_KEY, JSON.stringify({
      nickname: nickname,
      dateKey: getJstDateKey()
    }));
  } catch (e) {
    // Storage unavailable (private browsing, disabled, quota, etc.) —
    // the player can still play, they'll just be asked again next load.
  }
}

function loadLeaderboard(mode) {
  const key = LEADERBOARD_KEY_PREFIX + mode + '.v1';
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.dateKey === getJstDateKey() && Array.isArray(parsed.entries)) {
        return parsed;
      }
    }
  } catch (e) {
    // fall through to a fresh board
  }
  return { dateKey: getJstDateKey(), entries: [] };
}

function saveLeaderboard(mode, board) {
  const key = LEADERBOARD_KEY_PREFIX + mode + '.v1';
  try {
    localStorage.setItem(key, JSON.stringify(board));
  } catch (e) {
    // Storage unavailable — leaderboard just won't persist this run.
  }
}

// Records a completed round on the given mode's leaderboard. Each
// player (by nickname) keeps only their single best row per mode per
// day — "best" meaning highest score, then fastest time on a tie —
// matching the ranking rule in the requirements.
function recordLeaderboardResult(mode, nickname, score, timeSeconds) {
  const board = loadLeaderboard(mode);
  const existingIndex = board.entries.findIndex(e => e.nickname === nickname);
  const candidate = { nickname: nickname, score: score, timeSeconds: timeSeconds };

  if (existingIndex === -1) {
    board.entries.push(candidate);
  } else {
    const existing = board.entries[existingIndex];
    const isBetter = score > existing.score || (score === existing.score && timeSeconds < existing.timeSeconds);
    if (isBetter) board.entries[existingIndex] = candidate;
  }

  saveLeaderboard(mode, board);
  return board;
}

function sortedLeaderboardEntries(board) {
  return board.entries.slice().sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.timeSeconds - b.timeSeconds;
  });
}

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */
const state = {
  mode: 'easy',            // 'easy' | 'medium' | 'hard' — chosen on the Difficulty screen
  nickname: '',            // today's Space Explorer nickname
  roundQuestions: [],      // the QUESTIONS_PER_GAME questions chosen for this round
  currentIndex: 0,
  score: 0,
  answeredCurrent: false,
  results: [],             // true/false per question, in order, for the constellation trail
  transitioning: false,    // true while a galaxy transition animation is playing
  startTime: null,         // performance.now() at the moment the round started
  elapsedSeconds: null,    // captured once the final question is answered
  autoAdvanceTimeoutId: null,   // pending "move to next question automatically" timer
  autoplaySecondTimeoutId: null // pending "play the sound a second time" timer
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

const nicknameForm = document.getElementById('nicknameForm');
const nicknameInput = document.getElementById('nicknameInput');
const nicknameSubmitBtn = document.getElementById('nicknameSubmitBtn');
const welcomeBackEl = document.getElementById('welcomeBack');

const startBtn = document.getElementById('startBtn');
const shareBtn = document.getElementById('shareBtn');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');

const playAgainBtn = document.getElementById('playAgainBtn');
const playAudioBtn = document.getElementById('playAudioBtn');
const letterAudio = document.getElementById('letterAudio');
const optionsGrid = document.getElementById('optionsGrid');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('nextBtn');
const questionCounter = document.getElementById('questionCounter');
const scoreCounter = document.getElementById('scoreCounter');
const modePill = document.getElementById('modePill');
const timerPill = document.getElementById('timerPill');
const blackholeBtn = document.getElementById('blackholeBtn');
const constellationEl = document.getElementById('constellation');
const resultsScore = document.getElementById('resultsScore');
const resultsMsg = document.getElementById('resultsMsg');
const resultsStars = document.getElementById('resultsStars');
const resultsBest = document.getElementById('resultsBest');
const championCountdownEl = document.getElementById('championCountdown');
const leaderboardTitleEl = document.getElementById('leaderboardTitle');
const leaderboardListEl = document.getElementById('leaderboardList');
const starField = document.getElementById('starField');
const ambientLayer = document.getElementById('ambientLayer');
const appShell = document.getElementById('appShell');
const warpCanvas = document.getElementById('warpCanvas');
const galaxyFlash = document.getElementById('galaxyFlash');
const startContent = document.getElementById('startContent');
const questionContent = document.getElementById('questionContent');
const resultsContent = document.getElementById('resultsContent');

/* ------------------------------------------------------------
   BACKGROUND STAR FIELD
   Purely decorative — generates STAR_COUNT twinkling dots.
   ------------------------------------------------------------ */
function buildStarField() {
  starField.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < STAR_COUNT; i++) {
    const star = document.createElement('div');
    const size = Math.random() < 0.15 ? (Math.random() * 2 + 2.5) : (Math.random() * 1.5 + 1);
    const isBig = size > 3;
    star.className = 'star' + (isBig ? ' big' : '');
    star.style.left = Math.random() * 100 + 'vw';
    star.style.top = Math.random() * 100 + 'vh';
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    const duration = (Math.random() * 3 + 2.5).toFixed(2);
    const delay = (Math.random() * 4).toFixed(2);
    star.style.setProperty('--min-o', (Math.random() * 0.25 + 0.1).toFixed(2));
    star.style.setProperty('--max-o', (Math.random() * 0.4 + 0.6).toFixed(2));
    star.style.animationDuration = duration + 's';
    star.style.animationDelay = delay + 's';
    frag.appendChild(star);
  }
  starField.appendChild(frag);
}

/* ------------------------------------------------------------
   AMBIENT FLOATING SATELLITES & SHOOTING STARS

   Purely decorative flourishes that run continuously for the whole
   site visit — every screen alike — completely independent of the
   hyperspace warp system below. Each function spawns one element,
   lets its CSS animation play out, then removes it;
   scheduleShootingStars()/scheduleFloatingSatellites() just keep
   calling that on a random delay, forever.
   ------------------------------------------------------------ */
function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

// A quick streak with a fading trail that shoots across the screen
// at a random spot/angle and disappears. Most are small, dim, and
// short ("far away" — a subtle background detail); a minority are
// bigger, brighter, and slightly longer ("nearer" — unmistakable).
// Never more than SHOOTING_STAR_MAX_CONCURRENT are on screen at once.
let activeShootingStarCount = 0;

function spawnShootingStar() {
  if (!ambientLayer) return;
  if (activeShootingStarCount >= SHOOTING_STAR_MAX_CONCURRENT) return; // try again next scheduled tick

  const el = document.createElement('div');
  el.className = 'shooting-star';

  const isNear = Math.random() < 0.3; // ~30% read as close/obvious, rest as distant/subtle
  const length = isNear ? randRange(55, 90) : randRange(22, 42); // px, visible trail length
  const distance = isNear ? randRange(150, 230) : randRange(80, 150); // px travelled — short either way
  const duration = isNear ? randRange(550, 850) : randRange(420, 680);
  const peakOpacity = isNear ? 1 : randRange(0.4, 0.65);
  const thickness = isNear ? 2.2 : 1.2; // px

  const startTop = randRange(-5, 55); // upper half-ish of the screen, in %
  const startLeft = randRange(0, 100); // %
  // Mostly a classic downward-right sweep, occasionally mirrored for variety.
  const angle = randRange(15, 35) * (Math.random() < 0.75 ? 1 : -1);

  el.style.top = startTop + '%';
  el.style.left = startLeft + '%';
  el.style.width = length.toFixed(0) + 'px';
  el.style.height = thickness + 'px';
  el.style.setProperty('--angle', angle.toFixed(1) + 'deg');
  el.style.setProperty('--distance', distance.toFixed(0) + 'px');
  el.style.setProperty('--peak-opacity', peakOpacity.toFixed(2));
  el.style.animationDuration = duration.toFixed(0) + 'ms';

  activeShootingStarCount++;
  el.addEventListener('animationend', () => {
    el.remove();
    activeShootingStarCount--;
  });
  ambientLayer.appendChild(el);
}

function scheduleShootingStars() {
  const delay = randRange(SHOOTING_STAR_MIN_DELAY_MS, SHOOTING_STAR_MAX_DELAY_MS);
  setTimeout(() => {
    spawnShootingStar();
    scheduleShootingStars();
  }, delay);
}

// A slow-drifting satellite (🛰️) that cruises across part of the
// screen while gently tumbling, then fades out. Only
// FLOATING_SATELLITE_MAX_CONCURRENT can exist on screen at once.
let activeSatelliteCount = 0;

function spawnFloatingSatellite() {
  if (!ambientLayer) return;
  if (activeSatelliteCount >= FLOATING_SATELLITE_MAX_CONCURRENT) return; // try again next scheduled tick

  const el = document.createElement('div');
  el.className = 'floating-satellite';
  el.textContent = '🛰️';

  // Pick a travel direction first, then choose a spawn point on the
  // opposite side so the satellite actually crosses the visible screen.
  const goingRight = Math.random() < 0.5;
  const goingDown = Math.random() < 0.5;
  const dx = (goingRight ? 1 : -1) * randRange(
    window.innerWidth * 0.35,
    window.innerWidth * 0.65
  );
  const dy = (goingDown ? 1 : -1) * randRange(
    window.innerHeight * 0.15,
    window.innerHeight * 0.35
  );

  const startLeft = goingRight ? randRange(-5, 35) : randRange(65, 100);
  const startTop = goingDown ? randRange(5, 35) : randRange(55, 90);

  // Unlike a rocket, a satellite doesn't need to "point" anywhere —
  // it just gently tumbles end over end while it drifts.
  const spin = (Math.random() < 0.5 ? 1 : -1) * randRange(180, 420);

  const duration = randRange(10000, 18000); // slower/statelier than the old rockets
  const size = randRange(20, 32);

  el.style.top = startTop + '%';
  el.style.left = startLeft + '%';
  el.style.fontSize = size.toFixed(1) + 'px';
  el.style.setProperty('--dx', dx.toFixed(0) + 'px');
  el.style.setProperty('--dy', dy.toFixed(0) + 'px');
  el.style.setProperty('--spin', spin.toFixed(0) + 'deg');
  el.style.animationDuration = duration.toFixed(0) + 'ms';

  activeSatelliteCount++;
  el.addEventListener('animationend', () => {
    el.remove();
    activeSatelliteCount--;
  });
  ambientLayer.appendChild(el);
}

function scheduleFloatingSatellites() {
  const delay = randRange(FLOATING_SATELLITE_MIN_DELAY_MS, FLOATING_SATELLITE_MAX_DELAY_MS);
  setTimeout(() => {
    spawnFloatingSatellite();
    scheduleFloatingSatellites();
  }, delay);
}

/* ------------------------------------------------------------
   GALAXY ENTRANCE TRANSITION (hyperspace warp)

   Draws a "flying through the galaxy" star-streak animation on a
   full-screen canvas when the student launches a mission. Stars
   spawn near the center and accelerate outward toward the edges of
   the screen, growing larger/brighter as they approach — classic
   warp-speed depth effect — before a soft light flash marks
   "arriving" in the galaxy and the quiz fades in underneath.

   This section is self-contained: if you never touch it, the rest
   of the game logic below works exactly as before.
   ------------------------------------------------------------ */
let warpCtx = null;
let warpStars = [];
let warpMaxRadius = 0;
let warpRAF = null;
let warpAnimStart = 0;
let warpAccelMsActive = WARP_ACCEL_MS; // set before each run: big entrance vs quick question hop

function setupWarpCanvas() {
  if (!warpCanvas.getContext) return; // very old browsers: skip gracefully
  warpCtx = warpCanvas.getContext('2d');
  resizeWarpCanvas();
  window.addEventListener('resize', resizeWarpCanvas);
}

function resizeWarpCanvas() {
  if (!warpCtx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  warpCanvas.width = w * dpr;
  warpCanvas.height = h * dpr;
  warpCanvas.style.width = w + 'px';
  warpCanvas.style.height = h + 'px';
  warpCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// Creates one warp star. nearCenter seeds it close to the middle
// (used when a star finishes its flight and respawns).
function makeWarpStar(nearCenter) {
  const roll = Math.random();
  return {
    angle: Math.random() * Math.PI * 2,
    r: nearCenter ? Math.random() * 24 : Math.random() * warpMaxRadius * 0.5,
    spd: 0.6 + Math.random() * 1.4, // per-star speed variation, for depth
    // mostly white starlight, with a sprinkle of gold/teal for magic
    hue: roll < 0.14 ? 'gold' : (roll < 0.26 ? 'teal' : 'white')
  };
}

function initWarpStars(count) {
  warpMaxRadius = Math.hypot(window.innerWidth, window.innerHeight) / 2 * 1.05;
  warpStars = [];
  const total = count || WARP_STAR_COUNT;
  for (let i = 0; i < total; i++) {
    warpStars.push(makeWarpStar(false));
  }
}

function warpFrame(now) {
  const elapsed = now - warpAnimStart;
  // Ease-in acceleration: slow drift at first, rapidly ramping up to
  // full hyperspace speed by warpAccelMsActive, then holding there.
  const accelProgress = Math.min(elapsed / warpAccelMsActive, 1);
  const eased = accelProgress * accelProgress;
  const speedFactor = 0.35 + eased * 5.5;

  const w = window.innerWidth;
  const h = window.innerHeight;
  const cx = w / 2;
  const cy = h / 2;

  // Translucent fill (instead of a full clear) so fast stars leave a
  // soft streak behind them — the classic warp-speed trail look.
  warpCtx.fillStyle = 'rgba(6, 8, 24, 0.28)';
  warpCtx.fillRect(0, 0, w, h);

  for (let i = 0; i < warpStars.length; i++) {
    const star = warpStars[i];
    // Stars further from center travel faster, simulating perspective
    // as they approach the "camera".
    const delta = speedFactor * star.spd * (2 + star.r * 0.045);
    star.r += delta;

    if (star.r > warpMaxRadius) {
      warpStars[i] = makeWarpStar(true);
      continue;
    }

    const ratio = star.r / warpMaxRadius;
    const x = cx + Math.cos(star.angle) * star.r;
    const y = cy + Math.sin(star.angle) * star.r;
    const size = 0.6 + ratio * 3.6;
    const alpha = Math.min(1, 0.2 + ratio * 1.1);

    let color;
    if (star.hue === 'gold') color = `rgba(255, 217, 102, ${alpha})`;
    else if (star.hue === 'teal') color = `rgba(79, 227, 193, ${alpha})`;
    else color = `rgba(255, 255, 255, ${alpha})`;

    warpCtx.beginPath();
    warpCtx.fillStyle = color;
    warpCtx.arc(x, y, size, 0, Math.PI * 2);
    warpCtx.fill();
  }

  warpRAF = requestAnimationFrame(warpFrame);
}

function stopWarpAnimation() {
  if (warpRAF) cancelAnimationFrame(warpRAF);
  warpRAF = null;
  if (warpCtx) warpCtx.clearRect(0, 0, warpCanvas.width, warpCanvas.height);
}

// Called when the student picks a difficulty on the Difficulty
// screen. Plays the cinematic hyperspace sequence, then hands off
// to startGame().
function beginGalaxyEntrance() {
  if (state.transitioning) return; // ignore extra clicks mid-transition
  state.transitioning = true;
  setDifficultyButtonsDisabled(true);
  startRoundTimer(); // timing starts the instant a mission is launched

  // Respect motion-sensitivity settings: skip straight to the quiz
  // with a short, gentle fade instead of the full hyperspace sequence.
  if (prefersReducedMotion || !warpCtx) {
    appShell.classList.add('transition-hide');
    setTimeout(() => {
      startGame();
      appShell.classList.remove('transition-hide');
      state.transitioning = false;
      setDifficultyButtonsDisabled(false);
    }, 300);
    return;
  }

  // 1) Difficulty screen fades/shrinks away, hyperspace canvas fades
  // in, stars begin accelerating outward from the center.
  appShell.classList.add('transition-hide');
  document.body.classList.add('warping');
  warpAccelMsActive = WARP_ACCEL_MS;
  initWarpStars(WARP_STAR_COUNT);
  warpAnimStart = performance.now();
  warpCanvas.classList.add('active');
  stopWarpAnimation();
  warpRAF = requestAnimationFrame(warpFrame);

  // 2) Near the end of the acceleration, trigger the bright
  // "arriving in the galaxy" flash.
  setTimeout(() => {
    galaxyFlash.classList.remove('flash');
    void galaxyFlash.offsetWidth; // restart animation if replayed
    galaxyFlash.classList.add('flash');
  }, WARP_ACCEL_MS);

  // 3) While the app shell is still hidden, swap in the quiz screen
  // and pick the round's questions — invisible to the student, so
  // there's no jarring jump when everything fades back in.
  setTimeout(() => {
    startGame();
  }, WARP_ACCEL_MS + WARP_HOLD_MS);

  // 4) Fade the quiz back in and the hyperspace canvas/nebula bloom
  // back out, completing the "arrival".
  setTimeout(() => {
    appShell.classList.remove('transition-hide');
    warpCanvas.classList.remove('active');
    document.body.classList.remove('warping');
  }, WARP_ACCEL_MS + WARP_HOLD_MS + 120);

  // 5) Clean up once everything has faded, so the canvas isn't
  // silently animating in the background forever.
  setTimeout(() => {
    stopWarpAnimation();
    state.transitioning = false;
    setDifficultyButtonsDisabled(false);
  }, WARP_ACCEL_MS + WARP_HOLD_MS + 120 + WARP_EXIT_MS);
}

function setDifficultyButtonsDisabled(disabled) {
  difficultyButtons.forEach(btn => { btn.disabled = disabled; });
}

/* ------------------------------------------------------------
   QUESTION-TO-QUESTION GALAXY TRANSITION

   Every time the student moves to a new question (or on to the
   results screen), the current question rushes bigger/brighter and
   blurs past — like it's flying past at warp speed — a burst of
   hyperspace stars streaks past behind it, and the next question
   starts tiny and far away, then zooms up to size as it arrives —
   the same galaxy effect as the opening entrance, just a short hop
   instead of a full journey, with the content moving the same way
   the stars do instead of just fading in place.
   ------------------------------------------------------------ */

// Plays a short hyperspace star burst behind a question transition.
// visibleMs is how long the canvas stays visible before fading —
// keep it roughly in line with QUESTION_EXIT_MS + QUESTION_ENTER_MS.
function playQuestionWarpBurst(visibleMs) {
  if (!warpCtx) return;
  document.body.classList.add('warping');
  warpAccelMsActive = QUESTION_WARP_ACCEL_MS;
  initWarpStars(QUESTION_WARP_STAR_COUNT);
  warpAnimStart = performance.now();
  stopWarpAnimation();
  warpCanvas.classList.add('active');
  warpRAF = requestAnimationFrame(warpFrame);

  setTimeout(() => {
    warpCanvas.classList.remove('active');
    document.body.classList.remove('warping');
  }, visibleMs);

  // Give the canvas's own fade-out transition (defined in style.css)
  // time to finish before we stop drawing and clear it.
  setTimeout(() => {
    stopWarpAnimation();
  }, visibleMs + 650);
}

// Swaps the on-screen content using onSwap, wrapped in the
// zoom-out / hyperspace-burst / zoom-in sequence described above.
// exitEl is the content currently on screen; enterEl is what
// should be visible afterward (they're the same element for a
// same-screen question change, and different elements when the
// swap also crosses screens — e.g. into results, back via "Play
// Again", or home via the black hole button).
// exitClass picks which exit animation plays — 'q-exit' (default,
// flying-past-camera) or 'q-suck' (pulled into the black hole).
function playGalaxyZoomTransition(exitEl, enterEl, onSwap, exitClass) {
  exitClass = exitClass || 'q-exit';

  if (prefersReducedMotion) {
    onSwap();
    return;
  }

  playQuestionWarpBurst(QUESTION_EXIT_MS + QUESTION_ENTER_MS - 60);

  // 1) Current content plays its exit animation (rushing past the
  // camera, or being pulled into the black hole).
  exitEl.classList.remove('q-enter', 'q-exit', 'q-suck');
  exitEl.classList.add(exitClass);

  // 2) Once it's fully faded, perform the actual screen/content swap
  // while everything is invisible, then flip the new content
  // straight to the "far away" state so it can zoom in from there.
  setTimeout(() => {
    onSwap();
    if (exitEl !== enterEl) exitEl.classList.remove(exitClass);
    enterEl.classList.remove('q-exit', 'q-suck', 'q-enter');
    enterEl.classList.add('q-enter');
    void enterEl.offsetWidth; // force reflow so the next class change transitions
    requestAnimationFrame(() => {
      // 3) Zoom the new content in from the distance to full size.
      enterEl.classList.remove('q-enter');
    });
  }, QUESTION_EXIT_MS);
}

/* ------------------------------------------------------------
   MISSION TIMER

   Tracks how long the student takes to answer all of a round's
   questions — from the moment they launch the mission (via the
   Difficulty screen or "Play Again") to the instant they answer the
   final question. Feeds into the scoring in calcTimeBonus() above,
   and into the leaderboard's tie-break rule.
   ------------------------------------------------------------ */
let gameTimerIntervalId = null;

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ':' + String(sec).padStart(2, '0');
}

// Call this at the moment a round begins — starts the clock and the
// ticking display.
function startRoundTimer() {
  state.startTime = performance.now();
  state.elapsedSeconds = null;
  stopGameTimer();
  updateTimerDisplay();
  gameTimerIntervalId = setInterval(updateTimerDisplay, 250);
}

function stopGameTimer() {
  if (gameTimerIntervalId) {
    clearInterval(gameTimerIntervalId);
    gameTimerIntervalId = null;
  }
}

function updateTimerDisplay() {
  if (!timerPill || state.startTime == null) return;
  const liveSeconds = state.elapsedSeconds != null
    ? state.elapsedSeconds
    : (performance.now() - state.startTime) / 1000;
  timerPill.textContent = '⏱ ' + formatTime(liveSeconds);
}

/* ------------------------------------------------------------
   BEST SCORE (persisted on this device via localStorage,
   resets daily at local midnight)

   The saved record is tagged with the calendar date (YYYY-MM-DD, in
   the player's local timezone) it was set on. Whenever we read it
   back, if that date isn't TODAY anymore, we treat it as if there
   were no best score — which is what makes the "best of the day"
   reset happen automatically right at midnight rather than needing
   a timer running in the background. Wrapped in try/catch because
   some browsers block storage entirely in private browsing — in
   that case the game still works, it just won't remember a best
   score between visits.
   ------------------------------------------------------------ */
function getTodayDateKey() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function loadBestScore() {
  try {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.points !== 'number' || !isFinite(parsed.points)) return null;
    if (parsed.dateKey !== getTodayDateKey()) return null; // from a previous day — expired
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveBestScore(points) {
  try {
    localStorage.setItem(BEST_SCORE_KEY, JSON.stringify({
      points: points,
      dateKey: getTodayDateKey(),
      savedAt: Date.now()
    }));
  } catch (e) {
    // Storage unavailable (private browsing, disabled, quota, etc.) —
    // fail silently; the round's score still displays normally.
  }
}

/* ------------------------------------------------------------
   QUESTION SELECTION
   Picks QUESTIONS_PER_GAME unique random questions from whichever
   50-question bank matches the chosen difficulty, using a
   Fisher–Yates shuffle, so both the selection AND the order are
   freshly randomized every game.
   ------------------------------------------------------------ */
function shuffle(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickRoundQuestions() {
  const bank = QUESTION_BANKS[state.mode] || QUESTION_BANKS.easy;
  const shuffledBank = shuffle(bank);
  return shuffledBank.slice(0, QUESTIONS_PER_GAME);
}

/* ------------------------------------------------------------
   SCREEN NAVIGATION
   ------------------------------------------------------------ */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

/* ------------------------------------------------------------
   CONSTELLATION PROGRESS TRAIL
   Draws a dashed path with one star-node per question; nodes
   light up gold (correct) or pink (incorrect) as answered, and
   a little rocket travels along the path.
   ------------------------------------------------------------ */
function renderConstellation() {
  const total = state.roundQuestions.length;
  const width = 600;
  const height = 54;
  const padding = 30;
  const step = total > 1 ? (width - padding * 2) / (total - 1) : 0;
  const y = height / 2;

  let pathD = `M ${padding} ${y}`;
  let nodesSvg = '';

  for (let i = 0; i < total; i++) {
    const x = padding + step * i;
    if (i > 0) pathD += ` L ${x} ${y}`;

    let cls = 'constellation-node';
    if (i < state.results.length) {
      cls += state.results[i] ? ' done' : ' wrong-node';
    } else if (i === state.currentIndex) {
      cls += ' current';
    }
    const r = i === state.currentIndex && i >= state.results.length ? 8 : 6;
    nodesSvg += `<circle class="${cls}" cx="${x}" cy="${y}" r="${r}"></circle>`;
  }

  constellationEl.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
      <path class="constellation-line" d="${pathD}"></path>
      ${nodesSvg}
    </svg>
    <div class="rocket" id="rocketIcon" aria-hidden="true">🚀</div>
  `;

  // position rocket over current node using percentage of width
  const rocket = document.getElementById('rocketIcon');
  const progressIndex = Math.min(state.currentIndex, total - 1);
  const xPercent = total > 1
    ? ((padding + step * progressIndex) / width) * 100
    : 50;
  rocket.style.left = xPercent + '%';
}

/* ------------------------------------------------------------
   GAME FLOW
   ------------------------------------------------------------ */
function startGame() {
  state.roundQuestions = pickRoundQuestions();
  state.currentIndex = 0;
  state.score = 0;
  state.results = [];
  modePill.textContent = MODE_LABELS[state.mode] || 'EASY';
  showScreen('game');
  renderQuestion();
}

function clearAutoAdvanceTimer() {
  if (state.autoAdvanceTimeoutId) {
    clearTimeout(state.autoAdvanceTimeoutId);
    state.autoAdvanceTimeoutId = null;
  }
}

function clearAutoplaySecondTimer() {
  if (state.autoplaySecondTimeoutId) {
    clearTimeout(state.autoplaySecondTimeoutId);
    state.autoplaySecondTimeoutId = null;
  }
}

function renderQuestion() {
  state.answeredCurrent = false;
  clearAutoAdvanceTimer();
  clearAutoplaySecondTimer();

  const total = state.roundQuestions.length;
  const q = state.roundQuestions[state.currentIndex];

  questionCounter.textContent = `Question ${state.currentIndex + 1} / ${total}`;
  scoreCounter.textContent = `Score: ${state.score} / ${state.currentIndex}`;

  renderConstellation();

  // reset audio + feedback + next button
  letterAudio.pause();
  letterAudio.currentTime = 0;
  letterAudio.src = q.audio;
  letterAudio.onended = null;
  playAudioBtn.classList.remove('playing');
  feedbackEl.textContent = '';
  feedbackEl.className = 'feedback';
  nextBtn.style.display = 'none';

  // build answer option buttons (shuffled so the correct answer
  // isn't always in the same position)
  optionsGrid.innerHTML = '';
  const shuffledOptions = shuffle(q.options);
  shuffledOptions.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.type = 'button';
    btn.textContent = letter;
    btn.setAttribute('aria-label', `Answer ${letter}`);
    btn.addEventListener('click', () => handleAnswer(letter, btn, q.correctAnswer));
    optionsGrid.appendChild(btn);
  });

  // Automatically play the sound twice (with a gap in between) for
  // this new question; the student can always replay manually too.
  startAutoplaySequence();
}

// Plays the current question's audio automatically, then — if the
// student hasn't answered yet — plays it a second time after
// AUTOPLAY_GAP_MS. This chain is only for the automatic sequence;
// manual "Play Sound" clicks (see the click handler below) never
// chain into a second play and are never limited in count.
function startAutoplaySequence() {
  playAudioBtn.classList.add('playing');
  letterAudio.currentTime = 0;
  const playPromise = letterAudio.play();
  if (playPromise && playPromise.catch) {
    playPromise.catch(() => {
      // Autoplay blocked, or the audio file hasn't been added yet.
      // Silently ignore — the student can press "Play Sound" manually.
      playAudioBtn.classList.remove('playing');
    });
  }

  letterAudio.onended = () => {
    playAudioBtn.classList.remove('playing');
    if (state.answeredCurrent) return; // already answered after just one play — no need for a second

    state.autoplaySecondTimeoutId = setTimeout(() => {
      if (state.answeredCurrent) return; // answered during the gap — skip the second play
      playAudioBtn.classList.add('playing');
      letterAudio.currentTime = 0;
      const secondPlayPromise = letterAudio.play();
      if (secondPlayPromise && secondPlayPromise.catch) {
        secondPlayPromise.catch(() => {
          playAudioBtn.classList.remove('playing');
        });
      }
      // After this second automatic play, do nothing further — only
      // a manual "Play Sound" click can trigger more playback.
      letterAudio.onended = () => {
        playAudioBtn.classList.remove('playing');
      };
    }, AUTOPLAY_GAP_MS);
  };
}

// Manual "Play Sound" button: always just plays once, is never
// limited, and cancels any pending automatic second play so the two
// don't overlap.
playAudioBtn.addEventListener('click', () => {
  clearAutoplaySecondTimer();
  playAudioBtn.classList.add('playing');
  letterAudio.currentTime = 0;
  const playPromise = letterAudio.play();
  if (playPromise && playPromise.catch) {
    playPromise.catch(() => {
      playAudioBtn.classList.remove('playing');
    });
  }
  letterAudio.onended = () => {
    playAudioBtn.classList.remove('playing');
  };
});

function handleAnswer(selectedLetter, btnEl, correctLetter) {
  // Prevent multiple submissions for the same question
  if (state.answeredCurrent) return;
  state.answeredCurrent = true;
  clearAutoplaySecondTimer(); // heard it once and answered — no need for the second play

  const isCorrect = selectedLetter === correctLetter;
  state.results[state.currentIndex] = isCorrect;

  const allOptionButtons = optionsGrid.querySelectorAll('.option-btn');
  allOptionButtons.forEach(b => {
    b.disabled = true;
    if (b.textContent === correctLetter) {
      b.classList.add('correct');
    } else if (b === btnEl) {
      b.classList.add('incorrect');
    } else {
      b.classList.add('dimmed');
    }
  });

  if (isCorrect) {
    state.score++;
    feedbackEl.textContent = '✓ Correct!';
    feedbackEl.classList.add('correct-text');
  } else {
    feedbackEl.textContent = `✗ Try again! It was "${correctLetter}".`;
    feedbackEl.classList.add('incorrect-text');
  }
  feedbackEl.classList.add('show');

  scoreCounter.textContent = `Score: ${state.score} / ${state.currentIndex + 1}`;
  renderConstellation();

  const total = state.roundQuestions.length;
  const isLastQuestion = state.currentIndex + 1 >= total;
  if (isLastQuestion && state.elapsedSeconds == null) {
    // "Complete" the mission clock the instant the last question is
    // answered — not whenever the transition to results happens.
    state.elapsedSeconds = (performance.now() - state.startTime) / 1000;
    stopGameTimer();
    updateTimerDisplay(); // show the final frozen time, not a live-ticking one
  }

  // The player no longer needs to click through manually — after a
  // short pause to see the feedback, the game advances by itself.
  // The Next button stays available as an optional early-skip.
  nextBtn.textContent = isLastQuestion ? 'See Results →' : 'Next →';
  nextBtn.style.display = 'inline-block';

  clearAutoAdvanceTimer();
  state.autoAdvanceTimeoutId = setTimeout(() => {
    advanceFromCurrentQuestion();
  }, AUTO_ADVANCE_DELAY_MS);
}

// Moves on from the just-answered question — to the next question,
// or to the results screen if that was the last one. Shared by the
// automatic timer and an early manual "Next" click.
function advanceFromCurrentQuestion() {
  if (state.transitioning) return; // a transition is already underway
  clearAutoAdvanceTimer();
  state.transitioning = true;
  nextBtn.disabled = true;

  const total = state.roundQuestions.length;
  const isLastQuestion = state.currentIndex + 1 >= total;

  playGalaxyZoomTransition(
    questionContent,
    isLastQuestion ? resultsContent : questionContent,
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
    state.transitioning = false;
    nextBtn.disabled = false;
  }, QUESTION_EXIT_MS + QUESTION_ENTER_MS + 60);
}

nextBtn.addEventListener('click', () => {
  // Manual early skip — cancel the pending auto-advance and go now.
  advanceFromCurrentQuestion();
});

/* ------------------------------------------------------------
   CHAMPION COUNTDOWN

   Shows how long is left until the daily leaderboards reset at
   00:00:00 JST. Recomputed each time the results screen is shown,
   and refreshed on an interval while that screen stays open.
   ------------------------------------------------------------ */
let championCountdownIntervalId = null;

function updateChampionCountdown() {
  if (!championCountdownEl) return;
  const msLeft = msUntilNextJstMidnight();
  const totalMinutes = Math.max(0, Math.floor(msLeft / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  championCountdownEl.textContent =
    `⏳ You have ${hours} hours ${minutes} minutes left to become the new CHAMPION!`;
}

function startChampionCountdown() {
  stopChampionCountdown();
  updateChampionCountdown();
  championCountdownIntervalId = setInterval(updateChampionCountdown, 30000);
}

function stopChampionCountdown() {
  if (championCountdownIntervalId) {
    clearInterval(championCountdownIntervalId);
    championCountdownIntervalId = null;
  }
}

/* ------------------------------------------------------------
   LEADERBOARD RENDERING
   ------------------------------------------------------------ */
function renderLeaderboard(mode, board) {
  leaderboardTitleEl.textContent = `${MODE_LABELS[mode] || mode.toUpperCase()} LEADERBOARD`;
  const entries = sortedLeaderboardEntries(board).slice(0, LEADERBOARD_MAX_ROWS);

  if (entries.length === 0) {
    leaderboardListEl.innerHTML = '<li class="leaderboard-empty">Be the first Space Explorer on today\u2019s board!</li>';
    return;
  }

  leaderboardListEl.innerHTML = entries.map((entry, i) => {
    const rank = i + 1;
    const isMe = entry.nickname === state.nickname;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : String(rank);
    return `
      <li class="leaderboard-row rank-${rank}${isMe ? ' me' : ''}">
        <span class="leaderboard-rank">${medal}</span>
        <span class="leaderboard-name">${escapeHtml(entry.nickname)}${isMe ? ' (you)' : ''}</span>
        <span class="leaderboard-meta">
          <span class="lb-score">${entry.score} pts</span>
          ${formatTime(entry.timeSeconds)}
        </span>
      </li>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ------------------------------------------------------------
   RESULTS SCREEN
   ------------------------------------------------------------ */
function showResults() {
  const total = state.roundQuestions.length;

  // Total mission score: correct answers × 100, plus a time bonus
  // looked up from calcTimeBonus() — see that function to adjust the
  // point table. No breakdown is shown, just the final sum.
  const correctPoints = state.score * POINTS_PER_CORRECT_ANSWER;
  const timeTakenSeconds = state.elapsedSeconds != null ? state.elapsedSeconds : 0;
  const timeBonus = calcTimeBonus(timeTakenSeconds);
  const totalPoints = correctPoints + timeBonus;

  resultsScore.textContent = `${totalPoints} POINTS`;

  let message;
  const ratio = state.score / total;
  if (ratio === 1) {
    message = 'Perfect mission — you heard every letter!';
  } else if (ratio >= 0.7) {
    message = 'Awesome listening, space explorer!';
  } else if (ratio >= 0.4) {
    message = 'Nice work! Keep practicing those sounds.';
  } else {
    message = 'Good try! Let\u2019s blast off again and listen closely.';
  }
  resultsMsg.textContent = message;

  const filled = Math.round(ratio * 5);
  resultsStars.textContent = '⭐'.repeat(filled) + '☆'.repeat(5 - filled);

  // Best score, saved on this device (see BEST SCORE section above).
  const previousBest = loadBestScore();
  const isNewBest = !previousBest || totalPoints > previousBest.points;
  if (isNewBest) {
    saveBestScore(totalPoints);
  }
  const bestPoints = isNewBest ? totalPoints : previousBest.points;
  resultsBest.textContent = (isNewBest ? "🏆 Today's New Best! " : "🏆 Today's Best: ") + bestPoints + ' POINTS';
  resultsBest.classList.toggle('new-best', isNewBest);

  // Daily leaderboard for the mode just played.
  const updatedBoard = recordLeaderboardResult(state.mode, state.nickname, totalPoints, timeTakenSeconds);
  renderLeaderboard(state.mode, updatedBoard);
  startChampionCountdown();

  showScreen('results');
}

/* ------------------------------------------------------------
   NICKNAME SCREEN

   Shown before everything else unless a valid nickname for today's
   JST date is already stored (see loadNickname()). Submitting moves
   straight on to the existing Start screen.
   ------------------------------------------------------------ */
function sanitizeNickname(raw) {
  return raw.trim().toUpperCase().slice(0, 12);
}

nicknameInput.addEventListener('input', () => {
  nicknameSubmitBtn.disabled = sanitizeNickname(nicknameInput.value).length === 0;
});

// Shared logic for confirming the nickname, reached through three
// independent paths below (button click, Enter key, and native form
// submit) so this keeps working even in restrictive/sandboxed page
// previews that silently block native <form> submission.
function submitNickname() {
  const nickname = sanitizeNickname(nicknameInput.value);
  if (!nickname) return;
  state.nickname = nickname;
  saveNickname(nickname);
  showScreen('start');
}

// Path 1: clicking the Continue button directly (it's type="button",
// not type="submit", specifically so it never depends on the <form>'s
// native submit behavior at all).
nicknameSubmitBtn.addEventListener('click', submitNickname);

// Path 2: pressing Enter while focused in the nickname field.
nicknameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitNickname();
  }
});

// Path 3: if the form is ever submitted natively some other way
// (e.g. an on-screen keyboard's "Go" button), handle it the same way
// rather than letting the browser navigate/reload the page.
nicknameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  submitNickname();
});

// Decide the very first screen: skip straight to Start if today's
// (JST) nickname is already known.
function initNicknameGate() {
  const existing = loadNickname();
  if (existing) {
    state.nickname = existing;
    welcomeBackEl.textContent = `Welcome back, ${existing}! 👋`;
    showScreen('start');
  } else {
    showScreen('nickname');
  }
}

/* ------------------------------------------------------------
   DIFFICULTY SCREEN
   ------------------------------------------------------------ */
startBtn.addEventListener('click', () => {
  showScreen('difficulty');
});

difficultyButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (state.transitioning) return;
    state.mode = btn.getAttribute('data-mode') || 'easy';
    beginGalaxyEntrance();
  });
});

/* ------------------------------------------------------------
   EVENT WIRING
   ------------------------------------------------------------ */
// Replaying: uses the same short galaxy zoom/hyperspace-burst as
// between questions, rather than replaying the full ~2.5s entrance,
// so repeat play stays snappy. Goes straight back to the Difficulty
// screen so the player can pick the same mode or a different one —
// their nickname is already remembered for the rest of the JST day.
playAgainBtn.addEventListener('click', () => {
  if (state.transitioning) return;
  state.transitioning = true;
  playAgainBtn.disabled = true;
  stopChampionCountdown();

  playGalaxyZoomTransition(resultsContent, startContent, () => {
    showScreen('difficulty');
  });

  setTimeout(() => {
    state.transitioning = false;
    playAgainBtn.disabled = false;
  }, QUESTION_EXIT_MS + QUESTION_ENTER_MS + 60);
});

// Black hole button: abandons the current round and returns to the
// Start screen, with a "pulled into the black hole" exit instead of
// the usual forward-motion zoom.
blackholeBtn.addEventListener('click', () => {
  if (state.transitioning) return;
  state.transitioning = true;
  blackholeBtn.disabled = true;

  clearAutoAdvanceTimer();
  clearAutoplaySecondTimer();
  stopGameTimer();
  letterAudio.pause();

  playGalaxyZoomTransition(questionContent, startContent, () => {
    showScreen('start');
  }, 'q-suck');

  setTimeout(() => {
    state.transitioning = false;
    blackholeBtn.disabled = false;
  }, QUESTION_EXIT_MS + QUESTION_ENTER_MS + 60);
});

/* ------------------------------------------------------------
   SHARE BUTTON

   Uses the native share sheet (navigator.share) where available —
   the normal way to share a link on phones/tablets. On desktops or
   browsers without it, falls back to copying the link to the
   clipboard, and if even that's unavailable, falls back once more
   to an old-fashioned prompt() so the link is always obtainable.
   ------------------------------------------------------------ */
function showShareFeedback(message, durationMs) {
  const original = shareBtn.textContent;
  shareBtn.textContent = message;
  shareBtn.disabled = true;
  setTimeout(() => {
    shareBtn.textContent = original;
    shareBtn.disabled = false;
  }, durationMs || 2000);
}

if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    const shareData = {
      title: document.title,
      text: 'Come play the Galaxy Alphabet Quiz with me! 🚀',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // Student cancelled the share sheet, or it failed silently —
        // either way there's nothing useful to show them.
      }
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(shareData.url);
        showShareFeedback('✅ Link Copied!');
        return;
      } catch (err) {
        // fall through to the prompt() fallback below
      }
    }

    window.prompt('Copy this link to share:', shareData.url);
  });
}

/* ------------------------------------------------------------
   SPACE GUN CLICK SOUND

   Every button on the site fires a short synthesized laser "pew"
   on click. This is generated live with the Web Audio API (a
   frequency sweep through a square-wave oscillator) rather than an
   audio file — no copyrighted sound effect is used or needed, and
   there's nothing to download or host. Swap this out for your own
   licensed .mp3 by pointing an <audio> element at it instead, if
   you'd rather use a specific sound.

   A single click listener on the whole document (using event
   delegation) covers every button that exists now AND any created
   later — like the answer buttons, which are rebuilt fresh for each
   question — so nothing needs to be wired up per-button.
   ------------------------------------------------------------ */
let clickSoundCtx = null;

function playClickSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return; // very old browser: skip silently

  if (!clickSoundCtx) {
    clickSoundCtx = new AudioContextClass();
  }
  // Browsers suspend new AudioContexts until a user gesture resumes
  // them — since this only ever runs from a click, resuming here is
  // exactly the right moment.
  if (clickSoundCtx.state === 'suspended') {
    clickSoundCtx.resume();
  }

  const ctx = clickSoundCtx;
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // A fast downward pitch sweep on a square wave reads as a classic
  // sci-fi laser/blaster "pew" rather than a plain electronic beep.
  osc.type = 'square';
  osc.frequency.setValueAtTime(1100, now);
  osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);

  // Kept fairly quiet since this fires on every single click.
  gain.gain.setValueAtTime(0.16, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.18);
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (btn && !btn.disabled) {
    playClickSound();
  }
}, true);

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
buildStarField();
setupWarpCanvas();
initNicknameGate();

// Ambient satellites/shooting stars run for the whole site visit,
// but are skipped for motion-sensitive users (same policy as the
// warp transitions above).
if (!prefersReducedMotion) {
  scheduleShootingStars();
  scheduleFloatingSatellites();
}
