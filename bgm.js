/* ============================================================
GALAXY BACKGROUND MUSIC — the one and only music player
============================================================
Loaded by index.html, which is a thin "shell" page that holds the
whole game in an <iframe> (game.html → home.html → game.html ...).
The shell page is never reloaded while the player moves around, so
the music (audio/space-bg.mp3) plays NON-STOP and loops:

  GALAXY HUB → mission level → mission → results → GALAXY HUB ...

Rules
  - The music starts automatically the first time the player reaches
    the GALAXY HUB (so it never talks over the launch sound or the
    Mission Control voice messages).
  - From then on it never stops. The player can only MUTE / UNMUTE it
    (the audio keeps running silently while muted) and change volume.
  - Refreshing the browser or leaving the game ends it.
  - If the browser blocks autoplay, the music starts on the player's
    next tap / key press anywhere in the game.

Button: GREEN speaker = sound on, RED crossed speaker = muted.
Click = mute / unmute + show the volume bar.
============================================================ */
(function () {

  const MUSIC_SRC = 'audio/space-bg.mp3';
  const VOLUME_KEY = 'galaxyAlphabetQuiz.bgmVolume.v1';
  const DEFAULT_VOLUME = 0.8;
  const VOLUME_BAR_HIDE_MS = 4000;

  const frame = document.getElementById('gameFrame');

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  /* ---------- styles ---------- */

  const style = document.createElement('style');

  style.textContent = `
    .space-music {
      position: fixed;
      left: max(14px, env(safe-area-inset-left));
      bottom: max(14px, env(safe-area-inset-bottom));
      z-index: 9999;
      display: none;
      align-items: center;
      gap: 10px;
      max-width: calc(100vw - 28px);
      font-family: "Baloo 2", "Trebuchet MS", sans-serif;
    }
    .space-music.available { display: flex; }
    .space-music-btn {
      flex: none;
      width: 62px;
      height: 62px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      cursor: pointer;
      background: #e63946;
      box-shadow: 0 0 16px rgba(230, 57, 70, 0.6), 0 4px 14px rgba(0, 0, 0, 0.4);
      transition: transform .2s ease, background .25s ease, box-shadow .25s ease;
      touch-action: manipulation;
      -webkit-tap-highlight-color: transparent;
    }
    .space-music-btn.is-on {
      background: #22c55e;
      box-shadow: 0 0 18px rgba(34, 197, 94, 0.7), 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .space-music-btn:hover { transform: scale(1.08); }
    .space-music-btn:active { transform: scale(0.95); }
    .space-music-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
    .space-music-btn svg {
      width: 30px;
      height: 30px;
      display: block;
      fill: #fff;
      stroke: #fff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
    }
    .space-music-btn .waves,
    .space-music-btn .cross { fill: none; }
    .space-music-btn .cross { display: none; }
    .space-music-btn:not(.is-on) .waves { display: none; }
    .space-music-btn:not(.is-on) .cross { display: inline; }

    .space-music-volume {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 999px;
      background: rgba(18, 22, 55, 0.88);
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
      opacity: 0;
      transform: translateX(-10px);
      pointer-events: none;
      visibility: hidden;
      transition: opacity .2s ease, transform .2s ease, visibility 0s linear .2s;
    }
    .space-music.show-volume .space-music-volume,
    .space-music:focus-within .space-music-volume {
      opacity: 1;
      transform: translateX(0);
      pointer-events: auto;
      visibility: visible;
      transition: opacity .2s ease, transform .2s ease, visibility 0s;
    }
    .space-music-volume-icon { font-size: 18px; line-height: 1; }
    .space-music-slider {
      -webkit-appearance: none;
      appearance: none;
      width: clamp(90px, 28vw, 150px);
      height: 8px;
      margin: 0;
      border-radius: 999px;
      outline: none;
      cursor: pointer;
      touch-action: none;
      background: linear-gradient(
        to right,
        #4fe3c1 0%,
        #4fe3c1 var(--vol, 80%),
        rgba(255, 255, 255, 0.25) var(--vol, 80%),
        rgba(255, 255, 255, 0.25) 100%
      );
    }
    .space-music-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid #4fe3c1;
      box-shadow: 0 0 8px rgba(79, 227, 193, 0.7);
    }
    .space-music-slider::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid #4fe3c1;
      box-shadow: 0 0 8px rgba(79, 227, 193, 0.7);
    }
    .space-music-slider:focus-visible { box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.6); }
    .space-music-percent {
      min-width: 2.6em;
      text-align: right;
      font-weight: 700;
      font-size: 14px;
      color: #fff;
    }
    @media (prefers-reduced-motion: reduce) {
      .space-music-btn, .space-music-volume { transition: none; }
    }
  `;

  document.head.appendChild(style);

  /* ---------- markup ---------- */

  const wrap = document.createElement('div');

  wrap.className = 'space-music';

  wrap.innerHTML = `
    <button class="space-music-btn" type="button"
            aria-label="Mute background music" title="Mute background music">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"></path>
        <path class="waves" d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"></path>
        <path class="cross" d="M16 9.5l5 5M21 9.5l-5 5"></path>
      </svg>
    </button>
    <div class="space-music-volume">
      <span class="space-music-volume-icon" aria-hidden="true">🔉</span>
      <input class="space-music-slider" type="range" min="0" max="100" step="1"
             value="80" aria-label="Background music volume">
      <span class="space-music-percent">80%</span>
    </div>
  `;

  document.body.appendChild(wrap);

  const btn = wrap.querySelector('.space-music-btn');
  const slider = wrap.querySelector('.space-music-slider');
  const percent = wrap.querySelector('.space-music-percent');

  /* ---------- audio ---------- */

  const music = new Audio(MUSIC_SRC);

  music.loop = true;
  music.preload = 'auto';

  let started = false;   // set once the Galaxy Hub has been reached

  function applyVolume(v01, save) {

    const v = Math.min(1, Math.max(0, v01));
    const pct = Math.round(v * 100);

    music.volume = v;
    slider.value = String(pct);
    slider.style.setProperty('--vol', pct + '%');
    percent.textContent = pct + '%';

    if (save) {
      lsSet(VOLUME_KEY, String(v));
    }
  }

  const savedVolume = parseFloat(lsGet(VOLUME_KEY));

  applyVolume(isFinite(savedVolume) ? savedVolume : DEFAULT_VOLUME, false);

  function updateButton() {

    const on = !music.paused && !music.muted;

    btn.classList.toggle('is-on', on);

    const label = on
      ? 'Mute background music'
      : 'Unmute background music';

    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  /* ---------- volume bar ---------- */

  let hideTimer = null;

  function showVolumeBar() {
    wrap.classList.add('show-volume');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideVolumeBar, VOLUME_BAR_HIDE_MS);
  }

  function hideVolumeBar() {
    clearTimeout(hideTimer);
    if (document.activeElement === slider) {
      slider.blur();
    }
    wrap.classList.remove('show-volume');
  }

  // A tap outside the control (in the game frame or on this page) closes it.
  document.addEventListener('pointerdown', function (event) {
    if (!wrap.contains(event.target)) {
      hideVolumeBar();
    }
  });

  wrap.addEventListener('pointerdown', function () {
    if (wrap.classList.contains('show-volume')) {
      showVolumeBar();
    }
  });

  slider.addEventListener('input', function () {

    applyVolume(slider.value / 100, true);

    // Raising the volume while muted turns the sound back on.
    if (music.muted && slider.value > 0) {
      music.muted = false;
    }

    updateButton();
    showVolumeBar();
  });

  /* ---------- keep it playing, always ---------- */

  function resumeIfNeeded() {
    if (started && music.paused) {
      const p = music.play();
      if (p && typeof p.catch === 'function') {
        p.catch(function () { /* wait for the next gesture */ });
      }
    }
  }

  // Nothing in the game may stop the music. If the browser pauses it
  // (audio interruption etc.), start it again.
  music.addEventListener('pause', function () {
    updateButton();
    setTimeout(resumeIfNeeded, 250);
  });

  music.addEventListener('play', updateButton);
  music.addEventListener('playing', updateButton);

  // Taps / key presses inside the game frame (a separate document)
  // and on this page: if the music is waiting on autoplay, start it.
  const watchedDocs = new WeakSet();

  function watchGestures(doc) {

    if (!doc || watchedDocs.has(doc)) {
      return;
    }

    watchedDocs.add(doc);

    ['pointerdown', 'keydown', 'touchstart'].forEach(function (type) {
      doc.addEventListener(type, resumeIfNeeded, true);
    });
  }

  watchGestures(document);

  /* ---------- start when the GALAXY HUB appears ---------- */

  function startMusic() {

    if (started) {
      return;
    }

    started = true;

    wrap.classList.add('available');

    const p = music.play();

    if (p && typeof p.then === 'function') {
      p.then(updateButton).catch(updateButton);
    }

    updateButton();
  }

  frame.addEventListener('load', function () {

    let path = '';

    try {
      watchGestures(frame.contentDocument);
      path = frame.contentWindow.location.pathname || '';
    } catch (e) {
      /* cross-origin (e.g. file://): fall back to the frame's src */
      path = frame.getAttribute('src') || '';
    }

    if (/home\.html$/i.test(path)) {
      startMusic();
    }
  });

  /* ---------- the button: MUTE / UNMUTE only ---------- */

  btn.addEventListener('click', function () {

    if (music.paused) {
      // Autoplay had been blocked: this tap starts the music.
      music.muted = false;
      resumeIfNeeded();
    } else {
      music.muted = !music.muted;
    }

    updateButton();
    showVolumeBar();
  });

})();
