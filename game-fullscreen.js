/* =============================================================
   GAME FULLSCREEN — shared by Stellar Invaders, Stellar
   Singularity and 808 Defender.

   GameFullscreen.init({
       wrapper:     '.invaders-cabinet',   // element that goes fullscreen
       canvas:      '#invaders-screen',    // the game canvas (intrinsic size = aspect)
       button:      '#inv-fs',             // the FULLSCREEN button
       orientation: 'landscape'            // 'landscape' | 'portrait': best on phones
   });

   How it works
   - Desktop and Android: native Fullscreen API on the wrapper, plus
     screen.orientation.lock() to the preferred orientation when allowed.
   - iPhone (no Fullscreen API for elements): CSS fallback that pins the
     wrapper to the viewport (position: fixed) and hides the page behind it.
   - In both modes the wrapper gets class "game-fs" and <html> gets
     "game-fs-active". The canvas is sized by JS to the largest size that
     fits next to the visible controls (mute/fullscreen row, touch buttons,
     name entry), keeping its aspect ratio.
   - On small screens a rotate hint is shown while the phone is held the
     wrong way for this game. The hint can be dismissed.
   - On-screen keyboard (name entry for the hall of fame): phones keep
     the layout viewport at full height and let the keyboard cover the
     bottom half. layout() reads window.visualViewport and turns the
     hidden part into padding on the wrapper (top for the scrolled-away
     part on iOS, bottom for the keyboard), so the canvas shrinks and the
     name field stays in the visible area above the keyboard.
   - Keys: F toggles fullscreen (not while typing in a field), Escape exits.
     The LLOYDOS terminal shortcut (T) is suppressed while fullscreen.
   - Phones go fullscreen by themselves: the first tap on the canvas or
     on the game's touch buttons (not on mute/fullscreen/name fields)
     enters fullscreen inside that same gesture, which is what the
     Fullscreen API needs. Only on small coarse-pointer screens, once
     per page load, and never again after the player has left
     fullscreen on purpose. Pass autoFullscreen: false to opt out.
   ============================================================= */
(function () {
    'use strict';

    var ROTATE_TEXT = {
        landscape: 'Turn your phone sideways for the full arcade screen.',
        portrait: 'Hold your phone upright to see the whole playfield.'
    };

    /* The site lays CRT scanlines and a vignette over the whole page
       (body::before / body::after in styles.css, clipped by the custom
       property --crt-overlay-clip). A game cabinet gets a hole in those
       layers so the game itself is shown clean. Same trick as /lyrics/. */
    function keepOverlaysOff(el) {
        var body = document.body;
        var raf = 0;
        function update() {
            raf = 0;
            var r = el.getBoundingClientRect();
            var vw = window.innerWidth, vh = window.innerHeight;
            if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) {
                body.style.setProperty('--crt-overlay-clip', 'none');
                return;
            }
            var L = Math.max(0, r.left).toFixed(1), T = Math.max(0, r.top).toFixed(1);
            var R = Math.min(vw, r.right).toFixed(1), B = Math.min(vh, r.bottom).toFixed(1);
            body.style.setProperty('--crt-overlay-clip',
                'polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ' +
                L + 'px ' + T + 'px, ' + R + 'px ' + T + 'px, ' + R + 'px ' + B + 'px, ' + L + 'px ' + B + 'px, ' + L + 'px ' + T + 'px)');
        }
        function schedule() { if (!raf) raf = requestAnimationFrame(update); }
        window.addEventListener('scroll', schedule, { passive: true });
        window.addEventListener('resize', schedule);
        ['fullscreenchange', 'webkitfullscreenchange'].forEach(function (ev) {
            document.addEventListener(ev, function () { setTimeout(schedule, 50); });
        });
        if ('ResizeObserver' in window) new ResizeObserver(schedule).observe(el);
        /* the CRT jitter moves .container on scroll with a slight delay */
        setInterval(function () { if (!document.hidden) schedule(); }, 500);
        update();
        return schedule;
    }

    function init(cfg) {
        var wrap = document.querySelector(cfg.wrapper);
        var canvas = document.querySelector(cfg.canvas);
        var btn = document.querySelector(cfg.button);
        if (!wrap || !canvas || !btn) return;
        var refreshHole = keepOverlaysOff(wrap);

        var aspect = canvas.width / canvas.height;
        var pref = cfg.orientation === 'portrait' ? 'portrait' : 'landscape';
        var active = false;
        var nativeMode = false;
        var hintDismissed = false;
        var hintState = null;      /* 'mismatch' | 'ok' */
        var autoAllowed = cfg.autoFullscreen !== false;
        var autoDone = false;      /* auto-entered once, or the player left fullscreen on purpose */

        /* ---- chrome inside the wrapper: exit button + rotate hint ---- */
        var exitBtn = document.createElement('button');
        exitBtn.type = 'button';
        exitBtn.className = 'game-fs-exit';
        exitBtn.setAttribute('aria-label', 'Exit fullscreen');
        exitBtn.innerHTML = 'EXIT <span aria-hidden="true">&#x2715;</span>';
        exitBtn.hidden = true;
        exitBtn.addEventListener('click', exit);
        wrap.appendChild(exitBtn);

        var hint = document.createElement('div');
        hint.className = 'game-fs-hint';
        hint.hidden = true;
        hint.innerHTML =
            '<div class="game-fs-hint-icon game-fs-hint-' + pref + '" aria-hidden="true"><i></i></div>' +
            '<p>' + ROTATE_TEXT[pref] + '</p>' +
            '<button type="button" class="game-fs-hint-ok">PLAY ANYWAY</button>';
        hint.querySelector('.game-fs-hint-ok').addEventListener('click', function () {
            hintDismissed = true;
            hint.hidden = true;
            layout();
        });
        wrap.appendChild(hint);

        /* ---- helpers ---- */
        function fsElement() {
            return document.fullscreenElement || document.webkitFullscreenElement || null;
        }

        function canNative() {
            return !!(wrap.requestFullscreen || wrap.webkitRequestFullscreen);
        }

        function isSmallScreen() {
            return Math.min(window.innerWidth, window.innerHeight) < 700;
        }

        function currentOrientation() {
            return window.innerWidth >= window.innerHeight ? 'landscape' : 'portrait';
        }

        function setActive(on, isNative) {
            active = on;
            nativeMode = !!isNative;
            wrap.classList.toggle('game-fs', on);
            wrap.classList.toggle('game-fs-fallback', on && !isNative);
            document.documentElement.classList.toggle('game-fs-active', on);
            exitBtn.hidden = !on;
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.querySelector('.game-fs-label').textContent = on ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
            if (!on) {
                wrap.classList.remove('game-fs-row');
                canvas.style.width = '';
                canvas.style.height = '';
                wrap.style.paddingTop = '';
                wrap.style.paddingBottom = '';
                hint.hidden = true;
                hintDismissed = false;
                hintState = null;
                try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
            } else {
                layout();
                /* give the browser a frame to settle the new viewport */
                requestAnimationFrame(layout);
                setTimeout(layout, 300);
            }
            if (typeof gtag !== 'undefined') {
                gtag('event', on ? 'fullscreen_enter' : 'fullscreen_exit', {
                    'event_category': 'game',
                    'event_label': cfg.canvas.replace('#', ''),
                    'value': 1
                });
            }
        }

        function enter() {
            setTimeout(refreshHole, 450);
            if (active) return;
            if (canNative()) {
                var req = null;
                try {
                    req = wrap.requestFullscreen ? wrap.requestFullscreen({ navigationUI: 'hide' })
                                                 : wrap.webkitRequestFullscreen();
                } catch (e) { req = null; }
                if (req && req.then) {
                    req.then(function () {
                        if (!active) { setActive(true, true); lockOrientation(); }
                    }).catch(function () {
                        if (!active) setActive(true, false);
                    });
                }
                /* safety net: if the browser neither resolves nor fires
                   fullscreenchange (some webviews, old Safari), fall back to the
                   CSS overlay so the button always does something visible */
                setTimeout(function () {
                    if (!active) {
                        if (fsElement() === wrap) { setActive(true, true); lockOrientation(); }
                        else setActive(true, false);
                    }
                }, 400);
            } else {
                setActive(true, false);
            }
        }

        function lockOrientation() {
            if (!isSmallScreen()) return;
            try {
                if (screen.orientation && screen.orientation.lock) {
                    screen.orientation.lock(pref).catch(function () { /* not allowed: hint will do */ });
                }
            } catch (e) { /* unsupported */ }
        }

        function exit() {
            setTimeout(refreshHole, 450);
            if (!active) return;
            autoDone = true;       /* the player chose to leave: do not pull them back in */
            if (nativeMode && fsElement()) {
                var p = document.exitFullscreen ? document.exitFullscreen()
                      : (document.webkitExitFullscreen ? document.webkitExitFullscreen() : null);
                if (p && p.catch) p.catch(function () {});
                /* fullscreenchange handler finishes the job */
            } else {
                setActive(false, false);
            }
        }

        function toggle() { if (active) exit(); else enter(); }

        /* ---- layout: size the canvas to the free space ---- */
        /* the part of the layout viewport the on-screen keyboard (or an
           iOS focus scroll) has pushed out of sight: {top, bottom} in px */
        function hiddenViewport() {
            var vv = window.visualViewport;
            if (!vv || typeof vv.height !== 'number') return { top: 0, bottom: 0 };
            var hidden = window.innerHeight - vv.height;
            if (hidden < 120) return { top: 0, bottom: 0 };          /* no keyboard, just toolbars */
            var top = Math.max(0, Math.round(vv.offsetTop || 0));
            return { top: top, bottom: Math.max(0, Math.round(hidden - top)) };
        }

        function layout() {
            if (!active) return;
            var W = window.innerWidth;
            var H = window.innerHeight;

            /* keyboard open: push the content into the visible band */
            var kb = hiddenViewport();
            var padTop = kb.top ? (12 + kb.top) + 'px' : '';
            var padBottom = kb.bottom ? (12 + kb.bottom) + 'px' : '';
            if (wrap.style.paddingTop !== padTop) wrap.style.paddingTop = padTop;
            if (wrap.style.paddingBottom !== padBottom) wrap.style.paddingBottom = padBottom;
            wrap.classList.toggle('game-fs-keyboard', !!(kb.top || kb.bottom));

            /* rotate hint on phones held the wrong way */
            var mismatch = isSmallScreen() && currentOrientation() !== pref;
            if (mismatch && hintState !== 'mismatch') hintDismissed = false;
            hintState = mismatch ? 'mismatch' : 'ok';
            var hideHint = !(mismatch && !hintDismissed);
            if (hint.hidden !== hideHint) hint.hidden = hideHint;   /* only write on change: writes are mutations */

            /* phone held sideways for a landscape game: controls and touch
               buttons move beside the canvas (row layout) so the playfield
               gets the full height */
            var rowMode = pref === 'landscape' && isSmallScreen() && currentOrientation() === 'landscape';
            if (wrap.classList.contains('game-fs-row') !== rowMode) wrap.classList.toggle('game-fs-row', rowMode);

            /* everything visible in the wrapper except the canvas and overlays
               takes room away from the canvas: height in column mode, width in row mode */
            var used = 0, visibleRows = 0;
            var kids = wrap.children;
            for (var i = 0; i < kids.length; i++) {
                var k = kids[i];
                if (k === canvas || k === exitBtn || k === hint) continue;
                if (k.hidden || k.classList.contains('game-fs-hide')) continue;
                var cs = getComputedStyle(k);
                if (cs.display === 'none' || cs.position === 'absolute' || cs.position === 'fixed') continue;
                used += rowMode
                    ? k.offsetWidth + parseFloat(cs.marginLeft || 0) + parseFloat(cs.marginRight || 0)
                    : k.offsetHeight + parseFloat(cs.marginTop || 0) + parseFloat(cs.marginBottom || 0);
                visibleRows++;
            }
            var wcs = getComputedStyle(wrap);
            var padV = (parseFloat(wcs.paddingTop) || 0) + (parseFloat(wcs.paddingBottom) || 0);
            var padH = (parseFloat(wcs.paddingLeft) || 0) + (parseFloat(wcs.paddingRight) || 0);
            var gap = parseFloat(rowMode ? (wcs.columnGap || wcs.gap) : (wcs.rowGap || wcs.gap)) || 0;
            var availH, availW;
            if (rowMode) {
                availH = Math.max(120, H - padV - 4);
                availW = Math.max(120, W - padH - used - gap * (visibleRows + 1));
            } else {
                availH = Math.max(120, H - padV - used - gap * (visibleRows + 1) - 4);
                availW = Math.max(120, W - padH);
            }
            var w = Math.min(availW, availH * aspect);
            var h = w / aspect;
            var cw = Math.floor(w) + 'px', ch = Math.floor(h) + 'px';
            if (canvas.style.width !== cw) canvas.style.width = cw;
            if (canvas.style.height !== ch) canvas.style.height = ch;
        }

        /* coalesce layout requests into one per frame; a MutationObserver
           callback that wrote styles synchronously would observe itself */
        var layoutQueued = false;
        function scheduleLayout() {
            if (layoutQueued || !active) return;
            layoutQueued = true;
            requestAnimationFrame(function () {
                layoutQueued = false;
                layout();
            });
        }

        /* ---- events ---- */
        btn.addEventListener('click', toggle);

        /* phones: the first tap that starts playing also goes fullscreen */
        function isCoarse() {
            return window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        }
        function autoEnter(e) {
            if (!autoAllowed || autoDone || active) return;
            if (!isSmallScreen() || !isCoarse()) return;
            var t = e.target;
            if (!t) return;
            /* only the playfield and the game's own touch pads count, not the
               mute/fullscreen buttons, the name field or the victory choices */
            var onCanvas = t === canvas;
            var onPad = !!(t.closest && t.closest('.invaders-touch, .patchbay-touch, .override-touch, .singularity-touch, .defender-touch'));
            if (!onCanvas && !onPad) return;
            autoDone = true;
            enter();
        }
        wrap.addEventListener('pointerdown', autoEnter, true);
        /* a native exit (back gesture, Escape, system UI) also counts as the player's choice */
        document.addEventListener('fullscreenchange', function () { if (active && !fsElement()) autoDone = true; });

        function onFsChange() {
            var el = fsElement();
            if (el === wrap) {
                if (!active) { setActive(true, true); lockOrientation(); }
                else if (!nativeMode) {
                    /* native fullscreen arrived after the fallback kicked in */
                    nativeMode = true;
                    wrap.classList.remove('game-fs-fallback');
                    lockOrientation();
                    layout();
                }
            } else if (active && nativeMode) {
                setActive(false, false);
            }
        }
        document.addEventListener('fullscreenchange', onFsChange);
        document.addEventListener('webkitfullscreenchange', onFsChange);

        window.addEventListener('resize', scheduleLayout, { passive: true });
        window.addEventListener('orientationchange', function () { setTimeout(scheduleLayout, 200); });
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', scheduleLayout, { passive: true });
            window.visualViewport.addEventListener('scroll', scheduleLayout, { passive: true });
        }
        /* the keyboard animates in after focus; catch its final size too */
        wrap.addEventListener('focusin', function (e) {
            if (!active || !e.target || e.target.tagName !== 'INPUT') return;
            scheduleLayout();
            setTimeout(scheduleLayout, 350);
            setTimeout(scheduleLayout, 800);
        });
        wrap.addEventListener('focusout', function () { if (active) { scheduleLayout(); setTimeout(scheduleLayout, 350); } });

        /* name entry row / touch buttons appearing or disappearing */
        if ('MutationObserver' in window) {
            new MutationObserver(function (records) {
                for (var i = 0; i < records.length; i++) {
                    var tg = records[i].target;
                    if (tg === canvas || tg === hint || tg === exitBtn || tg === wrap) continue;
                    scheduleLayout();
                    return;
                }
            }).observe(wrap, { attributes: true, subtree: true, attributeFilter: ['hidden', 'style', 'class'] });
        }

        document.addEventListener('keydown', function (e) {
            var t = e.target;
            var typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' ||
                t.tagName === 'SELECT' || t.isContentEditable);
            if (typing || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
            if (e.key === 'f' || e.key === 'F') {
                e.preventDefault();
                toggle();
            } else if (e.key === 'Escape' && active && !nativeMode) {
                exit();
            } else if (active && (e.key === 't' || e.key === 'T' || e.key === '`')) {
                /* keep the LLOYDOS terminal shortcut from opening over the game */
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);
    }

    window.GameFullscreen = { init: init };
})();
