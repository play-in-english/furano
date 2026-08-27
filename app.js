/* ============================================================
   ALPHABET LISTENING QUIZ — GAME LOGIC
   ============================================================
   You generally should NOT need to edit this file to update
   quiz content — that all lives in questions.js.

   Settings you CAN safely change below:
   - QUESTIONS_PER_GAME : how many questions are played each round
   - STAR_COUNT         : how many background stars are drawn
   - WARP_*             : timing/density of the big galaxy-entrance
                          hyperspace sequence (Start Mission)
   - QUESTION_WARP_*    : timing/density of the shorter galaxy zoom
                          that plays between every question
   ============================================================ */

const QUESTIONS_PER_GAME = 7; // <-- change this to play more/fewer questions per game
const STAR_COUNT = 90;        // <-- change this to make the sky sparser/denser

/* Galaxy entrance transition timing (all in milliseconds).
   Feel free to tune these — see beginGalaxyEntrance() below for how
   they fit together. */
const WARP_STAR_COUNT = 220;   // how many streaking stars during hyperspace
const WARP_ACCEL_MS   = 1600;  // time to accelerate to full hyperspace speed
const WARP_HOLD_MS    = 250;   // brief hold at top speed before the flash
const WARP_EXIT_MS    = 650;   // fade from warp back into the quiz

/* Question-to-question galaxy zoom transition (a shorter, lighter
   version of the same hyperspace effect, replayed every time the
   student moves to a new question). NOTE: QUESTION_EXIT_MS and
   QUESTION_ENTER_MS must match the transition durations set on
   .question-content / .question-content.q-exit in style.css — keep
   all three in sync if you change any of them. */
const QUESTION_WARP_STAR_COUNT = 70;   // fewer stars than the big entrance
const QUESTION_WARP_ACCEL_MS   = 450;  // quick ramp — this is a short hop, not a full jump
const QUESTION_EXIT_MS  = 320;  // outgoing question rushing/blurring past (matches CSS q-exit)
const QUESTION_ENTER_MS = 360;  // incoming question easing in from the distance (matches base CSS)

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   STATE
   ------------------------------------------------------------ */
const state = {
  roundQuestions: [], // the QUESTIONS_PER_GAME questions chosen for this round
  currentIndex: 0,
  score: 0,
  answeredCurrent: false,
  results: [], // true/false per question, in order, for the constellation trail
  transitioning: false // true while the galaxy entrance animation is playing
};

/* ------------------------------------------------------------
   DOM REFERENCES
   ------------------------------------------------------------ */
const screens = {
  start: document.getElementById('startScreen'),
  game: document.getElementById('gameScreen'),
  results: document.getElementById('resultsScreen')
};

const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');
const playAudioBtn = document.getElementById('playAudioBtn');
const letterAudio = document.getElementById('letterAudio');
const optionsGrid = document.getElementById('optionsGrid');
const feedbackEl = document.getElementById('feedback');
const nextBtn = document.getElementById('nextBtn');
const questionCounter = document.getElementById('questionCounter');
const scoreCounter = document.getElementById('scoreCounter');
const constellationEl = document.getElementById('constellation');
const resultsScore = document.getElementById('resultsScore');
const resultsMsg = document.getElementById('resultsMsg');
const resultsStars = document.getElementById('resultsStars');
const starField = document.getElementById('starField');
const appShell = document.getElementById('appShell');
const warpCanvas = document.getElementById('warpCanvas');
const galaxyFlash = document.getElementById('galaxyFlash');
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
   GALAXY ENTRANCE TRANSITION (hyperspace warp)
   ------------------------------------------------------------
   Draws a "flying through the galaxy" star-streak animation on a
   full-screen canvas when the student clicks "Start Mission".
   Stars spawn near the center and accelerate outward toward the
   edges of the screen, growing larger/brighter as they approach —
   classic warp-speed depth effect — before a soft light flash
   marks "arriving" in the galaxy and the quiz fades in underneath.

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

// Creates one warp star. `nearCenter` seeds it close to the middle
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

// Called when the student clicks "Start Mission". Plays the
// cinematic hyperspace sequence, then hands off to startGame().
function beginGalaxyEntrance() {
  if (state.transitioning) return; // ignore extra clicks mid-transition
  state.transitioning = true;
  startBtn.disabled = true;

  // Respect motion-sensitivity settings: skip straight to the quiz
  // with a short, gentle fade instead of the full hyperspace sequence.
  if (prefersReducedMotion || !warpCtx) {
    appShell.classList.add('transition-hide');
    setTimeout(() => {
      startGame();
      appShell.classList.remove('transition-hide');
      state.transitioning = false;
      startBtn.disabled = false;
    }, 300);
    return;
  }

  // 1) Start screen fades/shrinks away, hyperspace canvas fades in,
  //    stars begin accelerating outward from the center.
  appShell.classList.add('transition-hide');
  document.body.classList.add('warping');
  warpAccelMsActive = WARP_ACCEL_MS;
  initWarpStars(WARP_STAR_COUNT);
  warpAnimStart = performance.now();
  warpCanvas.classList.add('active');
  stopWarpAnimation();
  warpRAF = requestAnimationFrame(warpFrame);

  // 2) Near the end of the acceleration, trigger the bright
  //    "arriving in the galaxy" flash.
  setTimeout(() => {
    galaxyFlash.classList.remove('flash');
    void galaxyFlash.offsetWidth; // restart animation if replayed
    galaxyFlash.classList.add('flash');
  }, WARP_ACCEL_MS);

  // 3) While the app shell is still hidden, swap in the quiz screen
  //    and pick the round's questions — invisible to the student, so
  //    there's no jarring jump when everything fades back in.
  setTimeout(() => {
    startGame();
  }, WARP_ACCEL_MS + WARP_HOLD_MS);

  // 4) Fade the quiz back in and the hyperspace canvas/nebula bloom
  //    back out, completing the "arrival".
  setTimeout(() => {
    appShell.classList.remove('transition-hide');
    warpCanvas.classList.remove('active');
    document.body.classList.remove('warping');
  }, WARP_ACCEL_MS + WARP_HOLD_MS + 120);

  // 5) Clean up once everything has faded, so the canvas isn't
  //    silently animating in the background forever.
  setTimeout(() => {
    stopWarpAnimation();
    state.transitioning = false;
    startBtn.disabled = false;
  }, WARP_ACCEL_MS + WARP_HOLD_MS + 120 + WARP_EXIT_MS);
}

/* ------------------------------------------------------------
   QUESTION-TO-QUESTION GALAXY TRANSITION
   ------------------------------------------------------------
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
// `visibleMs` is how long the canvas stays visible before fading —
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

// Swaps the on-screen content using `onSwap`, wrapped in the
// zoom-out / hyperspace-burst / zoom-in sequence described above.
// `exitEl` is the content currently on screen; `enterEl` is what
// should be visible afterward (they're the same element for a
// same-screen question change, and different elements when the
// swap also crosses from the game screen to the results screen,
// or back again via "Play Again").
function playGalaxyZoomTransition(exitEl, enterEl, onSwap) {
  if (prefersReducedMotion) {
    onSwap();
    return;
  }

  playQuestionWarpBurst(QUESTION_EXIT_MS + QUESTION_ENTER_MS - 60);

  // 1) Current content rushes bigger and blurs away, like it's
  //    flying past the viewer at warp speed.
  exitEl.classList.remove('q-enter');
  exitEl.classList.add('q-exit');

  // 2) Once it's fully faded, perform the actual screen/content swap
  //    while everything is invisible, then flip the new content
  //    straight to the "far away" state so it can zoom in from there.
  setTimeout(() => {
    onSwap();
    if (exitEl !== enterEl) exitEl.classList.remove('q-exit');
    enterEl.classList.remove('q-exit');
    enterEl.classList.add('q-enter');
    void enterEl.offsetWidth; // force reflow so the next class change transitions
    requestAnimationFrame(() => {
      // 3) Zoom the new content in from the distance to full size.
      enterEl.classList.remove('q-enter');
    });
  }, QUESTION_EXIT_MS);
}

/* ------------------------------------------------------------
   QUESTION SELECTION
   Picks QUESTIONS_PER_GAME unique random questions from the
   50-question bank using a Fisher–Yates shuffle, so both the
   selection AND the order are freshly randomized every game.
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
  const shuffledBank = shuffle(QUESTION_BANK);
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
  showScreen('game');
  renderQuestion();
}

function renderQuestion() {
  state.answeredCurrent = false;
  const total = state.roundQuestions.length;
  const q = state.roundQuestions[state.currentIndex];

  questionCounter.textContent = `Question ${state.currentIndex + 1} / ${total}`;
  scoreCounter.textContent = `Score: ${state.score} / ${state.currentIndex}`;

  renderConstellation();

  // reset audio + feedback + next button
  letterAudio.pause();
  letterAudio.currentTime = 0;
  letterAudio.src = q.audio;
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

  // autoplay the sound for this question (best effort; browsers may
  // block autoplay, in which case the student just taps Play Sound)
  playCurrentAudio();
}

function playCurrentAudio() {
  playAudioBtn.classList.add('playing');
  const playPromise = letterAudio.play();
  if (playPromise && playPromise.catch) {
    playPromise.catch(() => {
      // Autoplay blocked, or the mp3 file hasn't been added yet.
      // Silently ignore — the student can press "Play Sound" manually.
      playAudioBtn.classList.remove('playing');
    });
  }
  letterAudio.onended = () => playAudioBtn.classList.remove('playing');
}

playAudioBtn.addEventListener('click', () => {
  letterAudio.currentTime = 0;
  playCurrentAudio();
});

function handleAnswer(selectedLetter, btnEl, correctLetter) {
  // Prevent multiple submissions for the same question
  if (state.answeredCurrent) return;
  state.answeredCurrent = true;

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
  nextBtn.textContent = (state.currentIndex + 1 < total) ? 'Next →' : 'See Results →';
  nextBtn.style.display = 'inline-block';
}

nextBtn.addEventListener('click', () => {
  if (state.transitioning) return; // ignore extra clicks mid-transition
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
});

/* ------------------------------------------------------------
   RESULTS SCREEN
   ------------------------------------------------------------ */
function showResults() {
  const total = state.roundQuestions.length;
  resultsScore.textContent = `${state.score} / ${total} Correct!`;

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

  showScreen('results');
}

/* ------------------------------------------------------------
   EVENT WIRING
   ------------------------------------------------------------ */
// First launch: the full cinematic galaxy-entrance sequence.
startBtn.addEventListener('click', beginGalaxyEntrance);
// Replaying: uses the same short galaxy zoom/hyperspace-burst as
// between questions, rather than replaying the full ~2.5s entrance,
// so repeat play stays snappy.
playAgainBtn.addEventListener('click', () => {
  if (state.transitioning) return;
  state.transitioning = true;
  playAgainBtn.disabled = true;

  playGalaxyZoomTransition(resultsContent, questionContent, startGame);

  setTimeout(() => {
    state.transitioning = false;
    playAgainBtn.disabled = false;
  }, QUESTION_EXIT_MS + QUESTION_ENTER_MS + 60);
});

/* ------------------------------------------------------------
   INIT
   ------------------------------------------------------------ */
buildStarField();
setupWarpCanvas();
