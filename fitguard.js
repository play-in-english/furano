/* ============================================================
FIT-TO-SCREEN GUARD — loaded AFTER app.js in game.html
============================================================
Replaces app.js's fitToScreen() with a stricter version so the card
ALWAYS fits inside the visible window (nothing cut off at the bottom,
nothing hidden), whatever the device, window size or browser zoom.

Differences from the original:
  - Uses the real window size (window.innerHeight / innerWidth)
    instead of the <body> height.
  - Measures the card's true content height (scrollHeight), so it
    still shrinks correctly if the layout clamps the card's box.
  - Checks the result and keeps adjusting until it really fits.

app.js still calls fitToScreen() by name from its own
ResizeObserver / resize / orientation handlers, so this override is
picked up automatically. No change to app.js or style.css needed.
============================================================ */
(function () {

  const card = document.querySelector('.card');
  const appShell = document.getElementById('appShell');

  if (!card) {
    return;
  }

  const MIN_SCALE = 0.25;
  const BOTTOM_RESERVE_PX = 16; // room for the card's floating animation

  function ancestorScale() {

    const w = appShell ? appShell.offsetWidth : 0;

    if (w > 0) {
      const k = appShell.getBoundingClientRect().width / w;
      if (k > 0) {
        return k;
      }
    }

    return 1;
  }

  function setScale(s) {
    card.style.setProperty('--fit-scale', s.toFixed(4));
  }

  function guardedFit() {

    const cs = getComputedStyle(document.body);

    const viewH = Math.min(
      window.innerHeight,
      document.documentElement.clientHeight || Infinity
    );

    const viewW = Math.min(
      window.innerWidth,
      document.documentElement.clientWidth || Infinity
    );

    const availH =
      viewH -
      parseFloat(cs.paddingTop) -
      parseFloat(cs.paddingBottom) -
      BOTTOM_RESERVE_PX;

    const availW =
      viewW -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight);

    if (availH <= 0 || availW <= 0) {
      return;
    }

    // 1) Natural (unscaled) size.
    setScale(1);

    const k = ancestorScale();
    const rect = card.getBoundingClientRect();

    const naturalH = Math.max(rect.height / k, card.scrollHeight);
    const naturalW = Math.max(rect.width / k, card.scrollWidth);

    if (naturalH <= 0) {
      return;
    }

    if (naturalH <= availH && naturalW <= availW) {
      return; // already fits at full size
    }

    // 2) First estimate.
    let scale = Math.max(
      MIN_SCALE,
      Math.min(1, availH / naturalH, availW / naturalW) * 0.99
    );

    setScale(scale);

    // 3) Verify and refine (text can re-wrap when scaled).
    for (let i = 0; i < 6; i++) {

      const kk = ancestorScale();
      const r = card.getBoundingClientRect();
      const h = r.height / kk;

      if (h <= 0) {
        return;
      }

      if (h > availH + 1) {

        scale = Math.max(MIN_SCALE, scale * (availH / h) * 0.99);
        setScale(scale);

      } else if (scale < 1 && h < availH * 0.96) {

        scale = Math.min(1, scale * (availH / h) * 0.99);
        setScale(scale);

      } else {

        break;
      }
    }
  }

  // app.js calls fitToScreen() by name, so replacing it is enough.
  window.fitToScreen = guardedFit;

  // Extra triggers, in case the window changes in ways app.js misses.
  let raf = null;

  function schedule() {

    if (raf !== null) {
      return;
    }

    raf = requestAnimationFrame(function () {
      raf = null;
      guardedFit();
    });
  }

  window.addEventListener('resize', schedule);
  window.addEventListener('orientationchange', schedule);
  window.addEventListener('load', schedule);

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule);
  }

  if (window.ResizeObserver) {
    new ResizeObserver(schedule).observe(card);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(schedule);
  }

  schedule();

})();
