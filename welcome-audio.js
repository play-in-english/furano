/* ============================================================
WELCOME AUDIO — plays "Welcome to the English Galaxy!" ONCE per
visit flow (shared by index.html and home.html)
============================================================
The welcome audio file (path is relative
to the page, inside your existing audio folder). If the file is
missing or the value is '', this module safely does nothing.

Rules implemented here:
  - One Audio object, created lazily, never duplicated.
  - A sessionStorage flag records that the welcome was delivered
    (or deliberately skipped by leaving the check-in), so it can
    never replay on another screen/page in the same visit.
  - If the browser blocks autoplay, we wait for the FIRST user
    tap/key press and try exactly once more. No retry loops.
============================================================ */
(function () {

  const WELCOME_AUDIO_SRC = 'audio/spaceship-launch.mp3';

  const DONE_KEY = 'galaxyAlphabetQuiz.welcomeAudioDone.v1';

  let audio = null;
  let attempted = false;
  let gestureBound = false;

  function isDone() {
    try { return sessionStorage.getItem(DONE_KEY) === 'true'; }
    catch (e) { return false; }
  }

  function markDone() {
    try { sessionStorage.setItem(DONE_KEY, 'true'); }
    catch (e) { /* ignore */ }
  }

  function getAudio() {
    if (!audio) {
      audio = new Audio(WELCOME_AUDIO_SRC);
      audio.preload = 'auto';
      /* Counts as delivered only once it has really started. */
      audio.addEventListener('playing', markDone, { once: true });
    }
    return audio;
  }

  function bindGestureFallback() {
    if (gestureBound) return;
    gestureBound = true;

    const handler = function () {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('keydown', handler, true);
      if (isDone()) return;
      const p = getAudio().play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* give up quietly */ });
      }
    };

    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('keydown', handler, true);
  }

  function play() {
    if (!WELCOME_AUDIO_SRC) {
      console.warn('welcome-audio.js: WELCOME_AUDIO_SRC is empty — no welcome audio.');
      return;
    }
    if (isDone() || attempted) return;
    attempted = true;

    const p = getAudio().play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { bindGestureFallback(); });
    }
  }

  window.WelcomeAudio = { play: play, markDone: markDone, isDone: isDone };

})();
