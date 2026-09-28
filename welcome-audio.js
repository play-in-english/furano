/* ============================================================
GALAXY AUDIO — launch / welcome / welcome-back
(shared by index.html and home.html)
============================================================
Three sounds, all inside the audio/ folder:

  spaceship-launch.mp3
    Plays together with the cinematic launch intro on index.html,
    for EVERY player (first-time and returning). Its playback speed
    is slowed automatically so the sound lasts as long as the intro
    (LAUNCH_INTRO_DURATION_MS, passed in from app.js). It never
    plays faster than normal speed.

  spaceship-welcome.mp3
    Plays at the GALAXY HUB (home.html), right after the launch
    intro, ONLY for the first check-in of the day (the player who
    has just typed their nickname).

  spaceship-welcomeback.mp3
    Plays at the GALAXY HUB for RETURNING players (nickname already
    saved for today).

Rules implemented here:
  - The hub greeting plays at most once per visit. A sessionStorage
    flag records that it has really started, so going back and forth
    between the Hub and the game never replays it.
  - Every time the launch intro plays (a fresh visit) the hub-greeting
    flag is reset, so returning players hear "welcome back" again
    after each launch.
  - The game opens on a "TAP TO LAUNCH" homepage (app.js). The tap is
    what lets the browser play sound, so the launch sound and the
    cinematic intro start together, perfectly in sync.
  - If the hub greeting is blocked, we wait for the FIRST user tap /
    key press and try exactly once more. No retry loops.
  - If a file is missing or its path is '', that sound is safely
    skipped.

Public API (window.WelcomeAudio):
  preloadLaunch(ms)       — call while the TAP TO LAUNCH homepage shows
  playLaunch(durationMs)  — call on the tap; returns a Promise
  markFirstCheckin()      — call when the nickname is submitted
  playHubGreeting()       — call when the Galaxy Hub loads
============================================================ */
(function () {

  const LAUNCH_AUDIO_SRC = 'audio/spaceship-launch.mp3';
  const WELCOME_AUDIO_SRC = 'audio/spaceship-welcome.mp3';
  const WELCOMEBACK_AUDIO_SRC = 'audio/spaceship-welcomeback.mp3';

  // Set once the hub greeting has really started playing.
  const DONE_KEY = 'galaxyAlphabetQuiz.hubGreetingDone.v2';

  // 'welcome' = the player just did their first check-in of the day.
  const KIND_KEY = 'galaxyAlphabetQuiz.hubGreetingKind.v2';

  // The launch sound is only ever slowed down, and never below this.
  const MIN_PLAYBACK_RATE = 0.5;

  // Volume fade-out at the very end of the launch sound.
  const LAUNCH_FADE_MS = 400;

  /* ---------- safe sessionStorage ---------- */

  function sGet(key) {
    try { return sessionStorage.getItem(key); }
    catch (e) { return null; }
  }

  function sSet(key, value) {
    try { sessionStorage.setItem(key, value); }
    catch (e) { /* ignore */ }
  }

  function sRemove(key) {
    try { sessionStorage.removeItem(key); }
    catch (e) { /* ignore */ }
  }

  /* ---------- shared helpers ---------- */

  function makeAudio(src) {
    const a = new Audio(src);
    a.preload = 'auto';
    return a;
  }

  // Waits for the first tap / key press, then runs `fn` once.
  function onFirstGesture(fn) {
    const handler = function () {
      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('keydown', handler, true);
      fn();
    };
    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('keydown', handler, true);
  }

  // play() with a single quiet fallback for blocked autoplay.
  function tryPlay(audio, onBlocked) {
    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function (error) {
        console.warn(
          'welcome-audio.js: could not play ' + audio.src + ' —',
          error && error.name ? error.name : error
        );
        if (onBlocked) onBlocked();
      });
    }
  }

  /* ============================================================
     LAUNCH SOUND (with the cinematic intro)
     ============================================================ */

  let launchAudio = null;
  let launchActive = false;
  let launchFadeTimer = null;
  let launchEndTimer = null;

  function stopLaunch() {
    launchActive = false;

    if (launchFadeTimer) {
      clearInterval(launchFadeTimer);
      launchFadeTimer = null;
    }

    if (launchEndTimer) {
      clearTimeout(launchEndTimer);
      launchEndTimer = null;
    }

    if (launchAudio) {
      try { launchAudio.pause(); } catch (e) { /* ignore */ }
    }
  }

  function fadeOutLaunch() {
    if (!launchAudio || launchAudio.paused) {
      return;
    }

    const steps = 10;
    const stepMs = LAUNCH_FADE_MS / steps;
    let n = 0;
    const startVol = launchAudio.volume;

    launchFadeTimer = setInterval(function () {
      n++;
      if (!launchAudio) return;
      launchAudio.volume = Math.max(0, startVol * (1 - n / steps));
      if (n >= steps) {
        clearInterval(launchFadeTimer);
        launchFadeTimer = null;
      }
    }, stepMs);
  }

  // Stretches the sound so it lasts about `targetSeconds`.
  function fitRateToDuration(audio, targetSeconds) {
    const apply = function () {
      const naturalSeconds = audio.duration;

      if (!isFinite(naturalSeconds) || naturalSeconds <= 0) {
        return;
      }

      // Slower only: never faster than normal speed.
      const rate = Math.min(
        1,
        Math.max(MIN_PLAYBACK_RATE, naturalSeconds / targetSeconds)
      );

      // Keep the voice/sound at its normal pitch while slowed down.
      audio.preservesPitch = true;
      audio.mozPreservesPitch = true;
      audio.webkitPreservesPitch = true;

      audio.playbackRate = rate;
    };

    if (audio.readyState >= 1) {
      apply();
    } else {
      audio.addEventListener('loadedmetadata', apply, { once: true });
    }
  }

  // Creates and loads the launch sound ahead of time (while the
  // TAP TO LAUNCH homepage is showing) so it can start instantly.
  function preloadLaunch(durationMs) {

    if (!LAUNCH_AUDIO_SRC || launchAudio) {
      return;
    }

    const totalMs = Math.max(1000, Number(durationMs) || 5600);

    launchAudio = makeAudio(LAUNCH_AUDIO_SRC);

    fitRateToDuration(launchAudio, totalMs / 1000);

    try { launchAudio.load(); } catch (e) { /* ignore */ }
  }

  // Returns a Promise that resolves to:
  //   'playing' — the sound has started
  //   'blocked' — the browser blocked autoplay (a tap is needed first)
  //   'failed'  — the file is missing or cannot be played
  function playLaunch(durationMs) {

    // A launch intro means a fresh visit: the hub greeting may play
    // again afterwards (welcome-back for returning players).
    sRemove(DONE_KEY);

    if (!LAUNCH_AUDIO_SRC) {
      return Promise.resolve('failed');
    }

    const totalMs = Math.max(1000, Number(durationMs) || 5600);

    // Reuse the same Audio object if this is a retry after a tap.
    if (!launchAudio) {
      launchAudio = makeAudio(LAUNCH_AUDIO_SRC);
      fitRateToDuration(launchAudio, totalMs / 1000);
    }

    if (launchFadeTimer) {
      clearInterval(launchFadeTimer);
      launchFadeTimer = null;
    }

    if (launchEndTimer) {
      clearTimeout(launchEndTimer);
      launchEndTimer = null;
    }

    launchAudio.volume = 1;

    try { launchAudio.currentTime = 0; } catch (e) { /* ignore */ }

    console.log('welcome-audio.js: starting launch sound', launchAudio.src);

    return Promise.resolve(launchAudio.play()).then(
      function () {

        launchActive = true;

        // Fade out at the end and never run past the intro.
        launchEndTimer = setTimeout(function () {
          fadeOutLaunch();

          launchEndTimer = setTimeout(stopLaunch, LAUNCH_FADE_MS + 50);
        }, Math.max(0, totalMs - LAUNCH_FADE_MS));

        return 'playing';
      },
      function (error) {

        console.warn(
          'welcome-audio.js: launch sound did not start —',
          error && error.name ? error.name : error
        );

        return (error && error.name === 'NotAllowedError')
          ? 'blocked'
          : 'failed';
      }
    );
  }

  /* ============================================================
     HUB GREETING (Galaxy Hub — home.html)
     ============================================================ */

  let hubAudio = null;
  let hubAttempted = false;

  function isHubDone() {
    return sGet(DONE_KEY) === 'true';
  }

  // Called when the nickname is submitted on GALAXY CHECK-IN, so the
  // hub knows to play the FIRST-CHECK-IN welcome instead of welcome-back.
  function markFirstCheckin() {
    sSet(KIND_KEY, 'welcome');
    sRemove(DONE_KEY);
  }

  function playHubGreeting() {

    if (hubAttempted || isHubDone()) {
      return;
    }

    hubAttempted = true;

    const isFirstCheckin = sGet(KIND_KEY) === 'welcome';

    const src =
      isFirstCheckin
        ? WELCOME_AUDIO_SRC
        : WELCOMEBACK_AUDIO_SRC;

    if (!src) {
      console.warn('welcome-audio.js: hub greeting path is empty — no audio.');
      return;
    }

    hubAudio = makeAudio(src);

    // Counts as delivered only once it has really started playing.
    hubAudio.addEventListener('playing', function () {
      sSet(DONE_KEY, 'true');
      sRemove(KIND_KEY);
    }, { once: true });

    tryPlay(hubAudio, function () {
      onFirstGesture(function () {
        if (isHubDone()) return;
        tryPlay(hubAudio, null);
      });
    });
  }

  window.WelcomeAudio = {
    preloadLaunch: preloadLaunch,
    playLaunch: playLaunch,
    markFirstCheckin: markFirstCheckin,
    playHubGreeting: playHubGreeting
  };

})();
