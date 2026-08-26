/* ============================================================
   GALAXY ALPHABET QUIZ — GAME LOGIC
   ============================================================ */

const QUESTIONS_PER_GAME = 7;
const STAR_COUNT = 110;

/* Start Mission hyperspace */
const WARP_STAR_COUNT = 240;
const WARP_ACCEL_MS = 1500;
const WARP_HOLD_MS = 260;
const WARP_EXIT_MS = 700;

/* Question-to-question hyperspace */
const QUESTION_WARP_STAR_COUNT = 110;
const QUESTION_WARP_ACCEL_MS = 520;
const QUESTION_TRANSITION_MS = 650;

const prefersReducedMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  roundQuestions: [],
  currentIndex: 0,
  score: 0,
  answeredCurrent: false,
  results: [],
  transitioning: false
};

const screens = {
  start: document.getElementById('startScreen'),
  game: document.getElementById('gameScreen'),
  results: document.getElementById('resultsScreen')
};

const startBtn = document.getElementById('startBtn');
const playAgainBtn = document.getElementById('playAgainBtn');

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

const appShell =
  document.getElementById('appShell');

const warpCanvas =
  document.getElementById('warpCanvas');

const galaxyFlash =
  document.getElementById('galaxyFlash');

const resultsContent =
  document.getElementById('resultsContent');

let warpCtx = null;
let warpStars = [];
let warpRAF = null;
let warpAnimStart = 0;
let warpAccelMsActive = WARP_ACCEL_MS;


/* ============================================================
   SCREEN CONTROL
   ============================================================ */

function showScreen(name) {

  Object.values(screens).forEach(screen => {
    screen.classList.remove('active');
  });

  screens[name].classList.add('active');
}


/* ============================================================
   BACKGROUND STARS
   ============================================================ */

function createBackgroundStars() {

  starField.innerHTML = '';

  for (let i = 0; i < STAR_COUNT; i++) {

    const star = document.createElement('span');

    star.className = 'star';

    const sizeRoll = Math.random();

    if (sizeRoll < .18) {
      star.classList.add('big');
    } else if (sizeRoll < .55) {
      star.classList.add('small');
    }

    star.style.left =
      `${Math.random() * 100}%`;

    star.style.top =
      `${Math.random() * 100}%`;

    star.style.setProperty(
      '--twinkle',
      `${2 + Math.random() * 4}s`
    );

    star.style.setProperty(
      '--delay',
      `${Math.random() * -5}s`
    );

    starField.appendChild(star);
  }
}


/* ============================================================
   HYPERSPACE CANVAS
   ============================================================ */

function setupWarpCanvas() {

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
    Math.min(
      window.devicePixelRatio || 1,
      2
    );

  warpCanvas.width =
    Math.floor(
      window.innerWidth * dpr
    );

  warpCanvas.height =
    Math.floor(
      window.innerHeight * dpr
    );

  warpCanvas.style.width =
    `${window.innerWidth}px`;

  warpCanvas.style.height =
    `${window.innerHeight}px`;

  warpCtx.setTransform(
    dpr,
    0,
    0,
    dpr,
    0,
    0
  );
}


function initWarpStars(count) {

  const cx =
    window.innerWidth / 2;

  const cy =
    window.innerHeight / 2;

  const maxDepth =
    Math.max(
      window.innerWidth,
      window.innerHeight
    );

  warpStars = [];

  for (let i = 0; i < count; i++) {

    const angle =
      Math.random() * Math.PI * 2;

    const radius =
      Math.pow(
        Math.random(),
        .55
      ) * maxDepth;

    warpStars.push({
      x:
        cx + Math.cos(angle) * radius,

      y:
        cy + Math.sin(angle) * radius,

      z:
        Math.random() * maxDepth + 20,

      pz:
        Math.random() * maxDepth + 20,

      size:
        .5 + Math.random() * 1.8
    });
  }
}


function stopWarpAnimation() {

  if (warpRAF) {

    cancelAnimationFrame(warpRAF);

    warpRAF = null;
  }

  if (warpCtx) {

    warpCtx.clearRect(
      0,
      0,
      window.innerWidth,
      window.innerHeight
    );
  }
}


function warpFrame(now) {

  if (!warpCtx) return;

  const elapsed =
    now - warpAnimStart;

  const progress =
    Math.min(
      elapsed / warpAccelMsActive,
      1
    );

  const acceleration =
    progress * progress;

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  const cx =
    width / 2;

  const cy =
    height / 2;

  const maxDepth =
    Math.max(width, height);

  warpCtx.clearRect(
    0,
    0,
    width,
    height
  );

  for (const star of warpStars) {

    star.pz = star.z;

    /*
      Smaller z = closer to viewer.
      Moving z toward zero makes the
      star fly toward the viewer.
    */

    star.z -=
      10 + 85 * acceleration;

    if (star.z < 1) {

      const angle =
        Math.random() * Math.PI * 2;

      const radius =
        Math.pow(
          Math.random(),
          .55
        ) * maxDepth;

      star.x =
        cx + Math.cos(angle) * radius;

      star.y =
        cy + Math.sin(angle) * radius;

      star.z =
        maxDepth;

      star.pz =
        maxDepth;
    }

    const sx =
      cx +
      (star.x - cx) /
      star.z *
      maxDepth;

    const sy =
      cy +
      (star.y - cy) /
      star.z *
      maxDepth;

    const px =
      cx +
      (star.x - cx) /
      star.pz *
      maxDepth;

    const py =
      cy +
      (star.y - cy) /
      star.pz *
      maxDepth;

    const brightness =
      Math.min(
        1,
        .25 + acceleration * 1.1
      );

    const lineWidth =
      star.size *
      (.6 + acceleration * 2.8);

    warpCtx.beginPath();

    warpCtx.moveTo(px, py);

    warpCtx.lineTo(sx, sy);

    warpCtx.strokeStyle =
      `rgba(220, 215, 255, ${brightness})`;

    warpCtx.lineWidth =
      lineWidth;

    warpCtx.stroke();
  }

  warpRAF =
    requestAnimationFrame(warpFrame);
}


function playWarp(
  count,
  accelerationMs,
  visibleMs
) {

  if (
    !warpCtx ||
    prefersReducedMotion
  ) {
    return;
  }

  document.body.classList.add('warping');

  warpAccelMsActive =
    accelerationMs;

  initWarpStars(count);

  warpAnimStart =
    performance.now();

  stopWarpAnimation();

  warpRAF =
    requestAnimationFrame(warpFrame);

  warpCanvas.classList.add('active');

  setTimeout(() => {

    warpCanvas.classList.remove(
      'active'
    );

  }, visibleMs);

  setTimeout(() => {

    stopWarpAnimation();

    document.body.classList.remove(
      'warping'
    );

  }, visibleMs + 650);
}


/* ============================================================
   GALAXY ENTRANCE
   ============================================================ */

function beginGalaxyEntrance() {

  if (state.transitioning) {
    return;
  }

  state.transitioning = true;

  startBtn.disabled = true;

  if (prefersReducedMotion) {

    startGame();

    state.transitioning = false;

    startBtn.disabled = false;

    return;
  }

  appShell.classList.add(
    'transition-hide'
  );

  playWarp(
    WARP_STAR_COUNT,
    WARP_ACCEL_MS,
    WARP_ACCEL_MS +
      WARP_HOLD_MS +
      WARP_EXIT_MS
  );

  setTimeout(() => {

    startGame();

  }, WARP_ACCEL_MS + WARP_HOLD_MS);

  setTimeout(() => {

    appShell.classList.remove(
      'transition-hide'
    );

    galaxyFlash.classList.remove(
      'active'
    );

    void galaxyFlash.offsetWidth;

    galaxyFlash.classList.add(
      'active'
    );

  }, WARP_ACCEL_MS +
     WARP_HOLD_MS +
     80);

  setTimeout(() => {

    state.transitioning = false;

    startBtn.disabled = false;

  }, WARP_ACCEL_MS +
     WARP_HOLD_MS +
     WARP_EXIT_MS +
     100);
}


/* ============================================================
   QUESTION / RESULTS GALAXY TRANSITION
   ============================================================ */

/*
   This function can now animate TWO elements:

   exitElement:
      The thing currently on screen.

   enterElement:
      The thing arriving from deep space.

   This is important for:

      Question 7
          ↓
      Mission Complete

   because the results screen is a different DOM element.
*/

function playGalaxyZoomTransition(
  exitElement,
  enterElement,
  onSwap
) {

  if (prefersReducedMotion) {

    onSwap();

    return;
  }

  playWarp(
    QUESTION_WARP_STAR_COUNT,
    QUESTION_WARP_ACCEL_MS,
    QUESTION_TRANSITION_MS * 2 - 50
  );

  /* ----------------------------------------------------------
     CURRENT ELEMENT FLIES AWAY
     ---------------------------------------------------------- */

  exitElement.classList.remove(
    'q-enter',
    'question-landed'
  );

  exitElement.classList.add(
    'q-exit'
  );

  /* ----------------------------------------------------------
     WAIT UNTIL THE OLD ELEMENT HAS TRAVELLED AWAY
     ---------------------------------------------------------- */

  setTimeout(() => {

    /*
      Prepare the new element.
    */

    onSwap();

    enterElement.classList.remove(
      'q-exit',
      'question-landed'
    );

    enterElement.classList.add(
      'q-enter'
    );

    /*
      Force browser to recognize the
      starting position.
    */

    void enterElement.offsetWidth;

    requestAnimationFrame(() => {

      /*
        Remove q-enter.

        CSS transition now makes the
        element fly toward the viewer.
      */

      enterElement.classList.remove(
        'q-enter'
      );

      setTimeout(() => {

        enterElement.classList.add(
          'question-landed'
        );

        setTimeout(() => {

          enterElement.classList.remove(
            'question-landed'
          );

        }, 400);

      }, QUESTION_TRANSITION_MS);

    });

  }, QUESTION_TRANSITION_MS);
}


/* ============================================================
   RANDOM QUESTION SELECTION
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
        Math.random() * (i + 1)
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

  if (
    !Array.isArray(QUESTION_BANK) ||
    QUESTION_BANK.length <
      QUESTIONS_PER_GAME
  ) {

    throw new Error(
      `QUESTION_BANK must contain at least ${QUESTIONS_PER_GAME} questions.`
    );
  }

  return shuffle(
    QUESTION_BANK
  ).slice(
    0,
    QUESTIONS_PER_GAME
  );
}


/* ============================================================
   CONSTELLATION
   ============================================================ */

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

  for (
    let i = 1;
    i < total;
    i++
  ) {

    const x =
      padding + step * i;

    pathD +=
      ` L ${x} ${y}`;
  }

  let nodesSvg = '';

  for (
    let i = 0;
    i < total;
    i++
  ) {

    const x =
      padding + step * i;

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

    const radius =
      i === state.currentIndex &&
      i >= state.results.length
        ? 8
        : 6;

    nodesSvg += `
      <circle
        class="${cls}"
        cx="${x}"
        cy="${y}"
        r="${radius}">
      </circle>
    `;
  }

  constellationEl.innerHTML = `
    <svg
      viewBox="0 0 ${width} ${height}"
      preserveAspectRatio="xMidYMid meet">

      <path
        class="constellation-line"
        d="${pathD}">
      </path>

      ${nodesSvg}

    </svg>
  `;

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
            step * progressIndex
          ) / width
        ) * 100
      : 50;

  const rocket =
    document.createElement('div');

  rocket.className =
    'rocket';

  rocket.setAttribute(
    'aria-hidden',
    'true'
  );

  rocket.textContent =
    '🚀';

  rocket.style.position =
    'absolute';

  rocket.style.left =
    `${xPercent}%`;

  rocket.style.top =
    '50%';

  constellationEl.style.position =
    'relative';

  constellationEl.appendChild(
    rocket
  );
}


/* ============================================================
   GAME FLOW
   ============================================================ */

function startGame() {

  /*
    Make absolutely sure the results overlay
    is cleared when starting a new game.
  */

  screens.results.classList.remove(
    'final-overlay'
  );

  resultsContent.classList.remove(
    'q-enter',
    'question-landed'
  );

  state.roundQuestions =
    pickRoundQuestions();

  state.currentIndex = 0;

  state.score = 0;

  state.results = [];

  showScreen('game');

  renderQuestion();
}


function renderQuestion() {

  state.answeredCurrent =
    false;

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

  letterAudio.currentTime = 0;

  letterAudio.src =
    q.audio;

  playAudioBtn.classList.remove(
    'playing'
  );

  feedbackEl.textContent =
    '';

  feedbackEl.className =
    'feedback';

  nextBtn.style.display =
    'none';

  nextBtn.disabled =
    false;

  optionsGrid.innerHTML =
    '';

  /*
    Create the answer buttons.
  */

  shuffle(q.options).forEach(
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

  playCurrentAudio();
}


/* ============================================================
   AUDIO
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


playAudioBtn.addEventListener(
  'click',
  () => {

    letterAudio.currentTime = 0;

    playCurrentAudio();
  }
);


/* ============================================================
   ANSWERS
   ============================================================ */

function handleAnswer(
  selectedLetter,
  btnEl,
  correctLetter
) {

  if (
    state.answeredCurrent ||
    state.transitioning
  ) {
    return;
  }

  state.answeredCurrent =
    true;

  const buttons =
    [
      ...optionsGrid.querySelectorAll(
        '.option-btn'
      )
    ];

  buttons.forEach(
    btn => {
      btn.disabled = true;
    }
  );

  if (
    selectedLetter ===
    correctLetter
  ) {

    state.score++;

    state.results.push(
      true
    );

    btnEl.classList.add(
      'correct'
    );

    feedbackEl.textContent =
      '✨ Correct! ✨';

    feedbackEl.className =
      'feedback correct';

  } else {

    state.results.push(
      false
    );

    btnEl.classList.add(
      'wrong'
    );

    const correctBtn =
      buttons.find(
        btn =>
          btn.textContent ===
          correctLetter
      );

    if (correctBtn) {

      correctBtn.classList.add(
        'correct'
      );
    }

    feedbackEl.textContent =
      `The answer was ${correctLetter}!`;

    feedbackEl.className =
      'feedback wrong';
  }

  scoreCounter.textContent =
    `Score: ${state.score} / ${state.currentIndex + 1}`;

  renderConstellation();

  /*
    THIS IS IMPORTANT.

    The Next button is still displayed
    exactly as before.

    Therefore Question 7 also requires
    the user to press Next.
  */

  nextBtn.style.display =
    'inline-flex';
}


/* ============================================================
   NEXT QUESTION
   ============================================================ */

function goToNextQuestion() {

  if (
    !state.answeredCurrent ||
    state.transitioning
  ) {
    return;
  }

  state.transitioning =
    true;

  nextBtn.disabled =
    true;

  const questionContent =
    document.getElementById(
      'questionContent'
    );

  const isLastQuestion =
    state.currentIndex >=
    state.roundQuestions.length - 1;


  /* ==========================================================
     NORMAL QUESTION → NEXT QUESTION
     ========================================================== */

  if (!isLastQuestion) {

    state.currentIndex++;

    playGalaxyZoomTransition(
      questionContent,
      questionContent,
      () => {

        renderQuestion();

      }
    );

    setTimeout(() => {

      state.transitioning =
        false;

      nextBtn.disabled =
        false;

    }, QUESTION_TRANSITION_MS + 100);

    return;
  }


  /* ==========================================================
     QUESTION 7 → MISSION COMPLETE
     ========================================================== */

  /*
    We DON'T immediately call showScreen('results').

    If we did, Question 7 would disappear immediately.

    Instead:

      1. Question 7 flies away.
      2. Results screen is temporarily placed
         over the game screen.
      3. Mission Complete starts deep in space.
      4. Mission Complete flies toward us.
      5. Only after the animation finishes do
         we officially switch to the results screen.
  */

  playGalaxyZoomTransition(
    questionContent,
    resultsContent,
    () => {

      /*
        Fill in the results first.
      */

      populateResults();

      /*
        Keep the game screen active for
        the transition, but temporarily
        place the results screen over it.
      */

      screens.results.classList.add(
        'active'
      );

      screens.results.classList.add(
        'final-overlay'
      );
    }
  );

  /*
    Once the results have fully arrived,
    officially switch to the results screen.
  */

  setTimeout(() => {

    showScreen('results');

    screens.results.classList.remove(
      'final-overlay'
    );

    state.transitioning =
      false;

    nextBtn.disabled =
      false;

  }, QUESTION_TRANSITION_MS * 2 + 100);
}


/* ============================================================
   RESULTS
   ============================================================ */

/*
   Populate results WITHOUT switching screens.

   This allows the results to be animated
   while Question 7 is still technically
   on the game screen.
*/

function populateResults() {

  const total =
    state.roundQuestions.length;

  resultsScore.textContent =
    `${state.score} / ${total} Correct!`;

  if (
    state.score === total
  ) {

    resultsMsg.textContent =
      '🌟 Perfect mission! You caught every letter!';

  } else if (
    state.score >=
    Math.ceil(total * .7)
  ) {

    resultsMsg.textContent =
      '🚀 Amazing flying! Your listening skills are growing!';

  } else if (
    state.score >=
    Math.ceil(total * .5)
  ) {

    resultsMsg.textContent =
      '✨ Nice work, Space Explorer! Keep practising!';

  } else {

    resultsMsg.textContent =
      '🌙 Good try! Fly again and listen carefully!';
  }

  resultsStars.textContent =
    state.results
      .map(
        correct =>
          correct ? '⭐' : '☆'
      )
      .join(' ');
}


/*
   This function is kept as a separate
   public results function in case the
   game needs to call it elsewhere.
*/

function showResults() {

  populateResults();

  showScreen('results');
}


/* ============================================================
   PLAY AGAIN
   ============================================================ */

function playAgain() {

  if (state.transitioning) {
    return;
  }

  state.transitioning =
    true;

  playAgainBtn.disabled =
    true;

  if (prefersReducedMotion) {

    startGame();

    state.transitioning =
      false;

    playAgainBtn.disabled =
      false;

    return;
  }

  playWarp(
    WARP_STAR_COUNT,
    WARP_ACCEL_MS,
    WARP_ACCEL_MS +
      WARP_HOLD_MS +
      WARP_EXIT_MS
  );

  resultsContent.style.opacity =
    '0';

  resultsContent.style.transform =
    'scale(.7)';

  setTimeout(() => {

    startGame();

  }, WARP_ACCEL_MS + WARP_HOLD_MS);

  setTimeout(() => {

    resultsContent.style.opacity =
      '';

    resultsContent.style.transform =
      '';

    state.transitioning =
      false;

    playAgainBtn.disabled =
      false;

  }, WARP_ACCEL_MS +
     WARP_HOLD_MS +
     WARP_EXIT_MS);
}


/* ============================================================
   STARTUP
   ============================================================ */

startBtn.addEventListener(
  'click',
  beginGalaxyEntrance
);

playAgainBtn.addEventListener(
  'click',
  playAgain
);

nextBtn.addEventListener(
  'click',
  goToNextQuestion
);

createBackgroundStars();

setupWarpCanvas();
