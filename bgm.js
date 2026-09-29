/* ============================================================
GALAXY BACKGROUND MUSIC — shared by home.html and index.html
============================================================
One script, two pages. The music (audio/space-bg.mp3) keeps playing
while the player moves between the GALAXY HUB (home.html) and the
missions (index.html), because each page saves the playback position
and the next page resumes from it (only a tiny gap while the page loads).

It stops when the player:
  - refreshes the browser (the music restarts fresh at the Hub), or
  - leaves the game (closes the tab / browser).

How each page loads it:
  home.html   <script src="bgm.js" data-when="always"></script>
  index.html  <script src="bgm.js" data-when="mission"></script>
              (mission = only when the player arrived from the Hub's
               START button, so the launch sound and the Mission
               Control voice messages never fight with the music.)
   MUST load BEFORE app.js on index.html, because app.js clears the
   launchMission1 flag as soon as it runs.

Play button: GREEN = playing, RED = off. Click = toggle + show the
volume bar. If the player turns the music off, it stays off until
they turn it on again (or refresh).
============================================================ */
(function () {

  if (window.SpaceBGM) {
    return;
  }

  const SCRIPT = document.currentScript;
  const WHEN = (SCRIPT && SCRIPT.dataset.when) || 'always';

  const MUSIC_SRC = 'audio/space-bg.mp3';

  const VOLUME_KEY = 'galaxyAlphabetQuiz.bgmVolume.v1'; // localStorage
  const OFF_KEY = 'galaxyAlphabetQuiz.bgmOff.v1';       // sessionStorage
  const TIME_KEY = 'galaxyAlphabetQuiz.bgmTime.v1';     // sessionStorage

  const DEFAULT_VOLUME = 0.8;
  const VOLUME_BAR_HIDE_MS = 4000;
  const SAVE_EVERY_MS = 400;

  /* ---------- safe storage ---------- */

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  function ssRemove(k) { try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ } }

  /* ---------- should the music run on this page? ---------- */

  // Read NOW: app.js removes this flag a moment later.
  const arrivedFromHubStart = ssGet('launchMission1') === 'true';

  if (WHEN === 'mission' && !arrivedFromHubStart) {
    return;
  }

  /* ---------- refresh = start over ---------- */

  let isReload = false;

  try {
    const nav = performance.getEntriesByType('navigation')[0];
    isReload = nav
      ? nav.type === 'reload'
      : (performance.navigation && performance.navigation.type === 1);
  } catch (e) { /* ignore */ }

  if (isReload) {
    ssRemove(OFF_KEY);
    ssRemove(TIME_KEY);
  }

  /* ---------- styles ---------- */

  const style = document.createElement('style');

  style.textContent = `
    .space-music {
      position: fixed;
      left: max(14px, env(safe-area-inset-left));
      bottom: max(14px, env(safe-area-inset-bottom));
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: calc(100vw - 28px);
      margin: 0;
      padding: 0;
      text-shadow: none;
    }
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
    .space-music-btn.is-playing {
      background: #22c55e;
      box-shadow: 0 0 18px rgba(34, 197, 94, 0.7), 0 4px 14px rgba(0, 0, 0, 0.4);
    }
    .space-music-btn:hover { transform: scale(1.08); }
    .space-music-btn:active { transform: scale(0.95); }
    .space-music-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
    .space-music-btn svg {
      width: 28px;
      height: 28px;
      display: block;
      margin-left: 3px;
      fill: #fff;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
    }
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
      font-family: "Baloo 2", "Trebuchet MS", sans-serif;
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
            aria-label="Turn background music on"
            title="Turn background music on">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 3.5v17a1 1 0 0 0 1.5.86l14-8.5a1 1 0 0 0 0-1.72l-14-8.5A1 1 0 0 0 6 3.5z"></path>
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

  // Resume from where the previous page left off.
  const savedTime = parseFloat(ssGet(TIME_KEY));

  if (isFinite(savedTime) && savedTime > 0) {

    const seek = function () {
      if (isFinite(music.duration) && music.duration > 0) {
        try { music.currentTime = savedTime % music.duration; }
        catch (e) { /* ignore */ }
      }
    };

    if (music.readyState >= 1) {
      seek();
    } else {
      music.addEventListener('loadedmetadata', seek, { once: true });
    }
  }

  function saveTime() {
    if (isFinite(music.currentTime)) {
      ssSet(TIME_KEY, String(music.currentTime));
    }
  }

  setInterval(function () {
    if (!music.paused) {
      saveTime();
    }
  }, SAVE_EVERY_MS);

  window.addEventListener('pagehide', saveTime);
  window.addEventListener('beforeunload', saveTime);

  /* ---------- volume ---------- */

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

  slider.addEventListener('input', function () {
    applyVolume(slider.value / 100, true);
    showVolumeBar();
  });

  /* ---------- volume bar show / hide ---------- */

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

  /* ---------- button look ---------- */

  function updateButton() {

    const playing = !music.paused;

    btn.classList.toggle('is-playing', playing);

    const label = playing
      ? 'Turn background music off'
      : 'Turn background music on';

    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
  }

  music.addEventListener('playing', updateButton);
  music.addEventListener('play', updateButton);
  music.addEventListener('pause', updateButton);

  /* ---------- play / pause ---------- */

  let gestureArmed = false;

  function armFirstGestureStart() {

    if (gestureArmed) {
      return;
    }

    gestureArmed = true;

    const handler = function (event) {

      if (event.target && wrap.contains(event.target)) {
        return;
      }

      document.removeEventListener('pointerdown', handler, true);
      document.removeEventListener('keydown', handler, true);
      gestureArmed = false;

      if (music.paused && ssGet(OFF_KEY) !== 'true') {
        startMusic();
      }
    };

    document.addEventListener('pointerdown', handler, true);
    document.addEventListener('keydown', handler, true);
  }

  function startMusic() {

    const p = music.play();

    if (p && typeof p.then === 'function') {
      p.then(updateButton).catch(function () {
        // Autoplay blocked: start on the first tap / key press.
        updateButton();
        armFirstGestureStart();
      });
    }
  }

  btn.addEventListener('click', function () {

    if (music.paused) {
      ssRemove(OFF_KEY);
      startMusic();
    } else {
      ssSet(OFF_KEY, 'true');
      music.pause();
      saveTime();
      updateButton();
    }

    showVolumeBar();
  });

  /* ---------- auto-start ---------- */

  if (ssGet(OFF_KEY) === 'true') {
    updateButton();
  } else {
    startMusic();
  }

  window.SpaceBGM = { audio: music };

})();
