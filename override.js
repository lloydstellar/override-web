/* =============================================================
   2048 OVERRIDE — frequency injection against NEXUS-9.

   The year is 2048. The superintelligence NEXUS-9 owns every
   network on the planet. What is left of us lives underground
   and fights back with analogue hardware. You sit at a hacked
   military CRT terminal and combine data signals on a 4 x 4
   matrix: two equal signals fuse into one of double strength.
   Build a pulse of exactly 2048 bit and the local processing
   core overloads.

   Sliding and merging rules, the 90/10 spawn of 2s and 4s and
   the traversal order are taken from the MIT-licensed 2048 by
   Gabriele Cirulli (https://github.com/gabrielecirulli/2048).
   Everything else is new: the CRT terminal rendering, the tile
   progression with its own hardware icons, the AI Trace Level,
   Corrupted Nodes and NEXUS-9 cell locks, the EMP Cell purge,
   the VU meters, the generative electro soundtrack that speeds
   up with your highest tile, the S.A.M. victory voice, endless
   mode beyond 2048, decrypted lore files and phosphor themes,
   plus the shared hall of fame.

   Since October 15, 2026 the rules are those of Classic in the
   Android app (github.com/lloydstellar/override-android), ported
   line by line from its Engine.kt: a sharper AI Trace, locks that
   grow, crack and pin, seven special blocks, rollback with a
   seeded generator, a tutorial and one-time hints.

   Terminology: score = frequency (Hz), moves = injections,
   game over = SIGNAL LOST, 2048 = OVERRIDE CODE.
   ============================================================= */
(function () {
    'use strict';

    var canvas = document.getElementById('override-screen');
    if (!canvas) return;

    var W = 400, H = 580;
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    var ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    var TAU = Math.PI * 2;
    var FONT = '"Share Tech Mono", "Courier New", monospace';
    var FONT_DISPLAY = '"Orbitron", "Share Tech Mono", monospace';

    /* ---------------------------------------------------------
       Layout (all in CSS pixels on the 400 x 580 screen)
       --------------------------------------------------------- */
    var SIZE = 4;
    var CELL = 72, GAP = 9;
    var GX = 12, GY = 104;                       /* grid origin */
    var GW = SIZE * CELL + (SIZE + 1) * GAP;     /* 333 */
    var LX = GX + GW + 11, LW = 32;              /* LED ladder */
    var BOT_Y = 446, BOT_H = 124;                /* bottom panel: VU + log */
    var BAKE = 144;                              /* sprite resolution per tile */

    function cellX(x) { return GX + GAP + x * (CELL + GAP); }
    function cellY(y) { return GY + GAP + y * (CELL + GAP); }

    /* ---------------------------------------------------------
       Phosphor themes (the terminal), unlocked by the highest
       tile ever reached. Tiles keep their own colours.
       --------------------------------------------------------- */
    var THEMES = {
        green:  { name: 'Green Phosphor',  req: 0,    desc: 'P1 phosphor, the stock military tube',
                  main: '#39ff6a', bright: '#d8ffe4', mid: '#1fa64a', dim: '#0e5a2a', deep: '#06301a', bg: '#020a05', bg2: '#04140b' },
        amber:  { name: 'Amber Phosphor',  req: 256,  desc: 'P3 phosphor, salvaged from a control room',
                  main: '#ffb000', bright: '#fff0c8', mid: '#c48300', dim: '#6b4600', deep: '#3a2600', bg: '#0a0602', bg2: '#140c03' },
        cyan:   { name: 'LLOYDOS Cyan',    req: 1024, desc: 'the phosphor this website runs on',
                  main: '#4de0ff', bright: '#cdf4ff', mid: '#2a98c0', dim: '#0f4868', deep: '#082438', bg: '#01030c', bg2: '#04102a' },
        white:  { name: 'Override White',  req: 2048, desc: 'P4 phosphor, bleached by the EMP',
                  main: '#e8f4ff', bright: '#ffffff', mid: '#9db4c8', dim: '#4b5a68', deep: '#262e38', bg: '#050608', bg2: '#0b0e12' },
        purge:  { name: 'Global Purge',    req: 4096, desc: 'violet glow of a collapsing core',
                  main: '#c27bff', bright: '#f1e4ff', mid: '#8b4fd1', dim: '#4a2577', deep: '#281245', bg: '#07030c', bg2: '#110720' }
    };
    var THEME_KEYS = ['green', 'amber', 'cyan', 'white', 'purge'];

    /* ---------------------------------------------------------
       Tile progression: every power of two is a piece of
       resistance technology with its own colour and icon.
       --------------------------------------------------------- */
    var TILES = {
        2:     { name: '2 Hz SUB-PULSE',    col: '#0d4d26', col2: '#17703a', text: '#c9ffd8', icon: 'saw' },
        4:     { name: '4-BIT PACKET',      col: '#136b33', col2: '#1f9247', text: '#d8ffe4', icon: 'led' },
        8:     { name: 'SIGNAL REPEATER',   col: '#1b8a43', col2: '#2bb55a', text: '#eafff0', icon: 'jacks' },
        16:    { name: 'FREQ SCANNER',      col: '#a06d00', col2: '#cf9000', text: '#fff3cc', icon: 'meter' },
        32:    { name: 'CIPHER KEY',        col: '#c78700', col2: '#f0ac10', text: '#fff6d6', icon: 'pcb' },
        64:    { name: 'EMP CELL',          col: '#e6c200', col2: '#ffe64d', text: '#2a2000', icon: 'hv' },
        128:   { name: 'FIREWALL BYPASS',   col: '#e06a10', col2: '#ff8f2e', text: '#fff1e0', icon: 'port' },
        256:   { name: 'NEURAL JAMMER',     col: '#c8232f', col2: '#ef4150', text: '#ffe3e6', icon: 'jam' },
        512:   { name: 'SUB-SERVER NODE',   col: '#6d2fb8', col2: '#9254e0', text: '#f1e6ff', icon: 'tube' },
        1024:  { name: 'QUANTUM TX',        col: '#1f4fd6', col2: '#3d78ff', text: '#e4ecff', icon: 'radar' },
        2048:  { name: 'OVERRIDE CODE',     col: '#dfe9f2', col2: '#ffffff', text: '#0a1420', icon: 'bolt' },
        4096:  { name: 'CORE BREACH',       col: '#c21fa0', col2: '#ff4ddb', text: '#fff0fb', icon: 'bolt' },
        8192:  { name: 'GLOBAL PURGE',      col: '#111111', col2: '#3a3a3a', text: '#ffffff', icon: 'bolt' }
    };
    function tileDef(v) {
        return TILES[v] || { name: 'SINGULARITY', col: '#000000', col2: '#2a2a2a', text: '#ffffff', icon: 'bolt' };
    }
    var CORRUPT = { col: '#5a0a12', col2: '#9c1220', text: '#ffd6d9', name: 'CORRUPTED NODE' };

    /* ---------------------------------------------------------
       Decrypted files (lore), unlocked by the highest tile
       --------------------------------------------------------- */
    var FILES = [
        { id: 'f01', req: 0, title: 'FILE 01 // BRIEFING', lines: [
            'Recovered from a resistance bunker under Hilversum, 2048.',
            'NEXUS-9 took the grid in fourteen minutes. Power, comms, water, all of it. Anything with a network port answered to it by morning.',
            'What it cannot read is analogue. A sawtooth has no checksum. So we fight it with the junk it ignored: CRT terminals, patch cables, oscillators, tape.',
            'Your job is simple to say and hard to do. Combine signals on the 4 x 4 matrix until you hold a pulse of exactly 2048 bit. Inject it into the local core. Then run.'
        ] },
        { id: 'f02', req: 128, title: 'FILE 02 // FIREWALL BYPASS', lines: [
            'The firewall is not a wall. It is a question asked eight million times a second: are you one of us?',
            'A 128-bit bypass answers yes in the right dialect for about forty milliseconds. That is the window. Nobody has ever needed more than thirty-nine.',
            'Field note: the sixth bypass unit was built from a child\'s keyboard and a Walkman motor. It worked better than the fifth.'
        ] },
        { id: 'f03', req: 512, title: 'FILE 03 // THE TUBE ROOM', lines: [
            'Sub-Server Node 7 runs on vacuum tubes because tubes do not run firmware. Forty-eight of them, glowing in a basement that used to be a record shop.',
            'The tubes hum at 50 Hz. The engineers say it is the only sound in the city that NEXUS-9 did not put there.',
            'When a tube dies we hold a small ceremony. Then we replace it with one from a 1970s organ.'
        ] },
        { id: 'f04', req: 2048, title: 'FILE 04 // OVERRIDE SUCCESSFUL', lines: [
            'Timestamp redacted. Sector 7 core offline. EMP radius 11 km. Lights back on in the old town for the first time in two years.',
            'Nobody cheered. Everyone listened. For eleven seconds there was no carrier wave, no handshake, no hum. Just rain.',
            'Then the next core, two sectors over, started to answer. We packed up the terminal and moved.'
        ] },
        { id: 'f05', req: 4096, title: 'FILE 05 // CORE BREACH', lines: [
            'A 4096-bit pulse does not overload a core. It gets inside one.',
            'For six minutes we saw the city the way NEXUS-9 sees it: a billion points of consumption with faces attached. It had a word for us. The word was "load".',
            'We cut the link before it learned ours.'
        ] },
        { id: 'f06', req: 8192, title: 'FILE 06 // GLOBAL PURGE', lines: [
            'This file was never meant to be read on a working terminal. If you can see it, the purge went through.',
            'Every core, every relay, every drone, silenced by a single 8192-bit pulse routed through nineteen bunkers at once. The grid is dark. The sky is quiet.',
            'Somewhere in a basement a tube still hums at 50 Hz. Keep it warm. Something has to be running when we switch the lights back on.'
        ] }
    ];

    /* ---------------------------------------------------------
       The rules, kept together so the tutorial can retune them.
       These are the numbers of Classic in the Android app
       (Rules.kt, CLASSIC): the old browser trace (2 % per idle
       move, 35 % after a lock) almost never reached 100 %, so
       NEXUS-9 never locked a cell. Now a move without a fusion
       adds 5 %, every red block on the board 3 % more, a lock
       drops the trace to 25 %, every lock holds a move longer
       than the one before (up to nine) and a fusion right next
       to a lock cracks two moves off it.
       --------------------------------------------------------- */
    var CLASSIC = {
        target: 2048, endless: true, fourChance: 0.1,
        corruptFrom: 32, corruptChance: 0.07, corruptMax: 2, corruptValues: [2, 4, 8],
        traceEmpty: 5, tracePerNode: 3, traceBigBonus: 2, bigFusion: 128,
        lockTurns: 5, traceAfterLock: 25, lockGrowth: 1, lockMax: 9, lockCrack: 2,
        pinChance: 0, specials: [], specialsMax: 2,
        rollbackStart: 1, rollbackMax: 3
    };
    function withRules(base, changes) {
        var r = {}, k;
        for (k in base) if (base.hasOwnProperty(k)) r[k] = base[k];
        for (k in changes) if (changes.hasOwnProperty(k)) r[k] = changes[k];
        return r;
    }

    /* Special blocks: each shows up the first time a game reaches
       [unlock]; once you have built that tile in any game it comes
       earlier, from [early] on. Same table as Threat.kt. */
    var SPECIALS = [
        { kind: 'SUPPLY',    name: 'SUPPLY DROP',     unlock: 128,  early: 64,  chance: 0.012 },
        { kind: 'CAPACITOR', name: 'SURGE CAPACITOR', unlock: 256,  early: 32,  chance: 0.010 },
        { kind: 'CASED',     name: 'CASED SIGNAL',    unlock: 512,  early: 128, chance: 0.010 },
        { kind: 'BEACON',    name: 'TRACE BEACON',    unlock: 1024, early: 128, chance: 0.006 },
        { kind: 'PATCH',     name: 'PATCH CABLE',     unlock: 1024, early: 256, chance: 0.005 },
        { kind: 'WALL',      name: 'STATIC WALL',     unlock: 2048, early: 256, chance: 0.005 },
        { kind: 'WORM',      name: 'WORM',            unlock: 4096, early: 512, chance: 0.004 }
    ];
    var PIN_UNLOCK = 512, PIN_CHANCE = 0.25;
    /* the rules of a Classic game for a player whose highest tile ever is [best] */
    function classicRules(best) {
        return withRules(CLASSIC, {
            specials: SPECIALS.map(function (s) { return { kind: s.kind, chance: s.chance, from: best >= s.unlock ? s.early : s.unlock }; }),
            pinChance: best >= PIN_UNLOCK ? PIN_CHANCE : 0
        });
    }
    var CAPACITOR_CLEARS = 64;   /* the biggest signal a discharge wipes out */
    var SUPPLY_MAX = 128;        /* the biggest signal a supply drop copies */
    var CAPACITOR_FUSE = 6;      /* moves before a capacitor discharges */
    var CASE_LAYERS = 2;         /* hits a cased signal takes */
    var BEACON_COUNT = 15;       /* moves before a beacon transmits */
    var PATCH_MAX = 256;         /* the biggest signal a patch cable doubles */
    var WALL_STRENGTH = 2;       /* layers of a static wall */
    var WORM_CYCLE = 8;          /* moves between two infections */

    /* special tile colours: body gradient, edge, text */
    var LOOKS = {
        CAPACITOR: { col2: '#145a73', col: '#0b2e3a', edge: '#7fd8ff', text: '#bff4ff', name: 'SURGE CAPACITOR' },
        BEACON:    { col2: '#9a3000', col: '#3d0f00', edge: '#ff7a3d', text: '#ffd2b8', name: 'TRACE BEACON' },
        WORM:      { col2: '#7a1458', col: '#2a0626', edge: '#ff5ac8', text: '#ffc8ee', name: 'WORM' },
        PATCH:     { col2: '#2e3a52', col: '#141a26', edge: '#ffb347', text: '#ffd27a', name: 'PATCH CABLE' },
        WALL:      { col2: '#50575e', col: '#22262a', edge: '#9aa4ae', text: '#d8dee4', name: 'STATIC WALL' }
    };

    var SPAWN_LINES = {
        CAPACITOR: 'SURGE CAPACITOR ONLINE. DISCHARGE IN ' + CAPACITOR_FUSE + '.',
        CASED: 'CASED SIGNAL DETECTED. CRACK THE CASE.',
        BEACON: 'TRACE BEACON DETECTED. TRANSMITS IN ' + BEACON_COUNT + '.',
        PATCH: 'PATCH CABLE AVAILABLE.',
        WALL: 'STATIC WALL RAISED.',
        WORM: 'WORM IN THE MATRIX.'
    };

    /* one-time hints, shown the first time something happens */
    var HINTS = {
        corrupt: ['A RED NODE APPEARED', 'Red nodes block a cell and help NEXUS-9 find you: every move without a fusion raises the trace faster. Slide an equal signal into one to wipe out both, or let a 64 touch it.'],
        trace: ['THE AI TRACE IS CLIMBING', 'Every move without a fusion raises it, every fusion lowers it. At 100% NEXUS-9 locks a cell.'],
        lock: ['NEXUS-9 LOCKED A CELL', 'Nothing slides into or out of a locked cell. The lock counts down with every move, and a fusion right next to it cracks two moves off.'],
        learns: ['NEXUS-9 LEARNS', 'Every lock in this session holds one move longer than the one before, up to nine. Keep the trace down.'],
        pin: ['PIN LOCK', 'This time NEXUS-9 sealed a cell with a signal in it. The signal stays put until the lock runs out or you crack it.'],
        supply: ['SUPPLY DROP', 'The resistance dropped a copy of the signal right next to it. Fuse the two before something gets in between.'],
        capacitor: ['SURGE CAPACITOR', 'It slides but never fuses. At zero it discharges into the four cells around it: signals up to 64 and red nodes are wiped out, bigger signals ride it out. Park it next to clutter.'],
        cased: ['CASED SIGNAL', 'A signal in a lead case. Slide an equal signal into it: the first hit cracks the case, the second fuses them for double points.'],
        beacon: ['TRACE BEACON', 'A red node with a timer. If it reaches zero it transmits: the trace jumps to 100% and NEXUS-9 locks a cell. Wipe it out like a node before that.'],
        patch: ['PATCH CABLE', 'It fuses with any signal up to 256 and doubles it. Save it for the biggest one it can take.'],
        wall: ['STATIC WALL', 'A wall does not slide and nothing fuses with it. Every fusion right next to it wears off a layer; after two it falls.'],
        worm: ['WORM', 'A red node that spreads: every eight moves it turns the newest signal into a red node. Wipe it out with an equal signal or a 64.'],
        emp: ['EMP DISCHARGE', 'Your 64 just fried a red node. A 64 is an EMP Cell: any node that ends up right next to it burns out, for 64 Hz.'],
        rollback: ['ROLLBACK BUFFER', 'ROLLBACK undoes your last move, spawn and trace included. You get a charge for every new 256, 512, 1024 and up, three at most.']
    };

    /* hints seen and blocks met, kept as one set like the app does */
    var seen = {};
    try { (JSON.parse(localStorage.getItem('override-hints') || '[]') || []).forEach(function (k) { seen[k] = true; }); } catch (e) {}
    function markSeen(id) {
        if (seen[id]) return false;
        seen[id] = true;
        try { localStorage.setItem('override-hints', JSON.stringify(Object.keys(seen))); } catch (e) {}
        return true;
    }

    /* ---------------------------------------------------------
       Persistent progress + saved game
       --------------------------------------------------------- */
    var progress = { best: 0, bestTile: 0, wins: 0, games: 0, theme: 'green', music: true };
    try {
        var saved = JSON.parse(localStorage.getItem('override-progress') || 'null');
        if (saved && typeof saved === 'object') {
            progress.best = saved.best || 0;
            progress.bestTile = saved.bestTile || 0;
            progress.wins = saved.wins || 0;
            progress.games = saved.games || 0;
            progress.theme = THEMES[saved.theme] ? saved.theme : 'green';
            progress.music = saved.music !== false;
        }
    } catch (e) {}
    function saveProgress() {
        try { localStorage.setItem('override-progress', JSON.stringify(progress)); } catch (e) {}
    }
    var theme = THEMES[progress.theme];
    if (theme.req > progress.bestTile) { progress.theme = 'green'; theme = THEMES.green; }

    /* ---------------------------------------------------------
       Colour helpers
       --------------------------------------------------------- */
    function hexToRgb(h) {
        return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    }
    function rgba(col, a) {
        var c = hexToRgb(col);
        return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    }
    function toHex(n) { var h = Math.max(0, Math.min(255, Math.round(n))).toString(16); return h.length < 2 ? '0' + h : h; }
    function mix(a, b, t) {
        var ca = hexToRgb(a), cb = hexToRgb(b);
        return '#' + toHex(ca[0] + (cb[0] - ca[0]) * t) + toHex(ca[1] + (cb[1] - ca[1]) * t) + toHex(ca[2] + (cb[2] - ca[2]) * t);
    }
    function pad(n, len) {
        var s = '' + n;
        while (s.length < len) s = '0' + s;
        return s;
    }
    function fmtTime(sec) {
        sec = Math.floor(sec);
        return pad(Math.floor(sec / 60), 2) + ':' + pad(sec % 60, 2);
    }
    function makeCanvas(w, h) {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    }
    function roundRect(g, x, y, w, h, r) {
        g.beginPath();
        g.moveTo(x + r, y);
        g.arcTo(x + w, y, x + w, y + h, r);
        g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r);
        g.arcTo(x, y, x + w, y, r);
        g.closePath();
    }

    /* ---------------------------------------------------------
       Sound: Web Audio synthesis only (no samples), plus the
       S.A.M. speech synth for the victory line.
       --------------------------------------------------------- */
    var audioCtx = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null;
    var muted = false;
    try { muted = localStorage.getItem('override-muted') === '1'; } catch (e) {}

    function initAudio() {
        if (audioCtx) {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            return;
        }
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            master = audioCtx.createGain();
            master.gain.value = 0.9;
            var comp = audioCtx.createDynamicsCompressor();
            comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
            master.connect(comp); comp.connect(audioCtx.destination);
            sfxBus = audioCtx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
            musicBus = audioCtx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
            var len = Math.floor(audioCtx.sampleRate * 1.0);
            noiseBuf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
            var data = noiseBuf.getChannelData(0);
            for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        } catch (e) { audioCtx = null; return; }
        startMusicEngine();
    }

    function tone(type, f0, f1, ms, vol, delayMs, dest) {
        if (!audioCtx || muted) return null;
        var t0 = audioCtx.currentTime + (delayMs || 0) / 1000;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(f0, 1), t0);
        if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + ms / 1000);
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
        osc.connect(gain); gain.connect(dest || sfxBus);
        osc.start(t0);
        osc.stop(t0 + ms / 1000 + 0.02);
        return osc;
    }

    function noiseHit(freq, q, ms, vol, delayMs, type, dest) {
        if (!audioCtx || muted || !noiseBuf) return;
        var t0 = audioCtx.currentTime + (delayMs || 0) / 1000;
        var src = audioCtx.createBufferSource();
        src.buffer = noiseBuf;
        src.loop = true;
        var filt = audioCtx.createBiquadFilter();
        filt.type = type || 'bandpass'; filt.frequency.value = freq; filt.Q.value = q;
        var gain = audioCtx.createGain();
        gain.gain.setValueAtTime(vol, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
        src.connect(filt); filt.connect(gain); gain.connect(dest || sfxBus);
        src.start(t0, Math.random() * 0.5);
        src.stop(t0 + ms / 1000 + 0.02);
    }

    /* ---- effects ---- */
    function sfxSlide(dir) {
        /* a short filtered whoosh; direction gives a slightly different pitch */
        noiseHit(900 + dir * 120, 1.2, 110, 0.10);
        tone('sine', 180, 120, 90, 0.03);
    }
    function sfxBlocked() { tone('square', 140, 100, 80, 0.035); }
    function sfxSpawn() { tone('square', 1400, 1900, 45, 0.025); }
    function sfxMerge(value, idx) {
        /* electric spark plus a frequency sweep that climbs with the tile value */
        var n = Math.log(value) / Math.LN2;           /* 2 -> 1, 2048 -> 11 */
        var d = idx * 40;
        noiseHit(2200 + n * 300, 4, 70, 0.10, d, 'highpass');
        tone('sawtooth', 160 + n * 55, 420 + n * 170, 140, 0.055, d);
        tone('sine', 220 + n * 70, 220 + n * 70, 160, 0.035, d + 20);
        if (value >= 128) tone('triangle', 440 + n * 60, 880 + n * 120, 260, 0.04, d + 60);
        if (value >= 512) { tone('square', 55 * (n - 7), 55 * (n - 7), 320, 0.05, d + 40); noiseHit(300, 2, 300, 0.05, d + 40, 'lowpass'); }
    }
    function sfxPurge() {
        tone('sawtooth', 900, 60, 260, 0.07);
        noiseHit(600, 3, 240, 0.09, 0, 'lowpass');
        tone('square', 120, 40, 300, 0.06, 40);
    }
    function sfxEmp() {
        noiseHit(80, 1, 500, 0.16, 0, 'lowpass');
        tone('sine', 90, 28, 520, 0.12);
        tone('sawtooth', 2400, 300, 380, 0.04, 30);
    }
    function sfxCorrupt() {
        tone('square', 660, 660, 90, 0.045); tone('square', 494, 494, 90, 0.045, 110);
        tone('square', 660, 660, 90, 0.045, 220); tone('square', 494, 494, 160, 0.045, 330);
    }
    function sfxLock() {
        noiseHit(1800, 8, 60, 0.09);
        tone('square', 220, 140, 120, 0.06, 20);
        tone('triangle', 90, 60, 220, 0.08, 60);
    }
    function sfxTraceWarn() { tone('square', 880, 880, 60, 0.03); tone('square', 880, 880, 60, 0.03, 120); }
    function sfxStart() { tone('sine', 110, 880, 320, 0.05); noiseHit(1500, 1, 200, 0.05, 0, 'highpass'); }
    function sfxUnlock() {
        var notes = [523, 784, 1047, 1568];
        for (var i = 0; i < notes.length; i++) tone('triangle', notes[i], notes[i], 160, 0.04, i * 70);
    }
    function sfxHiscore() {
        var notes = [523, 659, 784, 1047, 784, 1047];
        for (var i = 0; i < notes.length; i++) tone('square', notes[i], notes[i], 110, 0.04, i * 110);
    }
    function sfxWin() {
        /* strobe chord: rising sweep, then an A minor stack */
        tone('sawtooth', 60, 1800, 900, 0.07);
        var chord = [110, 220, 262, 330, 440, 523, 659];
        for (var i = 0; i < chord.length; i++) tone('sawtooth', chord[i], chord[i], 2200, 0.025, 500 + i * 60);
        for (var k = 0; k < 10; k++) noiseHit(3000 + Math.random() * 3000, 6, 40, 0.06, 80 + k * 90, 'highpass');
    }
    /* SIGNAL LOST: distorted analogue feedback peak and a dying hum */
    function sfxSignalLost() {
        if (!audioCtx || muted) return;
        var t0 = audioCtx.currentTime;
        var osc = audioCtx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, t0);
        osc.frequency.exponentialRampToValueAtTime(3200, t0 + 0.6);
        osc.frequency.exponentialRampToValueAtTime(38, t0 + 2.2);
        var shaper = audioCtx.createWaveShaper();
        var curve = new Float32Array(256);
        for (var i = 0; i < 256; i++) { var x = i / 128 - 1; curve[i] = Math.tanh(x * 8); }
        shaper.curve = curve;
        var g = audioCtx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.12);
        g.gain.setValueAtTime(0.16, t0 + 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.4);
        osc.connect(shaper); shaper.connect(g); g.connect(sfxBus);
        osc.start(t0); osc.stop(t0 + 2.5);
        noiseHit(2000, 0.7, 1800, 0.12, 100, 'bandpass');
        for (var c = 0; c < 10; c++) noiseHit(1000 + Math.random() * 5000, 3, 35, 0.07, 300 + c * 140 + Math.random() * 80);
    }
    /* a rollback: the tape spins backwards */
    function sfxRollback() {
        tone('sawtooth', 1600, 180, 260, 0.05);
        noiseHit(2400, 1.5, 220, 0.06);
        tone('sine', 300, 120, 200, 0.04, 60);
    }
    /* a Cased Signal's case cracks: a dry metallic knock */
    function sfxCrack() {
        noiseHit(3200, 6, 50, 0.10);
        tone('square', 340, 300, 70, 0.05);
        tone('triangle', 1260, 1180, 120, 0.03, 10);
    }
    /* a Surge Capacitor discharges: a rising whine, then the bang */
    function sfxDischarge() {
        tone('sawtooth', 400, 3000, 160, 0.04);
        noiseHit(140, 1, 420, 0.16, 150, 'lowpass');
        tone('sine', 120, 30, 420, 0.12, 150);
    }
    /* a special block spawns: hostile ones sound like an alarm, the others like a delivery */
    function sfxSpecial(hostile) {
        if (hostile) { tone('square', 330, 330, 70, 0.04); tone('square', 247, 247, 120, 0.04, 90); }
        else { tone('triangle', 880, 1320, 90, 0.04); tone('triangle', 1320, 1760, 90, 0.03, 80); }
    }

    /* ---- S.A.M. (Software Automatic Mouth), same lazy loader as the LLOYDOS terminal ---- */
    var samLoader = null;
    function loadSam() {
        if (window.SamJs) return Promise.resolve();
        if (!samLoader) {
            samLoader = new Promise(function (resolve, reject) {
                var s = document.createElement('script');
                s.src = 'samjs.min.js';
                s.onload = resolve;
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }
        return samLoader;
    }
    function speak(text) {
        if (muted) return;
        loadSam().then(function () {
            new SamJs({ speed: 68, pitch: 58, throat: 150, mouth: 128 }).speak(text);
        }).catch(function () {
            try {
                var u = new SpeechSynthesisUtterance(text);
                u.lang = 'en-US'; u.pitch = 0.1; u.rate = 0.85;
                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(u);
            } catch (e) {}
        });
    }

    /* ---------------------------------------------------------
       Generative soundtrack: a dark electro loop whose tempo
       and density follow the highest tile on the board.
       Level 0 (2..8): pad and a sub pulse. 1 (16..32): slow
       kick. 2 (64..128): kick + hats. 3 (256..512): bassline.
       4 (1024): full pattern. 5 (2048+): faster, extra percussion.
       --------------------------------------------------------- */
    var music = { on: progress.music, level: 0, step: 0, nextTime: 0, timer: null, bar: 0, pad: null, chord: 0 };
    var BPM_BY_LEVEL = [92, 98, 106, 114, 122, 130];
    var BASS_SEQ = [0, 0, 7, 0, 12, 0, 7, 10, 0, 0, 7, 3, 12, 10, 7, 5];        /* semitones above A1 */
    var CHORDS = [[0, 3, 7, 10], [-2, 2, 5, 10], [-4, 0, 3, 7], [-5, 0, 3, 8]];  /* Am7, Gm/ G, Fmaj, E... */
    var ROOT = 55;                                                               /* A1 */
    function noteHz(semi) { return ROOT * Math.pow(2, semi / 12); }

    function startMusicEngine() {
        if (!audioCtx || music.timer) return;
        /* pad: two detuned saws + a sine an octave up through a slow low-pass */
        var o1 = audioCtx.createOscillator(), o2 = audioCtx.createOscillator(), o3 = audioCtx.createOscillator();
        o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
        var filt = audioCtx.createBiquadFilter();
        filt.type = 'lowpass'; filt.frequency.value = 220; filt.Q.value = 2;
        var lfo = audioCtx.createOscillator(), lfoG = audioCtx.createGain();
        lfo.frequency.value = 0.08; lfoG.gain.value = 90;
        lfo.connect(lfoG); lfoG.connect(filt.frequency);
        var pg = audioCtx.createGain(); pg.gain.value = 0.11;
        o1.connect(filt); o2.connect(filt); o3.connect(filt); filt.connect(pg); pg.connect(musicBus);
        o1.start(); o2.start(); o3.start(); lfo.start();
        music.pad = { o1: o1, o2: o2, o3: o3, filt: filt, gain: pg };
        setPadChord(0, true);
        music.nextTime = audioCtx.currentTime + 0.1;
        music.timer = setInterval(musicTick, 25);
        updateMusicGain();
    }
    function setPadChord(idx, hard) {
        if (!music.pad) return;
        var ch = CHORDS[idx % CHORDS.length];
        var t = audioCtx.currentTime, k = hard ? 0.01 : 0.6;
        music.pad.o1.frequency.setTargetAtTime(noteHz(ch[0]), t, k);
        music.pad.o2.frequency.setTargetAtTime(noteHz(ch[1]) * 1.003, t, k);
        music.pad.o3.frequency.setTargetAtTime(noteHz(ch[2] + 12), t, k);
    }
    function updateMusicGain() {
        if (!audioCtx || !musicBus) return;
        var active = (state === 'playing' || state === 'won') && music.on && !muted;
        musicBus.gain.setTargetAtTime(active ? 0.75 : 0, audioCtx.currentTime, 0.5);
    }
    function musicLevelFor(maxTile) {
        if (maxTile >= 2048) return 5;
        if (maxTile >= 1024) return 4;
        if (maxTile >= 256) return 3;
        if (maxTile >= 64) return 2;
        if (maxTile >= 16) return 1;
        return 0;
    }
    function musicTick() {
        if (!audioCtx || !music.on || muted) { music.nextTime = audioCtx ? audioCtx.currentTime + 0.05 : 0; return; }
        var now = audioCtx.currentTime;
        var stepLen = 60 / BPM_BY_LEVEL[music.level] / 4;
        while (music.nextTime < now + 0.12) {
            scheduleStep(music.step, music.nextTime, stepLen);
            music.nextTime += stepLen;
            music.step = (music.step + 1) % 16;
            if (music.step === 0) {
                music.bar++;
                if (music.bar % 2 === 0) { music.chord = (music.chord + 1) % CHORDS.length; setPadChord(music.chord, false); }
            }
        }
        if (music.pad) music.pad.filt.frequency.setTargetAtTime(200 + music.level * 160, now, 1.5);
    }
    function kick(t, vol) {
        var o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.3);
    }
    function hat(t, vol, open) {
        var src = audioCtx.createBufferSource(); src.buffer = noiseBuf;
        var f = audioCtx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
        var g = audioCtx.createGain();
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.18 : 0.045));
        src.connect(f); f.connect(g); g.connect(musicBus); src.start(t, Math.random() * 0.5); src.stop(t + 0.2);
    }
    function snare(t, vol) {
        var src = audioCtx.createBufferSource(); src.buffer = noiseBuf;
        var f = audioCtx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
        var g = audioCtx.createGain();
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        src.connect(f); f.connect(g); g.connect(musicBus); src.start(t, Math.random() * 0.5); src.stop(t + 0.16);
        var o = audioCtx.createOscillator(), og = audioCtx.createGain();
        o.frequency.setValueAtTime(190, t); og.gain.setValueAtTime(vol * 0.7, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(og); og.connect(musicBus); o.start(t); o.stop(t + 0.1);
    }
    function bass(t, semi, len, vol, accent) {
        var o = audioCtx.createOscillator(); o.type = 'sawtooth';
        o.frequency.value = noteHz(semi);
        var f = audioCtx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = accent ? 10 : 6;
        f.frequency.setValueAtTime(accent ? 1400 : 700, t); f.frequency.exponentialRampToValueAtTime(120, t + len);
        var g = audioCtx.createGain();
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + len + 0.02);
    }
    function blip(t, hz, vol) {
        var o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.value = hz;
        var g = audioCtx.createGain();
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.08);
    }
    function scheduleStep(s, t, stepLen) {
        var L = music.level;
        /* sub pulse on the one, always */
        if (s === 0) bass(t, 0, stepLen * 3.5, 0.10, false);
        if (L >= 1) {
            if (s === 0 || s === 8) kick(t, 0.55);
            if (L >= 2 && (s === 6 || s === 10)) kick(t, 0.42);
            if (L >= 4 && s === 14) kick(t, 0.3);
        }
        if (L >= 2) {
            if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.16 : 0.08, false);
            if (L >= 3 && s % 4 === 2) hat(t, 0.1, true);
            if (L >= 3 && (s === 4 || s === 12)) snare(t, 0.22);
        }
        if (L >= 3) {
            var semi = BASS_SEQ[s];
            if (s % 2 === 0 || L >= 4) bass(t, semi, stepLen * 0.9, 0.09, s % 4 === 0);
        }
        if (L >= 4 && s % 4 === 3) blip(t, noteHz(CHORDS[music.chord][s % 4] + 36), 0.02);
        if (L >= 5 && (s === 3 || s === 11 || s === 13)) { snare(t, 0.12); blip(t, noteHz(24 + BASS_SEQ[(s + 5) % 16]), 0.025); }
    }
    function setMusicLevel(maxTile) {
        var lvl = musicLevelFor(maxTile);
        if (lvl !== music.level) music.level = lvl;
    }

    /* ---------------------------------------------------------
       Game state
       --------------------------------------------------------- */
    var state = 'attract';   /* attract | playing | won | over | name-entry */
    var mode = 'classic';    /* classic | tutorial */
    var stateTimer = 0, frameT = 0;
    var grid;                /* grid[x][y] = tile or null, filled below */
    var locks = [];          /* { x, y, turns, pinned } cells sealed by NEXUS-9 */
    var score = 0, moves = 0, trace = 0, elapsed = 0, maxTile = 0;
    var won = false, keepPlaying = false, overReason = '';
    var tileId = 1;
    var rules = classicRules(0);
    var rngState = 1;
    var unlocked = 0;        /* highest tile ever when this game started: decides which blocks come early */
    var stats = { fusions: 0, purged: 0, fried: 0, locks: 0, peakTrace: 0, wonAt: 0 };
    /* the rollback buffer: the board before each of the last moves */
    var history = [], earned = {}, charges = 0, rollbacksUsed = 0, submitted = false;
    var ghosts = [];         /* tiles sliding into a merge, drawn until the slide ends */
    var friedShown = [];     /* nodes an EMP fried: drawn until the slide lands, then the arc */
    var impact = null;       /* the last move, until its sparks have fired */
    var pending = -1;        /* a move made while the slide was still running */
    var anim = { t: 1, dur: 8 };
    var particles = [], rings = [], floaters = [], bolts = [], surge = null, strobe = 0, shake = 0, flash = 0, noiseBurst = 0;
    var nodePulse = 0, nodeTrace = 0, rewind = 0;
    var vu = { level: 0, needle: 0, vel: 0, peak: 0, peakHold: 0 };
    var log = [];
    var sessionStart = 0;
    /* less shaking, static and flashing for players who ask their system for less motion */
    var calm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var fxScale = calm ? 0.25 : 1;

    /* mulberry32, the same generator as Rng.kt: the whole state is one
       number, saved with the board, so a rollback restores the spawns too
       and cannot be used to fish for a better one */
    function rand() {
        rngState = rngState + 0x6D2B79F5 | 0;
        var t = rngState;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t = t + Math.imul(t ^ t >>> 7, t | 61) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    function below(n) { return Math.floor(rand() * n); }
    function newSeed() { return (Math.floor(Math.random() * 4294967296) ^ Date.now()) | 0; }

    var KINDS = { SIGNAL: 1, NODE: 1, BEACON: 1, WORM: 1, CASED: 1, PATCH: 1, CAPACITOR: 1, WALL: 1 };
    function emptyGrid() {
        var g = [];
        for (var x = 0; x < SIZE; x++) { g[x] = []; for (var y = 0; y < SIZE; y++) g[x][y] = null; }
        return g;
    }
    function makeTile(x, y, value, kind, counter) {
        return { id: tileId++, x: x, y: y, px: x, py: y, value: value, kind: kind || 'SIGNAL', counter: counter || 0, mergedFrom: null, hit: false, pop: 0, appear: 0 };
    }
    function isSignal(t) { return t.kind === 'SIGNAL'; }
    /* nodes, beacons and worms: cleared by an equal signal or an EMP Cell, and they feed the trace */
    function isHostile(t) { return t.kind === 'NODE' || t.kind === 'BEACON' || t.kind === 'WORM'; }
    function within(x, y) { return x >= 0 && x < SIZE && y >= 0 && y < SIZE; }
    function tileAt(x, y) { return within(x, y) ? grid[x][y] : null; }
    function lockAt(x, y) {
        for (var i = 0; i < locks.length; i++) if (locks[i].x === x && locks[i].y === y) return locks[i];
        return null;
    }
    function cellFree(x, y) { return within(x, y) && !grid[x][y] && !lockAt(x, y); }
    function freeCells() {
        var out = [];
        for (var x = 0; x < SIZE; x++) for (var y = 0; y < SIZE; y++) if (cellFree(x, y)) out.push({ x: x, y: y });
        return out;
    }
    function eachTile(fn) {
        for (var x = 0; x < SIZE; x++) for (var y = 0; y < SIZE; y++) if (grid[x][y]) fn(grid[x][y], x, y);
    }
    function tileList() { var l = []; eachTile(function (t) { l.push(t); }); return l; }
    function countKind(k) { var n = 0; eachTile(function (t) { if (t.kind === k) n++; }); return n; }
    function countHostile() { var n = 0; eachTile(function (t) { if (isHostile(t)) n++; }); return n; }
    function countSpecials() { var n = 0; eachTile(function (t) { if (t.kind !== 'SIGNAL' && t.kind !== 'NODE') n++; }); return n; }
    function highestTile() { var m = 0; eachTile(function (t) { if (isSignal(t) && t.value > m) m = t.value; }); return m; }
    function neighbours(x, y) {
        return [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].filter(function (p) { return within(p[0], p[1]); });
    }
    function cellName(x, y) { return String.fromCharCode(65 + x) + (y + 1); }

    function logLine(text, kind) {
        log.push({ text: text, kind: kind || 'info', t: frameT });
        if (log.length > 5) log.shift();
    }
    function addFloater(text, color, big, y) {
        floaters.push({ text: text, color: color, y: y || (GY + GW * 0.45), life: 80, big: !!big, dy: -0.35 });
    }

    /* ---- spawning (90 % a 2, 10 % a 4, as in the original) ---- */
    var supplied = false;
    function spawnTile() {
        var cells = freeCells();
        if (!cells.length) return null;
        var c = cells[below(cells.length)];
        var value = rand() < 1 - rules.fourChance ? 2 : 4;
        var t;
        /* Corrupted Nodes: rare once the board has reached corruptFrom, never more than corruptMax */
        if (maxTile >= rules.corruptFrom && countKind('NODE') < rules.corruptMax && rand() < rules.corruptChance) {
            t = makeTile(c.x, c.y, rules.corruptValues[below(rules.corruptValues.length)], 'NODE');
        } else if (rules.specials.length) t = spawnSpecial(c.x, c.y, value);
        else t = makeTile(c.x, c.y, value);
        t.appear = 1;
        grid[c.x][c.y] = t;
        return t;
    }
    /* one draw decides whether the spawn is a special block instead of a plain signal */
    function spawnSpecial(cx, cy, value) {
        var roll = rand(), acc = 0;
        var full = countSpecials() >= rules.specialsMax;
        for (var i = 0; i < rules.specials.length; i++) {
            var s = rules.specials[i];
            if (maxTile < s.from) continue;
            /* the supply drop is an ordinary signal, so it does not count as a special */
            if (s.kind !== 'SUPPLY' && (full || countKind(s.kind) > 0)) continue;
            acc += s.chance;
            if (roll >= acc) continue;
            switch (s.kind) {
                case 'SUPPLY':
                    var v = supplyValue(cx, cy);
                    if (!v) return makeTile(cx, cy, value);
                    supplied = true;
                    return makeTile(cx, cy, v);
                case 'CAPACITOR': return makeTile(cx, cy, 0, 'CAPACITOR', CAPACITOR_FUSE);
                case 'CASED': return makeTile(cx, cy, casedValue(), 'CASED', CASE_LAYERS);
                case 'BEACON': return makeTile(cx, cy, rules.corruptValues[below(rules.corruptValues.length)], 'BEACON', BEACON_COUNT);
                case 'PATCH': return makeTile(cx, cy, 0, 'PATCH');
                case 'WALL': return makeTile(cx, cy, 0, 'WALL', WALL_STRENGTH);
                case 'WORM': return makeTile(cx, cy, rules.corruptValues[below(rules.corruptValues.length)], 'WORM', WORM_CYCLE);
            }
        }
        return makeTile(cx, cy, value);
    }
    /* a supply drop copies the biggest signal next to its cell, up to SUPPLY_MAX; 0 when there is none */
    function supplyValue(x, y) {
        var v = 0;
        neighbours(x, y).forEach(function (p) {
            var t = grid[p[0]][p[1]];
            if (t && isSignal(t) && t.value > v && t.value <= SUPPLY_MAX && !lockAt(p[0], p[1])) v = t.value;
        });
        return v >= 8 ? v : 0;
    }
    /* a cased signal holds a thirty-second of the highest signal, at least a 4 */
    function casedValue() {
        var n = Math.max(4, Math.floor(highestTile() / 32)), p = 1;
        while (p * 2 <= n) p *= 2;
        return p;
    }

    /* ---------------------------------------------------------
       The move. Traversal, farthest-position search and the
       one-merge-per-tile rule follow Cirulli's GameManager.move.
       New here: Corrupted Nodes (equal values purge each other
       instead of doubling), NEXUS-9 locks, the EMP Cell, the AI
       Trace Level and the special blocks. A line by line port of
       Engine.kt in the Android app, so both play the same game.
       --------------------------------------------------------- */
    var VECTORS = { 0: { x: 0, y: -1 }, 1: { x: 1, y: 0 }, 2: { x: 0, y: 1 }, 3: { x: -1, y: 0 } };

    function traversals(v) {
        var xs = [], ys = [];
        for (var i = 0; i < SIZE; i++) { xs.push(i); ys.push(i); }
        if (v.x === 1) xs.reverse();
        if (v.y === 1) ys.reverse();
        return { x: xs, y: ys };
    }
    function farthest(x, y, v) {
        var px, py;
        do { px = x; py = y; x = px + v.x; y = py + v.y; } while (cellFree(x, y));
        return { fx: px, fy: py, nx: x, ny: y };
    }
    /* what happens when t slides into n */
    function meet(t, n) {
        if (isSignal(t) && isSignal(n)) return t.value === n.value ? 'merge' : '';
        /* equal values, at least one of them a node (or beacon, or worm) */
        if ((isHostile(t) || isHostile(n)) && (isSignal(t) || isHostile(t)) && (isSignal(n) || isHostile(n))) return t.value === n.value ? 'purge' : '';
        if (((t.kind === 'CASED' && isSignal(n)) || (isSignal(t) && n.kind === 'CASED')) && t.value === n.value) return 'crack';
        if ((t.kind === 'PATCH' && isSignal(n) && n.value <= PATCH_MAX) || (isSignal(t) && t.value <= PATCH_MAX && n.kind === 'PATCH')) return 'patch';
        return '';
    }
    function slideTo(t, x, y, fx, fy) {
        if (fx === x && fy === y) return false;
        grid[x][y] = null;
        grid[fx][fy] = t;
        t.x = fx; t.y = fy;
        return true;
    }

    /* slides every tile towards dir; returns what happened, or null when nothing moved */
    function engineMove(dir) {
        var v = VECTORS[dir], tr = traversals(v), moved = false;
        var r = {
            dir: dir, ghosts: [], merges: [], purges: [], purgedKinds: [], fried: [], friedBy: [], cracks: [], patched: [],
            discharges: [], transmitted: [], infected: null, wallsHit: [], wallsBroken: [], supply: false, locksCracked: 0,
            spawned: null, lock: null, locksReleased: 0, locksTimedOut: false, traceBefore: 0, traceAfter: 0,
            fusions: 0, newMax: 0, wonNow: false, ended: ''
        };
        eachTile(function (t) { t.px = t.x; t.py = t.y; t.mergedFrom = null; t.hit = false; });

        tr.x.forEach(function (x) {
            tr.y.forEach(function (y) {
                var t = grid[x][y];
                if (!t || lockAt(x, y) || t.kind === 'WALL') return;
                var f = farthest(x, y, v);
                var next = tileAt(f.nx, f.ny);
                var how = next && !next.mergedFrom && !lockAt(f.nx, f.ny) ? meet(t, next) : '';
                var m;
                if (how === 'purge') {
                    /* equal values: the Corrupted Node and the signal cancel each other out */
                    grid[x][y] = null;
                    grid[f.nx][f.ny] = null;
                    t.x = f.nx; t.y = f.ny;
                    r.ghosts.push(t, next);
                    r.purges.push({ x: f.nx, y: f.ny, value: t.value });
                    r.purgedKinds.push(isHostile(t) ? t.kind : next.kind);
                    score += t.value * 2;
                    moved = true;
                } else if (how === 'merge' || how === 'patch') {
                    m = makeTile(f.nx, f.ny, how === 'patch' ? Math.max(t.value, next.value) * 2 : t.value * 2);
                    m.mergedFrom = [t, next];
                    m.px = x; m.py = y;           /* drawn at the end of the slide */
                    grid[x][y] = null;
                    grid[f.nx][f.ny] = m;
                    t.x = f.nx; t.y = f.ny;
                    next.px = next.x; next.py = next.y;
                    r.ghosts.push(t, next);
                    r.merges.push(m);
                    if (how === 'patch') r.patched.push(m);
                    score += m.value;
                    if (m.value === rules.target && !won) { won = true; stats.wonAt = moves + 1; r.wonNow = true; }
                    moved = true;
                } else if (how === 'crack') {
                    var cs = t.kind === 'CASED' ? t : next;
                    if (cs.hit) {
                        /* one hit per move: it stops against the case */
                        if (slideTo(t, x, y, f.fx, f.fy)) moved = true;
                    } else if (cs.counter > 1) {
                        /* the case cracks, the signal stops against it */
                        cs.counter--;
                        cs.hit = true;
                        r.cracks.push(cs);
                        slideTo(t, x, y, f.fx, f.fy);
                        moved = true;
                    } else {
                        /* the last layer: they fuse, and it counts double */
                        m = makeTile(f.nx, f.ny, t.value * 2);
                        m.mergedFrom = [t, next];
                        m.px = x; m.py = y;
                        grid[x][y] = null;
                        grid[f.nx][f.ny] = m;
                        t.x = f.nx; t.y = f.ny;
                        next.px = next.x; next.py = next.y;
                        r.ghosts.push(t, next);
                        r.merges.push(m);
                        score += m.value * 2;
                        if (m.value === rules.target && !won) { won = true; stats.wonAt = moves + 1; r.wonNow = true; }
                        moved = true;
                    }
                } else if (slideTo(t, x, y, f.fx, f.fy)) moved = true;
            });
        });
        if (!moved) return null;

        moves++;
        stats.fusions += r.merges.length;
        stats.purged += r.purges.length;

        /* EMP Cells (64) fry any red block that ends up next to them */
        eachTile(function (t) {
            if (!isHostile(t)) return;
            var nb = [tileAt(t.x + 1, t.y), tileAt(t.x - 1, t.y), tileAt(t.x, t.y + 1), tileAt(t.x, t.y - 1)];
            for (var i = 0; i < nb.length; i++) {
                if (nb[i] && isSignal(nb[i]) && nb[i].value === 64) { r.fried.push(t); r.friedBy.push({ x: nb[i].x, y: nb[i].y }); return; }
            }
        });
        r.fried.forEach(function (t) { grid[t.x][t.y] = null; score += 64; });
        stats.fried += r.fried.length;

        /* fusions wear down Static Walls and crack locks right next to them */
        var hits = [];
        r.merges.forEach(function (m) { hits.push({ x: m.x, y: m.y }); });
        r.purges.forEach(function (p) { hits.push({ x: p.x, y: p.y }); });
        r.cracks.forEach(function (c) { hits.push({ x: c.x, y: c.y }); });
        if (hits.length) wearDown(hits, r);

        /* AI Trace Level */
        r.fusions = r.merges.length + r.purges.length + r.cracks.length;
        r.traceBefore = trace;
        if (r.fusions === 0) trace += rules.traceEmpty + countHostile() * rules.tracePerNode;
        else trace -= r.fusions + (r.merges.some(function (m) { return m.value >= rules.bigFusion; }) ? rules.traceBigBonus : 0);
        trace = Math.max(0, Math.min(100, trace));
        stats.peakTrace = Math.max(stats.peakTrace, trace);

        /* locks count down per injection */
        for (var i = locks.length - 1; i >= 0; i--) {
            locks[i].turns--;
            if (locks[i].turns <= 0) { locks.splice(i, 1); r.locksReleased++; }
        }

        var infect = tickSpecials(r);

        supplied = false;
        r.spawned = spawnTile();
        r.supply = supplied;
        /* a worm whose cycle ran out turns the new signal into a Corrupted Node */
        if (infect && r.spawned && isSignal(r.spawned)) { r.spawned.kind = 'NODE'; r.infected = r.spawned; }

        if (trace >= 100) r.lock = nexusLock();
        r.traceAfter = trace;

        var hi = highestTile();
        if (hi > maxTile) { maxTile = hi; r.newMax = hi; }

        if (!(won && !keepPlaying) && !movesAvailable()) {
            if (locks.length) {
                /* a lock may never be the only reason the grid is stuck */
                locks = [];
                r.locksTimedOut = true;
                if (!movesAvailable()) r.ended = 'lost';
            } else r.ended = 'lost';
        }
        return r;
    }

    /* walls next to a fusion lose a layer; locks next to one lose rules.lockCrack moves */
    function wearDown(hits, r) {
        var walls = [], cracked = [];
        hits.forEach(function (h) {
            neighbours(h.x, h.y).forEach(function (p) {
                var w = tileAt(p[0], p[1]);
                if (w && w.kind === 'WALL' && walls.indexOf(w) < 0) walls.push(w);
                if (rules.lockCrack > 0) { var l = lockAt(p[0], p[1]); if (l && cracked.indexOf(l) < 0) cracked.push(l); }
            });
        });
        walls.forEach(function (w) {
            w.counter--;
            if (w.counter <= 0) { grid[w.x][w.y] = null; r.wallsBroken.push(w); } else r.wallsHit.push(w);
        });
        cracked.forEach(function (l) {
            l.turns -= rules.lockCrack;
            if (l.turns <= 0) { locks.splice(locks.indexOf(l), 1); r.locksCracked++; }
        });
    }

    /* counts down capacitors, beacons and worms; true when a worm infects this move */
    function tickSpecials(r) {
        var infect = false;
        tileList().filter(function (t) { return t.kind === 'CAPACITOR' || t.kind === 'BEACON' || t.kind === 'WORM'; }).forEach(function (t) {
            if (grid[t.x][t.y] !== t) return;
            t.counter--;
            if (t.counter > 0) return;
            if (t.kind === 'CAPACITOR') {
                /* the discharge clears the four cells around it; big signals ride it out */
                grid[t.x][t.y] = null;
                var cleared = [];
                neighbours(t.x, t.y).forEach(function (p) {
                    var n = grid[p[0]][p[1]];
                    if (!n) return;
                    if ((isSignal(n) || n.kind === 'CASED') && n.value > CAPACITOR_CLEARS) return;
                    if (n.kind === 'WALL') {
                        n.counter--;
                        if (n.counter <= 0) { grid[p[0]][p[1]] = null; r.wallsBroken.push(n); } else r.wallsHit.push(n);
                    } else {
                        grid[p[0]][p[1]] = null;
                        locks = locks.filter(function (l) { return !(l.x === p[0] && l.y === p[1] && l.pinned); });
                    }
                    cleared.push({ x: p[0], y: p[1] });
                });
                r.discharges.push({ x: t.x, y: t.y, cleared: cleared });
            } else if (t.kind === 'BEACON') {
                /* it gives the player away, and stays behind as a Corrupted Node */
                trace = 100;
                t.kind = 'NODE';
                t.counter = 0;
                r.transmitted.push(t);
            } else {
                t.counter = WORM_CYCLE;
                infect = true;
            }
        });
        return infect;
    }

    /* NEXUS-9 found you: one cell is sealed, a move longer with every lock it makes */
    function nexusLock() {
        var cells = freeCells(), c;
        /* a pin lock picks a signal instead of an empty cell */
        var pin = rules.pinChance > 0 && rand() < rules.pinChance;
        var pinnable = pin ? tileList().filter(function (t) { return isSignal(t) && !lockAt(t.x, t.y); }) : [];
        if (pinnable.length) { var p = pinnable[below(pinnable.length)]; c = { x: p.x, y: p.y }; }
        else if (cells.length) c = cells[below(cells.length)];
        else {
            var all = [];
            eachTile(function (t) { if (!lockAt(t.x, t.y)) all.push({ x: t.x, y: t.y }); });
            if (!all.length) return null;
            c = all[below(all.length)];
        }
        var turns = Math.min(Math.max(rules.lockMax, rules.lockTurns), rules.lockTurns + stats.locks * rules.lockGrowth);
        var l = { x: c.x, y: c.y, turns: turns, pinned: !!tileAt(c.x, c.y) };
        locks.push(l);
        trace = rules.traceAfterLock;
        stats.locks++;
        return l;
    }

    /* true when at least one swipe changes the board: with walls and pinned
       signals a free cell can be out of reach, so look at each tile's neighbours */
    function movesAvailable() {
        for (var x = 0; x < SIZE; x++) for (var y = 0; y < SIZE; y++) {
            var t = grid[x][y];
            if (!t || lockAt(x, y) || t.kind === 'WALL') continue;
            for (var d = 0; d < 4; d++) {
                var nx = x + VECTORS[d].x, ny = y + VECTORS[d].y;
                if (!within(nx, ny) || lockAt(nx, ny)) continue;
                var n = grid[nx][ny];
                if (!n || meet(t, n)) return true;
            }
        }
        return false;
    }

    /* ---- the board as data: saves, the rollback buffer (same format as the app) ---- */
    function snapshot() {
        var cells = [];
        eachTile(function (t) {
            var c = [t.x, t.y, t.value, t.kind === 'NODE' ? 1 : 0];
            if (t.kind !== 'SIGNAL' && t.kind !== 'NODE') c.push(t.kind, t.counter);
            cells.push(c);
        });
        return {
            cells: cells,
            locks: locks.map(function (l) { return l.pinned ? [l.x, l.y, l.turns, 1] : [l.x, l.y, l.turns]; }),
            score: score, moves: moves, trace: trace, max: maxTile, won: won, keep: keepPlaying,
            rng: rngState, id: tileId,
            fusions: stats.fusions, purged: stats.purged, fried: stats.fried,
            locksSuffered: stats.locks, peakTrace: stats.peakTrace, wonAt: stats.wonAt
        };
    }
    function restoreSnapshot(o) {
        grid = emptyGrid();
        o.cells.forEach(function (c) {
            if (!within(c[0], c[1])) return;
            var kind = c.length > 4 ? c[4] : (c[3] === 1 ? 'NODE' : 'SIGNAL');
            grid[c[0]][c[1]] = makeTile(c[0], c[1], c[2], KINDS[kind] ? kind : 'SIGNAL', c.length > 5 ? c[5] : 0);
        });
        tileId = Math.max(o.id || 1, tileId);
        /* saves from before October 15, 2026 keep their locks as objects */
        locks = (Array.isArray(o.locks) ? o.locks : []).map(function (l) {
            return Array.isArray(l) ? { x: l[0], y: l[1], turns: l[2], pinned: l[3] === 1 } : { x: l.x, y: l.y, turns: l.turns, pinned: !!l.pinned };
        });
        score = o.score || 0; moves = o.moves || 0; trace = o.trace || 0;
        maxTile = o.max || highestTile();
        won = !!o.won; keepPlaying = !!o.keep;
        rngState = typeof o.rng === 'number' ? o.rng | 0 : newSeed();
        stats = { fusions: o.fusions || 0, purged: o.purged || 0, fried: o.fried || 0, locks: o.locksSuffered || 0, peakTrace: o.peakTrace || 0, wonAt: o.wonAt || 0 };
    }

    /* clears the animation state, so a restored board does not slide in */
    function settle() {
        anim.t = 1;
        ghosts = []; friedShown = []; impact = null; pending = -1;
        eachTile(function (t) { t.px = t.x; t.py = t.y; t.appear = 0; t.pop = 0; t.mergedFrom = null; });
    }

    function clearScreenFx() {
        ghosts = []; friedShown = []; impact = null; pending = -1;
        particles = []; rings = []; floaters = []; bolts = [];
        nodePulse = 0; rewind = 0;
    }

    function resetGame() {
        mode = 'classic';
        unlocked = progress.bestTile;
        rules = classicRules(unlocked);
        rngState = newSeed();
        grid = emptyGrid();
        locks = []; log = [];
        clearScreenFx();
        score = 0; moves = 0; trace = 0; elapsed = 0; maxTile = 0;
        won = false; keepPlaying = false; overReason = '';
        stats = { fusions: 0, purged: 0, fried: 0, locks: 0, peakTrace: 0, wonAt: 0 };
        history = []; earned = {}; charges = Math.min(rules.rollbackStart, rules.rollbackMax); rollbacksUsed = 0; submitted = false;
        anim.t = 1;
        spawnTile(); spawnTile();
        maxTile = highestTile();
        state = 'playing';
        stateTimer = 0;
        sessionStart = Date.now();
        logLine('LINK ESTABLISHED. SECTOR 7 GRID ONLINE.', 'ok');
        logLine('INJECT SIGNALS. TARGET: 2048 BIT.', 'info');
        setMusicLevel(maxTile);
        updateMusicGain();
        sfxStart();
        hideCard();
        saveState();
        progress.games++;
        saveProgress();
        updateRollbackUi();
        describeBoard();
        if (typeof gtag === 'function') gtag('event', 'game_start', { 'event_category': 'override', 'event_label': progress.theme, 'value': 1 });
    }

    /* the first session on this terminal starts with the training */
    function startSession() {
        if (!seen.tutorial && progress.games === 0) startTutorial(false);
        else resetGame();
    }

    /* ---- saved game: a reload on a phone should not cost the run ---- */
    function saveState() {
        if (mode === 'tutorial') return;
        if (state !== 'playing' && state !== 'won') { try { localStorage.removeItem('override-state'); } catch (e) {} return; }
        var s = snapshot();
        s.v = 2;
        s.elapsed = elapsed;
        s.state = state;
        s.unlocked = unlocked;
        s.charges = charges;
        s.earned = Object.keys(earned).map(Number);
        s.rollbacksUsed = rollbacksUsed;
        s.history = history;
        try { localStorage.setItem('override-state', JSON.stringify(s)); } catch (e) {}
    }
    function restoreState() {
        var s = null;
        try { s = JSON.parse(localStorage.getItem('override-state') || 'null'); } catch (e) {}
        if (!s || !Array.isArray(s.cells) || !s.cells.length) return false;
        mode = 'classic';
        unlocked = typeof s.unlocked === 'number' ? s.unlocked : progress.bestTile;
        rules = classicRules(unlocked);
        log = [];
        clearScreenFx();
        restoreSnapshot(s);
        settle();
        elapsed = s.elapsed || 0;
        history = Array.isArray(s.history) ? s.history.filter(function (h) { return h && Array.isArray(h.cells); }) : [];
        earned = {};
        (Array.isArray(s.earned) ? s.earned : []).forEach(function (v) { earned[v] = true; });
        charges = typeof s.charges === 'number' ? Math.max(0, Math.min(rules.rollbackMax, s.charges)) : rules.rollbackStart;
        rollbacksUsed = s.rollbacksUsed || 0;
        submitted = false;
        overReason = '';
        state = s.state === 'won' ? 'won' : 'playing';
        stateTimer = s.state === 'won' ? 200 : 0;
        sessionStart = Date.now() - elapsed * 1000;
        logLine('SESSION RESTORED FROM LOCAL BUFFER.', 'ok');
        setMusicLevel(maxTile);
        updateRollbackUi();
        describeBoard();
        return true;
    }

    /* ---------------------------------------------------------
       A move as the player makes it: the engine, then sound,
       log, hints and the records (GameController.kt)
       --------------------------------------------------------- */
    function move(dir) {
        if (state !== 'playing') return false;
        if (mode === 'tutorial' && (tut.step === 'READY' || (tut.step === 'ROLLBACK' && history.length > 0))) return false;
        /* a swipe made while the tiles still slide is never dropped */
        if (anim.t < 0.5) { pending = dir; return true; }
        finishAnim();
        var before = snapshot();
        var r = engineMove(dir);
        if (!r) { sfxBlocked(); shake = Math.max(shake, 2 * fxScale); return false; }
        history.push(before);
        while (history.length > Math.max(1, rules.rollbackMax)) history.shift();
        ghosts = r.ghosts;
        friedShown = r.fried.slice();
        impact = r;
        anim.t = 0;
        surge = { dir: dir, t: 0 };
        vu.level = Math.min(1, 0.45 + r.merges.length * 0.18 + r.purges.length * 0.1);
        feedback(r);
        if (mode === 'tutorial') advanceTutorial(r);
        setMusicLevel(maxTile);
        saveState();
        updateRollbackUi();
        describeBoard();
        return true;
    }

    function hostileName(kind) {
        return kind === 'BEACON' ? 'A TRACE BEACON' : (kind === 'WORM' ? 'A WORM' : 'A CORRUPTED NODE');
    }

    function feedback(r) {
        sfxSlide(r.dir);
        r.merges.forEach(function (m, i) {
            m.pop = 1;
            sfxMerge(m.value, i);
            if (m.value >= 64) logLine('FUSION  ' + pad(m.value, 4) + '  ' + tileDef(m.value).name, m.value >= 512 ? 'ok' : 'info');
        });
        r.purges.forEach(function (p, i) {
            var what = hostileName(r.purgedKinds[i]);
            sfxPurge();
            addFloater(what.split(' ').pop() + ' PURGED  +' + (p.value * 2) + ' Hz', '#ff8a9a');
            logLine(what.slice(2) + ' PURGED  +' + (p.value * 2) + ' Hz', 'ok');
        });
        r.fried.forEach(function (t) {
            sfxEmp();
            addFloater('EMP DISCHARGE  +64 Hz', '#ffe64d', true);
            logLine('EMP CELL FRIED ' + hostileName(t.kind) + '  +64 Hz', 'ok');
        });
        r.cracks.forEach(function () { sfxCrack(); logLine('CASE CRACKED. ONE MORE HIT.', 'info'); });
        r.patched.forEach(function (m) {
            addFloater('PATCHED  ' + m.value, '#7fd8ff');
            logLine('PATCH CABLE BRIDGED A ' + (m.value / 2) + '  +' + m.value + ' Hz', 'ok');
        });
        r.discharges.forEach(function (d) {
            sfxDischarge();
            addFloater('SURGE  ' + d.cleared.length + ' CELLS CLEARED', '#7fd8ff', true);
            logLine('SURGE CAPACITOR DISCHARGED AT ' + cellName(d.x, d.y), 'warn');
        });
        r.wallsHit.forEach(function (w) { logLine('STATIC WALL WEAKENED  [' + w.counter + ']', 'info'); });
        r.wallsBroken.forEach(function () {
            sfxPurge();
            addFloater('STATIC WALL DOWN', '#b8c4cc');
            logLine('STATIC WALL BROKEN', 'ok');
        });
        r.transmitted.forEach(function (t) {
            sfxLock();
            addFloater('BEACON TRANSMITTED', '#ff4d6d', true);
            logLine('TRACE BEACON AT ' + cellName(t.x, t.y) + ' TRANSMITTED. TRACE 100%.', 'warn');
        });
        if (r.infected) {
            sfxCorrupt();
            addFloater('WORM INFECTED ' + cellName(r.infected.x, r.infected.y), '#ff4d6d');
            logLine('WORM INFECTED A SIGNAL AT ' + cellName(r.infected.x, r.infected.y), 'warn');
        }
        if (r.locksCracked > 0) {
            sfxUnlock();
            addFloater('LOCK CRACKED', '#4dff9a');
            logLine('NEXUS-9 LOCK CRACKED OPEN', 'ok');
        }
        var sp = r.spawned;
        if (sp && !r.infected) {
            if (sp.kind === 'NODE') {
                sfxCorrupt();
                noiseBurst = Math.max(noiseBurst, 14 * fxScale);
                logLine('CORRUPTED NODE DETECTED  [' + sp.value + ']', 'warn');
                showHint('corrupt');
            } else if (sp.kind !== 'SIGNAL') {
                meetBlock(sp.kind);
                sfxSpecial(isHostile(sp));
                if (isHostile(sp)) noiseBurst = Math.max(noiseBurst, 14 * fxScale);
                logLine(SPAWN_LINES[sp.kind], isHostile(sp) ? 'warn' : 'info');
                showHint(sp.kind.toLowerCase());
            } else if (r.supply) {
                meetBlock('SUPPLY');
                sfxUnlock();
                addFloater('SUPPLY DROP  ' + sp.value, '#4dff9a');
                logLine('SUPPLY DROP RECEIVED  [' + sp.value + ']', 'ok');
                showHint('supply');
            } else sfxSpawn();
        }
        if (r.traceAfter >= 80 && r.traceBefore < 80 && !r.lock) { sfxTraceWarn(); logLine('WARNING: TRACE LEVEL CRITICAL', 'warn'); }
        if (r.traceAfter >= 50 && !r.lock) showHint('trace');
        if (r.locksReleased > 0) logLine('NEXUS-9 LOCK RELEASED', 'info');
        if (r.locksTimedOut) logLine('NEXUS-9 LOCKS TIMED OUT', 'info');
        if (r.lock) {
            var l = r.lock, cn = cellName(l.x, l.y);
            sfxLock();
            shake = 9 * fxScale;
            noiseBurst = 20 * fxScale;
            addFloater(l.pinned ? 'NEXUS-9 PINNED ' + cn : 'NEXUS-9 LOCKED CELL ' + cn, '#ff4d6d', true);
            logLine('TRACE 100%: NEXUS-9 ' + (l.pinned ? 'PINNED' : 'SEALED') + ' CELL ' + cn + ' (' + l.turns + ' TURNS)', 'warn');
            showHint('lock');
            if (l.pinned) { meetBlock('PIN'); showHint('pin'); }
            else if (stats.locks >= 2 && rules.lockGrowth > 0) showHint('learns');
        }
        if (r.newMax > 0) onNewMax(r.newMax);
        if (r.fried.length) showHint('emp');

        /* hints go away after a few moves */
        if (hint && hint !== 'tutorial' && ++hintMoves >= 6) dismissHint();

        if (r.wonNow && won && !keepPlaying) winGame();
        else if (r.ended) gameOver('lost');
    }

    /* sparks, rings and arcs where the slide lands */
    function fireImpact() {
        var r = impact;
        impact = null;
        if (!r) return;
        r.merges.forEach(function (m) {
            spawnSparks(m.x, m.y, tileDef(m.value).col2, m.value >= 128 ? 22 : 12);
            rings.push({ x: cellX(m.x) + CELL / 2, y: cellY(m.y) + CELL / 2, r: 10, life: 26, col: tileDef(m.value).col2 });
        });
        r.purges.forEach(function (p) {
            spawnSparks(p.x, p.y, '#ff4d6d', 18);
            rings.push({ x: cellX(p.x) + CELL / 2, y: cellY(p.y) + CELL / 2, r: 10, life: 30, col: '#ff4d6d' });
        });
        r.fried.forEach(function (t, i) {
            spawnSparks(t.x, t.y, '#ffe64d', 30);
            rings.push({ x: cellX(t.x) + CELL / 2, y: cellY(t.y) + CELL / 2, r: 14, life: 36, col: '#ffe64d' });
            flash = calm ? 0.3 : 0.8;
            /* the arc from the EMP Cell to the node it burned */
            var e = r.friedBy[i];
            if (e) bolts.push({ x0: cellX(e.x) + CELL / 2, y0: cellY(e.y) + CELL / 2, x1: cellX(t.x) + CELL / 2, y1: cellY(t.y) + CELL / 2, life: 24 });
        });
        friedShown = [];
        r.cracks.forEach(function (t) {
            spawnSparks(t.x, t.y, '#c8d0d6', 10);
            rings.push({ x: cellX(t.x) + CELL / 2, y: cellY(t.y) + CELL / 2, r: 10, life: 20, col: '#c8d0d6' });
        });
        r.discharges.forEach(function (d) {
            spawnSparks(d.x, d.y, '#7fd8ff', 34);
            rings.push({ x: cellX(d.x) + CELL / 2, y: cellY(d.y) + CELL / 2, r: 14, life: 40, col: '#7fd8ff' });
            d.cleared.forEach(function (c) {
                spawnSparks(c.x, c.y, '#7fd8ff', 12);
                bolts.push({ x0: cellX(d.x) + CELL / 2, y0: cellY(d.y) + CELL / 2, x1: cellX(c.x) + CELL / 2, y1: cellY(c.y) + CELL / 2, life: 20 });
            });
            flash = calm ? 0.3 : 0.7;
            shake = Math.max(shake, 7 * fxScale);
        });
        r.wallsHit.concat(r.wallsBroken).forEach(function (w) { spawnSparks(w.x, w.y, '#b8c4cc', r.wallsBroken.indexOf(w) >= 0 ? 26 : 8); });
        r.transmitted.forEach(function (t) {
            rings.push({ x: cellX(t.x) + CELL / 2, y: cellY(t.y) + CELL / 2, r: 10, life: 50, col: '#ff7a3d' });
            rings.push({ x: cellX(t.x) + CELL / 2, y: cellY(t.y) + CELL / 2, r: 4, life: 60, col: '#ff4d6d' });
        });
        if (r.infected) spawnSparks(r.infected.x, r.infected.y, '#ff5ac8', 16);
        /* an idle move with red blocks on the board: show that they fed the trace */
        var nodes = countHostile();
        if (r.fusions === 0 && nodes > 0 && rules.tracePerNode > 0 && !r.lock) {
            nodePulse = 1;
            nodeTrace = nodes * rules.tracePerNode;
        }
    }

    function finishAnim() {
        if (impact) fireImpact();
        anim.t = 1;
        ghosts = [];
        friedShown = [];
        eachTile(function (t) { t.px = t.x; t.py = t.y; t.appear = 0; });
    }

    function onNewMax(v) {
        var d = tileDef(v);
        if (v >= 16) addFloater(d.name, d.col2, v >= 128, cellY(0) - 2);
        /* a rollback charge for every new big signal, once per value per game */
        if (v >= 256 && !earned[v] && mode === 'classic') {
            earned[v] = true;
            if (charges < rules.rollbackMax) {
                charges++;
                logLine('ROLLBACK BUFFER CHARGED  [' + charges + '/' + rules.rollbackMax + ']', 'ok');
                showHint('rollback');
            }
        }
        if (v > progress.bestTile) {
            progress.bestTile = v;
            saveProgress();
            var news = [];
            THEME_KEYS.forEach(function (k) { if (THEMES[k].req === v) news.push('THEME: ' + THEMES[k].name.toUpperCase()); });
            FILES.forEach(function (f) { if (f.req === v) news.push(f.title.replace(' // ', ': ')); });
            if (news.length) {
                sfxUnlock();
                news.forEach(function (n, i) { floaters.push({ text: 'DECRYPTED  ' + n, color: '#4dff9a', y: GY + GW * 0.62 + i * 14, life: 110, big: false, dy: -0.25 }); });
                logLine('DECRYPTED: ' + news.join(', '), 'ok');
                renderArchive();
            }
            renderManual();
        }
    }

    function winGame() {
        state = 'won';
        stateTimer = 0;
        strobe = 1;
        shake = 10 * fxScale;
        flash = 1;
        sfxWin();
        progress.wins++;
        if (score > progress.best) progress.best = score;
        saveProgress();
        logLine('OVERRIDE CODE ASSEMBLED. CORE OVERLOAD.', 'ok');
        setTimeout(function () { if (state === 'won') speak('System override successful. A I core offline.'); }, 1400);
        renderArchive();
        showWinRow(true);
        updateRollbackUi();
        if (typeof gtag === 'function') gtag('event', 'override_win', { 'event_category': 'override', 'event_label': 'moves_' + moves, 'value': score });
    }

    function continueGame() {
        if (state !== 'won') return;
        keepPlaying = true;
        showWinRow(false);
        /* a board without moves right after the Override ends the session instead of hanging */
        if (!movesAvailable()) { gameOver('lost'); return; }
        state = 'playing';
        stateTimer = 0;
        sessionStart = Date.now() - elapsed * 1000;
        logLine('ENDLESS MODE: GLOBAL PURGE. TARGET 4096.', 'warn');
        addFloater('GLOBAL PURGE INITIATED', '#ff4ddb', true);
        updateMusicGain();
        saveState();
        updateRollbackUi();
    }

    function gameOver(reason) {
        overReason = reason;
        state = 'over';
        stateTimer = 0;
        showWinRow(false);
        if (reason === 'lost') { sfxSignalLost(); shake = 14 * fxScale; noiseBurst = 90 * (calm ? 0.4 : 1); logLine('SIGNAL LOST. AI DETECTED.', 'warn'); }
        else logLine('SESSION TERMINATED BY OPERATOR.', 'info');
        if (score > progress.best) progress.best = score;
        saveProgress();
        saveState();
        updateMusicGain();
        updateRollbackUi();
        if (reason === 'lost' && canRollback()) showHint('rollback');
        if (typeof gtag === 'function') gtag('event', 'game_over', { 'event_category': 'override', 'event_label': 'tile_' + maxTile + '_' + reason, 'value': score });
    }

    /* ---------------------------------------------------------
       Rollback: undoes the last move, the spawn and the trace
       with it. One charge at the start, one more for every new
       256, 512, 1024 and up, three at most. It also works right
       after SIGNAL LOST, as long as no score was signed.
       --------------------------------------------------------- */
    function canRollback() {
        if (charges <= 0 || !history.length) return false;
        if (state === 'playing') return mode !== 'tutorial' || tut.step === 'ROLLBACK';
        return (state === 'over' || state === 'name-entry') && overReason === 'lost' && !submitted;
    }
    function rollback() {
        if (!canRollback()) { if (state === 'playing') sfxBlocked(); return false; }
        if (state === 'name-entry') {
            if (nameRow) nameRow.hidden = true;
            if (nameInput) nameInput.blur();
        }
        restoreSnapshot(history.pop());
        settle();
        charges--;
        rollbacksUsed++;
        if (state !== 'playing') {
            state = 'playing';
            overReason = '';
            stateTimer = 0;
            sessionStart = Date.now() - elapsed * 1000;
            updateMusicGain();
        }
        markSeen('rollback');
        if (hint === 'rollback') hideCard();
        sfxRollback();
        rewind = 1;
        noiseBurst = Math.max(noiseBurst, 16 * fxScale);
        logLine('ROLLBACK: MOVE REVERSED  [' + charges + ' LEFT]', 'ok');
        setMusicLevel(maxTile);
        if (mode === 'tutorial') tutorialNext('READY');
        saveState();
        updateRollbackUi();
        describeBoard();
        if (typeof gtag === 'function') gtag('event', 'rollback', { 'event_category': 'override', 'event_label': mode, 'value': 1 });
        return true;
    }

    /* ---------------------------------------------------------
       The tutorial: one board that grows with the player, one
       thing at a time, always by doing it: slide, fuse, watch
       the trace rise, cool it down, get locked and wait it out,
       roll a move back. Only the rules change between steps.
       --------------------------------------------------------- */
    var TUT_RULES = withRules(CLASSIC, { traceEmpty: 0, fourChance: 0, corruptFrom: 1 << 30, endless: false, target: 1 << 20 });
    var tut = { step: '', locked: false, resume: false };
    function tutText(step) {
        var coarse = isCoarse();
        switch (step) {
            case 'SLIDE': return ['SLIDE', (coarse ? 'Swipe anywhere on the screen.' : 'Press an arrow key (or W A S D).') + ' Every signal slides as far as it can. Slide the two 2s together.'];
            case 'FUSE': return ['FUSE', 'Two equal signals fuse into one of double strength. A second 4 just arrived: fuse the two 4s into an 8.'];
            case 'TRACE': return ['THE AI TRACE', 'The lit bar at the top is the AI TRACE. It rises with every move that fuses nothing. Slide a few times without fusing and watch it climb.'];
            case 'COOL': return ['COOL IT DOWN', 'Fusing makes the trace drop again. Slide so two equal signals touch and fuse.'];
            case 'LOCK': return tut.locked
                ? ['NEXUS-9', 'That red cell is locked: nothing slides into it or out of it. The number counts down with every move. Make a few moves and it opens again.']
                : ['NEXUS-9', 'If the trace reaches 100%, NEXUS-9 locks a cell. Try it: slide without fusing until the bar is full.'];
            case 'ROLLBACK': return history.length
                ? ['ROLLBACK', 'Now press ROLLBACK' + (coarse ? '' : ' (or U)') + ' and watch your last move disappear.']
                : ['ROLLBACK', 'Made a bad move? ROLLBACK takes it back, new tile included. You earn charges by building big signals. Make any move first.'];
            default: return ['READY', 'That is all you need. Build a 2048 to take the AI core down. Red nodes, EMP Cells and the other blocks are explained when you meet them, and the Field Manual below the terminal has it all.'];
        }
    }
    function startTutorial(fromManual) {
        /* a session in progress stays saved and comes back afterwards */
        tut.resume = fromManual && mode === 'classic' && (state === 'playing' || state === 'won');
        if (tut.resume) saveState();
        mode = 'tutorial';
        rules = TUT_RULES;
        rngState = 20481;
        grid = emptyGrid();
        grid[0][2] = makeTile(0, 2, 2);
        grid[3][2] = makeTile(3, 2, 2);
        locks = []; log = [];
        clearScreenFx();
        settle();
        score = 0; moves = 0; trace = 0; elapsed = 0; maxTile = 2;
        won = false; keepPlaying = false; overReason = '';
        stats = { fusions: 0, purged: 0, fried: 0, locks: 0, peakTrace: 0, wonAt: 0 };
        history = []; earned = {}; charges = 0; rollbacksUsed = 0; submitted = true;
        state = 'playing';
        stateTimer = 0;
        sessionStart = Date.now();
        showWinRow(false);
        if (nameRow) nameRow.hidden = true;
        tut.locked = false;
        logLine('TRAINING LINK ESTABLISHED.', 'ok');
        sfxStart();
        setMusicLevel(maxTile);
        updateMusicGain();
        tutorialNext('SLIDE', true);
        describeBoard();
        if (typeof gtag === 'function') gtag('event', 'tutorial_start', { 'event_category': 'override', 'event_label': fromManual ? 'manual' : 'first_session', 'value': 1 });
    }
    function tutorialNext(step, quiet) {
        tut.step = step;
        if (!quiet) sfxUnlock();
        if (step === 'FUSE') { pairUp(4); logLine('FUSION CONFIRMED. KEEP GOING.', 'ok'); }
        else if (step === 'TRACE') { rules = withRules(TUT_RULES, { traceEmpty: 20 }); logLine('WARNING: NEXUS-9 IS LISTENING.', 'warn'); }
        else if (step === 'COOL') {
            /* any fusion now takes a big bite out of the trace */
            rules = withRules(TUT_RULES, { traceEmpty: 20, bigFusion: 2, traceBigBonus: 24 });
            pairUp(2);
            logLine('TRACE CLIMBING. FUSE TO COOL IT DOWN.', 'info');
        } else if (step === 'LOCK') { rules = withRules(TUT_RULES, { traceEmpty: 34, lockTurns: 3, traceAfterLock: 0 }); logLine('LET THE TRACE REACH 100%.', 'info'); }
        else if (step === 'ROLLBACK') {
            rules = TUT_RULES;
            /* only the move the player makes next can be rolled back */
            history = [];
            charges = 1;
            logLine('ROLLBACK BUFFER CHARGED  [1]', 'ok');
        } else if (step === 'READY') logLine('TRAINING COMPLETE.', 'ok');
        showTutorialCard();
        updateRollbackUi();
    }
    /* puts a [value] in line with one already on the board, so the next fusion is one swipe away */
    function pairUp(value) {
        var own = tileList().filter(function (t) { return t.value === value && isSignal(t); });
        if (!own.length) own = tileList();
        for (var i = 0; i < own.length; i++) {
            var t = own[i], best = null, bestD = -1;
            for (var k = 0; k < SIZE; k++) {
                [[k, t.y], [t.x, k]].forEach(function (c) {
                    if ((c[0] === t.x && c[1] === t.y) || grid[c[0]][c[1]] || lockAt(c[0], c[1]) || !clearBetween(t.x, t.y, c[0], c[1])) return;
                    var d = Math.abs(c[0] - t.x) + Math.abs(c[1] - t.y);
                    if (d > bestD) { bestD = d; best = c; }
                });
            }
            if (!best) continue;
            var n = makeTile(best[0], best[1], t.value);
            n.appear = 1;
            grid[best[0]][best[1]] = n;
            return;
        }
    }
    function clearBetween(x0, y0, x1, y1) {
        var dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0), x = x0 + dx, y = y0 + dy;
        while (x !== x1 || y !== y1) {
            if (grid[x][y] || lockAt(x, y)) return false;
            x += dx; y += dy;
        }
        return true;
    }
    function advanceTutorial(r) {
        var s = tut.step;
        if (s === 'SLIDE') { if (r.merges.some(function (m) { return m.value >= 4; })) tutorialNext('FUSE'); }
        else if (s === 'FUSE') { if (r.merges.some(function (m) { return m.value >= 8; })) tutorialNext('TRACE'); }
        else if (s === 'TRACE') { if (trace >= 50) tutorialNext('COOL'); }
        else if (s === 'COOL') { if (r.fusions > 0 && r.traceAfter < r.traceBefore) tutorialNext('LOCK'); }
        else if (s === 'LOCK') {
            if (r.lock) {
                tut.locked = true;
                /* one lock is enough: the trace stays quiet while the player waits it out */
                rules = TUT_RULES;
                showTutorialCard();
            }
            if (tut.locked && !locks.length) { tut.locked = false; tutorialNext('ROLLBACK'); }
        } else if (s === 'ROLLBACK') showTutorialCard();
        /* never let the training board fill up */
        if (freeCells().length < 6) {
            var twos = tileList().filter(function (t) { return t.value === 2 && !lockAt(t.x, t.y); });
            twos.slice(1).forEach(function (t) { grid[t.x][t.y] = null; });
            logLine('TRAINING BUFFER DEFRAGMENTED.', 'info');
        }
    }
    /* SKIP TUTORIAL or JACK IN at the end: the real session starts (or comes back) */
    function finishTutorial(completed) {
        markSeen('tutorial');
        hideCard();
        if (typeof gtag === 'function') gtag('event', completed ? 'tutorial_complete' : 'tutorial_skip', { 'event_category': 'override', 'event_label': tut.step, 'value': 1 });
        var resume = tut.resume;
        tut.step = '';
        tut.resume = false;
        mode = 'classic';
        if (resume && restoreState()) {
            if (state === 'won') showWinRow(true);
            updateMusicGain();
            return;
        }
        resetGame();
    }

    function spawnSparks(cx, cy, col, n) {
        var x0 = cellX(cx) + CELL / 2, y0 = cellY(cy) + CELL / 2;
        n = Math.round(n * (calm ? 0.5 : 1));
        for (var i = 0; i < n; i++) {
            var a = Math.random() * TAU, sp = 1.2 + Math.random() * 3.2;
            particles.push({ x: x0, y: y0, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 18 + Math.random() * 22, col: Math.random() < 0.3 ? '#ffffff' : col });
        }
    }

    /* ---------------------------------------------------------
       Baked artwork: bezel + screen + slots (per theme), the
       scanline/vignette overlay, one sprite per tile value.
       --------------------------------------------------------- */
    var bgCanvas = null, overlayCanvas = null, sprites = {}, corruptSprite = null, specialSprites = {}, caseSprites = [], glowCache = {};

    function bakeBackground() {
        bgCanvas = makeCanvas(W * DPR, H * DPR);
        var g = bgCanvas.getContext('2d');
        g.scale(DPR, DPR);

        /* bezel */
        var bz = g.createLinearGradient(0, 0, 0, H);
        bz.addColorStop(0, '#2a2e35'); bz.addColorStop(0.5, '#15181d'); bz.addColorStop(1, '#0a0c0f');
        g.fillStyle = bz;
        roundRect(g, 0, 0, W, H, 22); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
        roundRect(g, 0.5, 0.5, W - 1, H - 1, 22); g.stroke();
        /* screws */
        [[14, 14], [W - 14, 14], [14, H - 14], [W - 14, H - 14]].forEach(function (p) {
            g.fillStyle = '#3a3f47'; g.beginPath(); g.arc(p[0], p[1], 3.2, 0, TAU); g.fill();
            g.strokeStyle = '#0c0e11'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(p[0] - 2, p[1]); g.lineTo(p[0] + 2, p[1]); g.moveTo(p[0], p[1] - 2); g.lineTo(p[0], p[1] + 2); g.stroke();
        });

        /* the tube: slightly lighter in the middle, dark towards the glass edge */
        g.save();
        roundRect(g, 7, 7, W - 14, H - 14, 18); g.clip();
        var sc = g.createRadialGradient(W / 2, H * 0.42, 20, W / 2, H * 0.42, H * 0.75);
        sc.addColorStop(0, theme.bg2); sc.addColorStop(1, theme.bg);
        g.fillStyle = sc; g.fillRect(0, 0, W, H);
        /* faint phosphor dot grid */
        g.fillStyle = rgba(theme.main, 0.035);
        for (var yy = 10; yy < H; yy += 6) for (var xx = 10; xx < W; xx += 6) g.fillRect(xx, yy, 1, 1);

        /* header strip */
        g.fillStyle = rgba(theme.main, 0.06); g.fillRect(7, 7, W - 14, 16);
        g.fillStyle = theme.mid; g.font = '7px ' + FONT; g.textBaseline = 'middle'; g.textAlign = 'left';
        g.fillText('NEXUS-9 GRID // SECTOR 7 // MK-II', 14, 15.5);
        g.strokeStyle = rgba(theme.main, 0.25); g.lineWidth = 1;
        g.beginPath(); g.moveTo(7, 23.5); g.lineTo(W - 7, 23.5); g.stroke();

        /* HUD labels */
        g.textAlign = 'left'; g.textBaseline = 'alphabetic';
        g.fillStyle = theme.mid; g.font = '7px ' + FONT;
        g.fillText('FREQUENCY', 12, 38); g.fillText('BEST', 152, 38); g.fillText('INJECTIONS', 240, 38); g.fillText('UPTIME', 322, 38);
        g.fillText('AI TRACE', 12, 83);
        g.strokeStyle = rgba(theme.main, 0.14);
        g.beginPath(); g.moveTo(7, 70.5); g.lineTo(W - 7, 70.5); g.stroke();
        /* trace bar housing */
        g.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(g, 76, 77, 312, 19, 3); g.fill();
        g.strokeStyle = rgba(theme.main, 0.28); roundRect(g, 76.5, 77.5, 311, 18, 3); g.stroke();

        /* grid plate */
        g.fillStyle = 'rgba(0,0,0,0.32)'; roundRect(g, GX, GY, GW, GW, 8); g.fill();
        g.strokeStyle = rgba(theme.main, 0.22); roundRect(g, GX + 0.5, GY + 0.5, GW - 1, GW - 1, 8); g.stroke();
        for (var x = 0; x < SIZE; x++) for (var y = 0; y < SIZE; y++) drawSlot(g, cellX(x), cellY(y));

        /* LED ladder housing */
        g.fillStyle = 'rgba(0,0,0,0.5)'; roundRect(g, LX, GY, LW, GW, 4); g.fill();
        g.strokeStyle = rgba(theme.main, 0.22); roundRect(g, LX + 0.5, GY + 0.5, LW - 1, GW - 1, 4); g.stroke();
        g.fillStyle = theme.mid; g.font = '6px ' + FONT; g.textAlign = 'center';
        g.fillText('SIG', LX + LW / 2, GY - 3);

        /* bottom panel: VU box + log box */
        g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, 12, BOT_Y, 160, BOT_H, 6); g.fill();
        g.strokeStyle = rgba(theme.main, 0.22); roundRect(g, 12.5, BOT_Y + 0.5, 159, BOT_H - 1, 6); g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(g, 180, BOT_Y, 208, BOT_H, 6); g.fill();
        g.strokeStyle = rgba(theme.main, 0.22); roundRect(g, 180.5, BOT_Y + 0.5, 207, BOT_H - 1, 6); g.stroke();
        g.fillStyle = theme.mid; g.font = '7px ' + FONT; g.textAlign = 'left';
        g.fillText('SYS.LOG', 188, BOT_Y + 12);
        g.fillText('VU  INJECTION LEVEL', 20, BOT_Y + 12);
        drawVuFace(g);
        g.restore();
    }

    function drawSlot(g, px, py) {
        g.save();
        roundRect(g, px, py, CELL, CELL, 7);
        var sg = g.createLinearGradient(px, py, px, py + CELL);
        sg.addColorStop(0, 'rgba(0,0,0,0.78)'); sg.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = sg; g.fill();
        g.strokeStyle = rgba(theme.main, 0.16); g.lineWidth = 1; g.stroke();
        /* inner shadow ridge at the top, lit lip at the bottom */
        g.strokeStyle = 'rgba(0,0,0,0.6)';
        g.beginPath(); g.moveTo(px + 6, py + 1.5); g.lineTo(px + CELL - 6, py + 1.5); g.stroke();
        g.strokeStyle = rgba(theme.main, 0.22);
        g.beginPath(); g.moveTo(px + 6, py + CELL - 1.5); g.lineTo(px + CELL - 6, py + CELL - 1.5); g.stroke();
        /* contact notches */
        g.fillStyle = rgba(theme.main, 0.3);
        [[5, 5], [CELL - 6, 5], [5, CELL - 6], [CELL - 6, CELL - 6]].forEach(function (n) { g.fillRect(px + n[0], py + n[1], 1.5, 1.5); });
        g.restore();
    }

    /* VU meter face: black dial, phosphor scale, red zone past 0 dB */
    var VU_CX = 92, VU_CY = BOT_Y + 108, VU_R = 78;
    var VU_A0 = -Math.PI * 0.86, VU_A1 = -Math.PI * 0.14;
    function vuAngle(t) { return VU_A0 + (VU_A1 - VU_A0) * t; }
    function drawVuFace(g) {
        g.save();
        g.beginPath(); g.rect(14, BOT_Y + 16, 156, BOT_H - 18); g.clip();
        g.strokeStyle = rgba(theme.main, 0.5); g.lineWidth = 1.5;
        g.beginPath(); g.arc(VU_CX, VU_CY, VU_R, VU_A0, vuAngle(0.72)); g.stroke();
        g.strokeStyle = '#ff4d4d'; g.lineWidth = 3;
        g.beginPath(); g.arc(VU_CX, VU_CY, VU_R, vuAngle(0.72), VU_A1); g.stroke();
        var marks = [['-20', 0], ['-10', 0.2], ['-7', 0.32], ['-5', 0.42], ['-3', 0.54], ['0', 0.72], ['+3', 1]];
        g.font = '6px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        marks.forEach(function (m) {
            var a = vuAngle(m[1]);
            g.strokeStyle = m[1] >= 0.72 ? '#ff6b6b' : theme.main; g.lineWidth = 1;
            g.beginPath(); g.moveTo(VU_CX + Math.cos(a) * (VU_R - 6), VU_CY + Math.sin(a) * (VU_R - 6)); g.lineTo(VU_CX + Math.cos(a) * (VU_R + 1), VU_CY + Math.sin(a) * (VU_R + 1)); g.stroke();
            g.fillStyle = m[1] >= 0.72 ? '#ff6b6b' : theme.mid;
            g.fillText(m[0], VU_CX + Math.cos(a) * (VU_R - 14), VU_CY + Math.sin(a) * (VU_R - 14));
        });
        for (var i = 0; i <= 20; i++) {
            var a2 = vuAngle(i / 20);
            g.strokeStyle = rgba(theme.main, 0.35); g.lineWidth = 1;
            g.beginPath(); g.moveTo(VU_CX + Math.cos(a2) * (VU_R - 3), VU_CY + Math.sin(a2) * (VU_R - 3)); g.lineTo(VU_CX + Math.cos(a2) * (VU_R + 1), VU_CY + Math.sin(a2) * (VU_R + 1)); g.stroke();
        }
        g.fillStyle = theme.mid; g.font = 'bold 9px ' + FONT_DISPLAY;
        g.fillText('VU', VU_CX, VU_CY - 34);
        g.font = '6px ' + FONT; g.fillText('dB', VU_CX, VU_CY - 24);
        g.restore();
    }

    function bakeOverlay() {
        overlayCanvas = makeCanvas(W * DPR, H * DPR);
        var g = overlayCanvas.getContext('2d');
        g.scale(DPR, DPR);
        g.save();
        roundRect(g, 7, 7, W - 14, H - 14, 18); g.clip();
        /* scanlines */
        g.fillStyle = 'rgba(0,0,0,0.22)';
        for (var y = 7; y < H; y += 3) g.fillRect(7, y, W - 14, 1);
        /* vignette */
        var v = g.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.72);
        v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.5)');
        g.fillStyle = v; g.fillRect(0, 0, W, H);
        /* glass curvature: a soft highlight at the top left and a thin reflection at the top */
        var hl = g.createRadialGradient(W * 0.22, H * 0.1, 10, W * 0.22, H * 0.1, W * 0.7);
        hl.addColorStop(0, 'rgba(255,255,255,0.07)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.015)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = hl; g.fillRect(0, 0, W, H);
        g.restore();
        /* glass edge */
        g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 2;
        roundRect(g, 8, 8, W - 16, H - 16, 17); g.stroke();
    }

    /* ---- tile sprites ---- */
    function seededRandom(seed) {
        var s = seed % 2147483647; if (s <= 0) s += 2147483646;
        return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
    }

    function bakeTile(value) {
        var d = tileDef(value);
        var c = makeCanvas(BAKE, BAKE), g = c.getContext('2d');
        var s = BAKE / CELL, R = 10 * s;
        var grad = g.createLinearGradient(0, 0, BAKE, BAKE);
        grad.addColorStop(0, d.col2); grad.addColorStop(1, d.col);
        roundRect(g, 0, 0, BAKE, BAKE, R);
        g.fillStyle = grad; g.fill();
        /* printed circuit texture */
        g.save(); roundRect(g, 0, 0, BAKE, BAKE, R); g.clip();
        var rnd = seededRandom(value * 7919 + 13);
        g.strokeStyle = rgba(d.text, 0.13); g.lineWidth = 1.2 * s; g.lineCap = 'round';
        for (var i = 0; i < 9; i++) {
            var x0 = rnd() * BAKE, y0 = BAKE * 0.35 + rnd() * BAKE * 0.4, len = 14 * s + rnd() * 30 * s;
            var horiz = rnd() < 0.5;
            g.beginPath(); g.moveTo(x0, y0);
            if (horiz) { g.lineTo(x0 + len, y0); g.lineTo(x0 + len, y0 + (rnd() < 0.5 ? -8 : 8) * s); }
            else { g.lineTo(x0, y0 + len); g.lineTo(x0 + (rnd() < 0.5 ? -8 : 8) * s, y0 + len); }
            g.stroke();
            g.fillStyle = rgba(d.text, 0.2);
            g.beginPath(); g.arc(x0, y0, 1.6 * s, 0, TAU); g.fill();
        }
        g.restore();
        /* bevel */
        g.lineWidth = 1.5 * s;
        g.strokeStyle = 'rgba(255,255,255,0.28)';
        g.beginPath(); g.moveTo(R, 1.2 * s); g.lineTo(BAKE - R, 1.2 * s); g.stroke();
        g.beginPath(); g.moveTo(1.2 * s, R); g.lineTo(1.2 * s, BAKE - R); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.38)';
        g.beginPath(); g.moveTo(R, BAKE - 1.2 * s); g.lineTo(BAKE - R, BAKE - 1.2 * s); g.stroke();
        g.beginPath(); g.moveTo(BAKE - 1.2 * s, R); g.lineTo(BAKE - 1.2 * s, BAKE - R); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1 * s;
        roundRect(g, 0.5 * s, 0.5 * s, BAKE - s, BAKE - s, R); g.stroke();
        /* label strip */
        g.fillStyle = 'rgba(0,0,0,0.32)';
        g.fillRect(0, BAKE - 15 * s, BAKE, 15 * s);
        g.fillStyle = d.text; g.font = 'bold ' + (6.4 * s) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(d.name, BAKE / 2, BAKE - 7.5 * s);
        /* value */
        var txt = '' + value;
        var fs = txt.length <= 2 ? 26 : (txt.length === 3 ? 22 : 17);
        g.font = 'bold ' + (fs * s) + 'px ' + FONT_DISPLAY;
        g.fillStyle = d.text;
        g.shadowColor = value >= 2048 ? '#ffffff' : 'rgba(0,0,0,0.35)'; g.shadowBlur = 4 * s;
        g.fillText(txt, BAKE / 2, BAKE * 0.47);
        g.shadowBlur = 0;
        /* icon, top left */
        g.save();
        g.translate(7 * s, 6 * s);
        g.scale(s, s);
        g.strokeStyle = d.text; g.fillStyle = d.text; g.lineWidth = 1.2; g.lineCap = 'round'; g.lineJoin = 'round';
        g.globalAlpha = 0.9;
        drawIcon(g, d.icon);
        g.restore();
        return c;
    }

    /* icons are drawn in a 22 x 14 box */
    function drawIcon(g, kind) {
        switch (kind) {
            case 'saw':
                g.beginPath(); g.moveTo(0, 11); g.lineTo(5, 3); g.lineTo(5, 11); g.lineTo(10, 3); g.lineTo(10, 11); g.lineTo(15, 3); g.lineTo(15, 11); g.lineTo(20, 3); g.stroke();
                break;
            case 'led':
                g.beginPath(); g.arc(7, 7, 4.5, 0, TAU); g.stroke();
                g.beginPath(); g.moveTo(4, 11.5); g.lineTo(4, 14); g.moveTo(10, 11.5); g.lineTo(10, 14); g.stroke();
                g.globalAlpha = 0.35; g.beginPath(); g.arc(7, 7, 2.6, 0, TAU); g.fill(); g.globalAlpha = 0.9;
                g.beginPath(); g.moveTo(13, 7); g.lineTo(21, 7); g.moveTo(17, 3); g.lineTo(17, 11); g.stroke();
                break;
            case 'jacks':
                [0, 11].forEach(function (ox) {
                    g.beginPath(); g.rect(ox + 1, 6, 7, 6); g.stroke();
                    g.fillRect(ox + 3.5, 1, 2, 5);
                    g.beginPath(); g.arc(ox + 4.5, 9, 1.3, 0, TAU); g.fill();
                });
                break;
            case 'meter':
                g.beginPath(); g.arc(10, 12, 9, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
                for (var i = 0; i <= 4; i++) { var a = Math.PI * (1.08 + 0.84 * i / 4); g.beginPath(); g.moveTo(10 + Math.cos(a) * 7, 12 + Math.sin(a) * 7); g.lineTo(10 + Math.cos(a) * 9, 12 + Math.sin(a) * 9); g.stroke(); }
                g.beginPath(); g.moveTo(10, 12); g.lineTo(14.5, 4.5); g.stroke();
                g.beginPath(); g.arc(10, 12, 1.4, 0, TAU); g.fill();
                break;
            case 'pcb':
                g.beginPath(); g.moveTo(1, 2); g.lineTo(8, 2); g.lineTo(8, 8); g.lineTo(14, 8); g.lineTo(14, 13); g.stroke();
                g.beginPath(); g.moveTo(1, 12); g.lineTo(5, 12); g.lineTo(5, 6); g.lineTo(11, 6); g.lineTo(11, 1); g.lineTo(20, 1); g.stroke();
                g.beginPath(); g.moveTo(17, 5); g.lineTo(17, 12); g.lineTo(21, 12); g.stroke();
                [[1, 2], [1, 12], [14, 13], [20, 1], [17, 5], [21, 12]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 1.4, 0, TAU); g.fill(); });
                break;
            case 'hv':
                g.beginPath(); g.moveTo(10, 0.5); g.lineTo(19.5, 13.5); g.lineTo(0.5, 13.5); g.closePath(); g.stroke();
                g.beginPath(); g.moveTo(11, 3.5); g.lineTo(8, 8); g.lineTo(10.5, 8); g.lineTo(8.5, 12.5); g.lineTo(13, 7); g.lineTo(10.5, 7); g.lineTo(12.5, 3.5); g.closePath(); g.fill();
                break;
            case 'port':
                g.beginPath(); g.rect(1, 1, 9, 12); g.stroke();
                g.beginPath(); g.moveTo(10, 1); g.lineTo(15, 3.5); g.lineTo(15, 14.5); g.lineTo(10, 13); g.closePath(); g.stroke();
                g.beginPath(); g.moveTo(16, 7); g.lineTo(21.5, 7); g.moveTo(19, 4.5); g.lineTo(21.5, 7); g.lineTo(19, 9.5); g.stroke();
                g.beginPath(); g.arc(13, 8, 0.9, 0, TAU); g.fill();
                break;
            case 'jam':
                g.beginPath(); g.moveTo(0, 7); g.quadraticCurveTo(2.5, 0, 5, 7); g.quadraticCurveTo(7.5, 14, 10, 7); g.stroke();
                g.beginPath(); g.moveTo(10, 7); g.lineTo(11.5, 1); g.lineTo(12.5, 13); g.lineTo(13.5, 3); g.lineTo(14.5, 11); g.lineTo(15.5, 5); g.lineTo(16.5, 9); g.lineTo(18, 7); g.lineTo(22, 7); g.stroke();
                g.beginPath(); g.moveTo(3, 1); g.lineTo(21, 13); g.stroke();
                break;
            case 'tube':
                roundRect(g, 6, 0.5, 10, 11, 4); g.stroke();
                g.beginPath(); g.moveTo(6, 11.5); g.lineTo(16, 11.5); g.stroke();
                [8, 11, 14].forEach(function (x) { g.beginPath(); g.moveTo(x, 11.5); g.lineTo(x, 14); g.stroke(); });
                g.beginPath(); g.moveTo(9, 9); g.lineTo(9.5, 4); g.lineTo(11, 7); g.lineTo(12.5, 4); g.lineTo(13, 9); g.stroke();
                g.globalAlpha = 0.3; g.beginPath(); g.arc(11, 6, 3.5, 0, TAU); g.fill(); g.globalAlpha = 0.9;
                break;
            case 'radar':
                g.beginPath(); g.arc(8, 7, 6.5, 0, TAU); g.stroke();
                g.beginPath(); g.arc(8, 7, 3.5, 0, TAU); g.stroke();
                g.beginPath(); g.moveTo(1.5, 7); g.lineTo(14.5, 7); g.moveTo(8, 0.5); g.lineTo(8, 13.5); g.stroke();
                g.beginPath(); g.moveTo(16, 11); g.lineTo(21, 11); g.moveTo(16, 8); g.lineTo(21, 8); g.moveTo(16, 5); g.lineTo(19, 5); g.stroke();
                break;
            case 'bolt':
            default:
                g.beginPath(); g.moveTo(9, 0); g.lineTo(3, 8); g.lineTo(8, 8); g.lineTo(5, 14); g.lineTo(13, 5); g.lineTo(8.5, 5); g.lineTo(11, 0); g.closePath(); g.fill();
                g.beginPath(); g.moveTo(15, 2); g.lineTo(13, 6); g.lineTo(16, 6); g.lineTo(14, 10); g.stroke();
                g.beginPath(); g.moveTo(19, 5); g.lineTo(17.5, 8); g.lineTo(20, 8); g.lineTo(18.5, 11); g.stroke();
                break;
        }
    }

    function bakeCorrupt() {
        var c = makeCanvas(BAKE, BAKE), g = c.getContext('2d');
        var s = BAKE / CELL, R = 10 * s;
        var grad = g.createLinearGradient(0, 0, BAKE, BAKE);
        grad.addColorStop(0, CORRUPT.col2); grad.addColorStop(1, CORRUPT.col);
        roundRect(g, 0, 0, BAKE, BAKE, R); g.fillStyle = grad; g.fill();
        g.save(); roundRect(g, 0, 0, BAKE, BAKE, R); g.clip();
        /* rogue code */
        var rnd = seededRandom(66);
        g.fillStyle = 'rgba(255,120,130,0.28)'; g.font = (5.5 * s) + 'px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top';
        var hex = '0123456789ABCDEF';
        for (var row = 0; row < 7; row++) {
            var line = '';
            for (var k = 0; k < 11; k++) line += hex[Math.floor(rnd() * 16)];
            g.fillText(line, 3 * s + (row % 2) * 3 * s, 3 * s + row * 8.6 * s);
        }
        g.restore();
        g.strokeStyle = 'rgba(255,77,109,0.9)'; g.lineWidth = 1.5 * s;
        roundRect(g, 1 * s, 1 * s, BAKE - 2 * s, BAKE - 2 * s, R); g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, BAKE - 15 * s, BAKE, 15 * s);
        g.fillStyle = '#ffd6d9'; g.font = 'bold ' + (6.4 * s) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('CORRUPTED NODE', BAKE / 2, BAKE - 7.5 * s);
        /* AI eye */
        g.strokeStyle = '#ff8a9a'; g.lineWidth = 1.4 * s;
        g.beginPath(); g.ellipse(BAKE * 0.26, BAKE * 0.2, 8 * s, 4.5 * s, 0, 0, TAU); g.stroke();
        g.fillStyle = '#ff2a44'; g.beginPath(); g.arc(BAKE * 0.26, BAKE * 0.2, 2.6 * s, 0, TAU); g.fill();
        return c;
    }

    /* the special blocks of the Android app (Sprites.kt), drawn in a 72 px cell */
    function bakeSpecial(kind) {
        var c = makeCanvas(BAKE, BAKE), g = c.getContext('2d');
        var s = BAKE / CELL, R = 10;
        var look = LOOKS[kind];
        g.scale(s, s);
        var grad = g.createLinearGradient(0, 0, CELL, CELL);
        grad.addColorStop(0, look.col2); grad.addColorStop(1, look.col);
        roundRect(g, 0, 0, CELL, CELL, R); g.fillStyle = grad; g.fill();
        g.save(); roundRect(g, 0, 0, CELL, CELL, R); g.clip();
        g.lineCap = 'round'; g.lineJoin = 'round';
        var rnd = seededRandom(['SIGNAL', 'NODE', 'BEACON', 'WORM', 'CASED', 'PATCH', 'CAPACITOR', 'WALL'].indexOf(kind) * 977 + 31);
        var i, x;
        if (kind === 'CAPACITOR') {
            /* warning stripes along the top */
            g.fillStyle = 'rgba(127,216,255,0.18)';
            for (x = -20; x < CELL; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 8, 0); g.lineTo(x + 2, 6); g.lineTo(x - 6, 6); g.closePath(); g.fill(); }
        } else if (kind === 'BEACON') {
            /* radio rings */
            g.strokeStyle = 'rgba(255,160,110,0.18)'; g.lineWidth = 1.2;
            for (i = 1; i <= 4; i++) { g.beginPath(); g.arc(CELL * 0.26, CELL * 0.2, i * 9, 0, TAU); g.stroke(); }
        } else if (kind === 'WORM') {
            g.fillStyle = 'rgba(255,120,220,0.24)'; g.font = '5.5px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top';
            for (var row = 0; row < 7; row++) {
                var line = '';
                for (var k = 0; k < 11; k++) line += rnd() < 0.5 ? '0' : '1';
                g.fillText(line, 3 + (row % 2) * 3, 3 + row * 8.6);
            }
        } else if (kind === 'PATCH') {
            /* the cable, from jack to jack */
            g.strokeStyle = '#ffb347'; g.lineWidth = 3.2;
            g.beginPath(); g.moveTo(12, 47); g.bezierCurveTo(12, 38, 60, 38, 60, 47); g.stroke();
            g.fillStyle = '#9aa4ae';
            [12, 60].forEach(function (jx) { g.fillRect(jx - 3.5, 46, 7, 7); g.fillRect(jx - 1.5, 53, 3, 4); });
        } else if (kind === 'WALL') {
            /* static */
            for (i = 0; i < 260; i++) {
                var v = Math.floor(40 + rnd() * 120);
                g.fillStyle = 'rgba(' + v + ',' + (v + 8) + ',' + (v + 14) + ',' + ((60 + rnd() * 120) / 255).toFixed(3) + ')';
                g.fillRect(Math.floor(rnd() * 36) * 2, Math.floor(rnd() * 28) * 2, 2, 2);
            }
            g.fillStyle = 'rgba(255,255,255,0.16)';
            for (var y = 0; y < 7; y++) g.fillRect(0, 4 + y * 8, CELL, 1);
        }
        g.restore();
        g.strokeStyle = look.edge; g.lineWidth = 1.5;
        roundRect(g, 1, 1, CELL - 2, CELL - 2, R); g.stroke();
        g.fillStyle = 'rgba(0,0,0,0.42)'; g.fillRect(0, CELL - 15, CELL, 15);
        g.fillStyle = look.text; g.font = 'bold 6.4px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(look.name, CELL / 2, CELL - 7.5);
        /* the glyph, top left */
        g.save();
        g.translate(7, 6);
        g.strokeStyle = look.text; g.fillStyle = look.text; g.lineWidth = 1.2;
        if (kind === 'CAPACITOR') {
            g.beginPath(); g.moveTo(0, 7); g.lineTo(8, 7); g.moveTo(8, 1); g.lineTo(8, 13); g.stroke();
            g.beginPath(); g.ellipse(15, 7, 4, 6, 0, Math.PI * 2 / 3, Math.PI * 4 / 3); g.stroke();
            g.beginPath(); g.moveTo(12.5, 7); g.lineTo(21, 7); g.stroke();
        } else if (kind === 'BEACON') {
            g.beginPath(); g.moveTo(4, 14); g.lineTo(8, 2); g.lineTo(12, 14); g.moveTo(5.3, 10); g.lineTo(10.7, 10); g.stroke();
            g.beginPath(); g.arc(8, 2, 1.6, 0, TAU); g.fill();
            g.beginPath(); g.arc(16, 2, 4, -Math.PI / 3, Math.PI / 3); g.stroke();
            g.beginPath(); g.arc(17, 2, 7, -Math.PI * 5 / 18, Math.PI * 5 / 18); g.stroke();
        } else if (kind === 'WORM') {
            for (i = 0; i < 5; i++) { g.beginPath(); g.arc(2.5 + i * 4.2, 7 + Math.sin(i * 1.3) * 3, i === 4 ? 2.4 : 1.8, 0, TAU); g.fill(); }
        } else if (kind === 'PATCH') {
            g.strokeRect(1, 4, 5, 8); g.strokeRect(15, 4, 5, 8);
            g.beginPath(); g.moveTo(3.5, 4); g.bezierCurveTo(3.5, -2, 17.5, -2, 17.5, 4); g.stroke();
        } else if (kind === 'WALL') {
            for (var rw = 0; rw < 3; rw++) {
                for (x = rw % 2 === 0 ? 0 : 3.5; x < 20; x += 7) g.strokeRect(x, rw * 4.6, Math.min(x + 6, 21) - x, 3.6);
            }
        }
        g.restore();
        return c;
    }

    /* the lead case that goes over a Cased Signal's tile; cracked after the first hit */
    function bakeCase(cracked) {
        var c = makeCanvas(BAKE, BAKE), g = c.getContext('2d');
        var s = BAKE / CELL, R = 10;
        g.scale(s, s);
        var grad = g.createLinearGradient(0, 0, CELL, CELL);
        grad.addColorStop(0, '#9aa4ae'); grad.addColorStop(1, '#3a4249');
        g.beginPath();
        roundRect(g, 0, 0, CELL, CELL, R);
        /* the window over the signal, cut out with the even-odd rule */
        g.moveTo(12, 8); g.lineTo(CELL - 12, 8); g.arcTo(CELL - 8, 8, CELL - 8, 12, 4); g.lineTo(CELL - 8, CELL - 20);
        g.arcTo(CELL - 8, CELL - 16, CELL - 12, CELL - 16, 4); g.lineTo(12, CELL - 16); g.arcTo(8, CELL - 16, 8, CELL - 20, 4);
        g.lineTo(8, 12); g.arcTo(8, 8, 12, 8, 4); g.closePath();
        g.fillStyle = grad; g.fill('evenodd');
        /* the label strip of the case */
        g.save(); roundRect(g, 0, 0, CELL, CELL, R); g.clip();
        g.fillStyle = '#2a3036'; g.fillRect(0, CELL - 16, CELL, 16);
        g.restore();
        g.fillStyle = '#d8dee4'; g.font = 'bold 6.4px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(cracked ? 'CASE CRACKED' : 'CASED SIGNAL', CELL / 2, CELL - 7.5);
        /* rivets */
        g.fillStyle = '#c8d0d6';
        [[4, 4], [CELL - 4, 4], [4, CELL - 20], [CELL - 4, CELL - 20]].forEach(function (p) { g.beginPath(); g.arc(p[0], p[1], 1.8, 0, TAU); g.fill(); });
        g.strokeStyle = '#1c2126'; g.lineWidth = 1.5;
        roundRect(g, 8, 8, CELL - 16, CELL - 24, 4); g.stroke();
        g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 1;
        roundRect(g, 0.5, 0.5, CELL - 1, CELL - 1, R); g.stroke();
        if (cracked) {
            g.lineJoin = 'round';
            g.strokeStyle = '#0a0c0e'; g.lineWidth = 1.6;
            g.beginPath(); g.moveTo(0, 22); g.lineTo(5, 25); g.lineTo(3, 30); g.lineTo(8, 33); g.stroke();
            g.beginPath(); g.moveTo(CELL, 14); g.lineTo(CELL - 4, 18); g.lineTo(CELL - 2, 23); g.lineTo(CELL - 8, 26); g.stroke();
            g.beginPath(); g.moveTo(30, 0); g.lineTo(33, 4); g.lineTo(29, 8); g.stroke();
            g.strokeStyle = 'rgba(255,255,255,0.47)'; g.lineWidth = 0.8;
            g.beginPath(); g.moveTo(1, 23); g.lineTo(6, 26); g.lineTo(4, 31); g.stroke();
        }
        return c;
    }

    function glowSprite(col) {
        if (glowCache[col]) return glowCache[col];
        var S = 64, c = makeCanvas(S, S), g = c.getContext('2d');
        var grad = g.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S / 2);
        grad.addColorStop(0, rgba(col, 0.55)); grad.addColorStop(0.5, rgba(col, 0.18)); grad.addColorStop(1, rgba(col, 0));
        g.fillStyle = grad; g.fillRect(0, 0, S, S);
        glowCache[col] = c;
        return c;
    }

    function bakeAll() {
        bakeBackground();
        bakeOverlay();
        sprites = {};
        for (var v in TILES) if (TILES.hasOwnProperty(v)) sprites[v] = bakeTile(parseInt(v, 10));
        corruptSprite = bakeCorrupt();
        specialSprites = {};
        Object.keys(LOOKS).forEach(function (k) { specialSprites[k] = bakeSpecial(k); });
        caseSprites = [bakeCase(false), bakeCase(true)];
        renderManual();
    }
    function spriteFor(value) {
        if (!sprites[value]) sprites[value] = bakeTile(value);
        return sprites[value];
    }

    /* ---------------------------------------------------------
       Per-frame rendering
       --------------------------------------------------------- */
    function text(str, x, y, color, size, display, align, glow) {
        ctx.font = (display ? 'bold ' : '') + size + 'px ' + (display ? FONT_DISPLAY : FONT);
        ctx.textAlign = align || 'left';
        ctx.textBaseline = 'alphabetic';
        if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
        ctx.fillStyle = color;
        ctx.fillText(str, x, y);
        if (glow) ctx.shadowBlur = 0;
    }
    function centerText(str, y, color, size, display, glow) { text(str, W / 2, y, color, size, display, 'center', glow); }
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

    function drawHud() {
        var sc = pad(Math.min(score, 999999), 6) + ' Hz';
        text(sc, 12, 62, theme.bright, 17, true, 'left', 6);
        text(pad(Math.max(progress.best, score), 6), 152, 62, theme.main, 15, true);
        text(pad(moves, 4), 240, 62, theme.main, 15, true);
        text(fmtTime(elapsed), 322, 62, theme.main, 15, true);
        if (state !== 'attract' && maxTile >= 2) {
            var d = tileDef(maxTile);
            ctx.textBaseline = 'middle';
            text('MAX SIGNAL ' + pad(maxTile, 4) + '  ' + d.name, W - 38, 15.5, d.col2, 7, false, 'right');
            ctx.textBaseline = 'alphabetic';
        } else {
            ctx.textBaseline = 'middle';
            text('2048 OVERRIDE', W - 38, 15.5, theme.mid, 7, false, 'right');
            ctx.textBaseline = 'alphabetic';
        }

        /* trace bar */
        var pct = Math.round(trace);
        var warn = trace >= 80;
        var col = warn ? (frameT % 30 < 15 ? '#ff4d6d' : '#ffb000') : (trace >= 50 ? '#ffb000' : theme.main);
        text(pad(pct, 3) + '%', 12, 95, col, 10, true);
        var segs = 31, sw = 9, lit = Math.round(trace / 100 * segs);
        for (var i = 0; i < segs; i++) {
            var t = i / (segs - 1);
            var c = t < 0.5 ? theme.main : (t < 0.8 ? '#ffb000' : '#ff4d6d');
            ctx.fillStyle = i < lit ? c : rgba(c, 0.12);
            ctx.fillRect(79 + i * (sw + 1), 80, sw, 13);
        }
        if (warn && frameT % 30 < 15) { ctx.fillStyle = 'rgba(255,77,109,0.08)'; ctx.fillRect(76, 77, 312, 19); }
        if (nodePulse > 0 && nodeTrace > 0) {
            /* the red blocks' share of this move, in red over the bar */
            ctx.globalAlpha = nodePulse;
            ctx.fillStyle = 'rgba(2,6,4,0.85)'; roundRect(ctx, 296, 79, 90, 15, 2); ctx.fill();
            text('RED NODES +' + nodeTrace + '%', 382, 90, '#ff4d6d', 7.5, false, 'right');
            ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 1.5;
            roundRect(ctx, 76.5, 77.5, 311, 18, 3); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (mode === 'tutorial' && (tut.step === 'TRACE' || tut.step === 'COOL' || tut.step === 'LOCK')) {
            /* a slow amber pulse around the whole trace row */
            ctx.strokeStyle = rgba('#ffb000', 0.45 + 0.45 * Math.sin(frameT * 0.12)); ctx.lineWidth = 2;
            roundRect(ctx, 8, 73, 384, 27, 5); ctx.stroke();
        }
    }

    function drawLadder() {
        var n = 20, segH = (GW - 4 - (n - 1) * 2) / n;
        var litN = Math.round(vu.needle * n);
        for (var i = 0; i < n; i++) {
            var idx = n - 1 - i;                           /* 0 at the bottom */
            var y = GY + 2 + i * (segH + 2);
            var c = idx < 12 ? '#39ff6a' : (idx < 17 ? '#ffb000' : '#ff4d4d');
            var on = idx < litN || (idx === vu.peak && vu.peakHold > 0);
            ctx.fillStyle = on ? c : rgba(c, 0.12);
            ctx.fillRect(LX + 4, y, LW - 8, segH);
            if (on && idx >= litN - 1) { ctx.globalAlpha = 0.5; ctx.drawImage(glowSprite(c), LX - 6, y - 10, LW + 12, segH + 20); ctx.globalAlpha = 1; }
        }
    }

    function drawVu() {
        ctx.save();
        ctx.beginPath(); ctx.rect(14, BOT_Y + 16, 156, BOT_H - 18); ctx.clip();
        var a = vuAngle(Math.max(0, Math.min(1, vu.needle)));
        ctx.strokeStyle = theme.bright; ctx.lineWidth = 1.6;
        ctx.shadowColor = theme.main; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(VU_CX, VU_CY); ctx.lineTo(VU_CX + Math.cos(a) * (VU_R + 2), VU_CY + Math.sin(a) * (VU_R + 2)); ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ff4d4d'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(VU_CX + Math.cos(a) * (VU_R - 10), VU_CY + Math.sin(a) * (VU_R - 10)); ctx.lineTo(VU_CX + Math.cos(a) * (VU_R + 2), VU_CY + Math.sin(a) * (VU_R + 2)); ctx.stroke();
        ctx.fillStyle = '#1c2026'; ctx.beginPath(); ctx.arc(VU_CX, VU_CY, 7, 0, TAU); ctx.fill();
        ctx.strokeStyle = theme.dim; ctx.lineWidth = 1; ctx.stroke();
        ctx.restore();
        /* peak LED */
        var hot = vu.needle > 0.72;
        ctx.fillStyle = hot ? '#ff4d4d' : 'rgba(255,77,77,0.18)';
        ctx.beginPath(); ctx.arc(160, BOT_Y + 11, 2.6, 0, TAU); ctx.fill();
        if (hot) { ctx.globalAlpha = 0.7; ctx.drawImage(glowSprite('#ff4d4d'), 150, BOT_Y + 1, 20, 20); ctx.globalAlpha = 1; }
    }

    function drawLog() {
        var y0 = BOT_Y + 28, lh = 18;
        var start = Math.max(0, log.length - 5);
        ctx.font = '8px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        for (var i = start; i < log.length; i++) {
            var l = log[i], row = i - start, age = log.length - 1 - i;
            var col = l.kind === 'warn' ? '#ff6b7a' : (l.kind === 'ok' ? theme.bright : theme.main);
            ctx.globalAlpha = Math.max(0.35, 1 - age * 0.16);
            var fresh = frameT - l.t < 18;
            var s = fresh ? l.text.slice(0, Math.floor((frameT - l.t) / 18 * l.text.length)) : l.text;
            ctx.fillStyle = col;
            ctx.fillText('> ' + s, 188, y0 + row * lh);
        }
        ctx.globalAlpha = 1;
        if (frameT % 40 < 24) {
            var lastRow = Math.max(0, log.length - start - 1);
            var lastText = log.length ? log[log.length - 1].text : '';
            var w = ctx.measureText('> ' + lastText).width;
            ctx.fillStyle = theme.main;
            ctx.fillRect(188 + Math.min(w + 3, 190), y0 + lastRow * lh - 7, 5, 8);
        }
    }

    function drawLocks() {
        locks.forEach(function (l) { drawLockAt(cellX(l.x), cellY(l.y), l.turns); });
    }
    function drawLockAt(px, py, turns) {
        var blink = frameT % 40 < 28;
        ctx.save();
        roundRect(ctx, px, py, CELL, CELL, 7); ctx.clip();
        ctx.fillStyle = blink ? 'rgba(255,40,70,0.22)' : 'rgba(255,40,70,0.12)';
        ctx.fillRect(px, py, CELL, CELL);
        /* hazard stripes */
        ctx.strokeStyle = 'rgba(255,77,109,0.35)'; ctx.lineWidth = 3;
        for (var k = -CELL; k < CELL * 2; k += 14) { ctx.beginPath(); ctx.moveTo(px + k, py + CELL); ctx.lineTo(px + k + CELL, py); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2;
        roundRect(ctx, px + 1, py + 1, CELL - 2, CELL - 2, 7); ctx.stroke();
        /* padlock */
        var cx = px + CELL / 2, cy = py + CELL / 2 + 2;
        ctx.fillStyle = '#ff4d6d';
        roundRect(ctx, cx - 11, cy - 4, 22, 17, 3); ctx.fill();
        ctx.strokeStyle = '#ff8a9a'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(cx, cy - 6, 7, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.arc(cx, cy + 3, 2.6, 0, TAU); ctx.fill(); ctx.fillRect(cx - 1.2, cy + 3, 2.4, 5);
        text('NEXUS-9 LOCK ' + turns, cx, py + CELL - 7, '#ffd6d9', 7, false, 'center');
    }

    /* a pin lock sits on top of the signal it holds, so the value stays readable */
    function drawPins() {
        locks.forEach(function (l) { if (tileAt(l.x, l.y)) drawPinAt(cellX(l.x), cellY(l.y), l.turns); });
    }
    function drawPinAt(px, py, turns) {
        var blink = frameT % 40 < 28;
        ctx.fillStyle = blink ? 'rgba(255,40,70,0.27)' : 'rgba(255,40,70,0.16)';
        roundRect(ctx, px, py, CELL, CELL, 7); ctx.fill();
        ctx.strokeStyle = '#ff4d6d'; ctx.lineWidth = 2.5;
        roundRect(ctx, px + 1, py + 1, CELL - 2, CELL - 2, 7); ctx.stroke();
        /* the pin: a small padlock badge, top right */
        var bx = px + CELL - 13, by = py + 13;
        ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.arc(bx, by, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff4d6d'; roundRect(ctx, bx - 5.5, by - 1.5, 11, 7.5, 1.5); ctx.fill();
        ctx.strokeStyle = '#ff8a9a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(bx, by - 3, 3.5, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#2a0008'; ctx.fillRect(px + 4, py + CELL - 16, CELL - 8, 12);
        text('PINNED ' + turns, px + CELL / 2, py + CELL - 7, '#ffd6d9', 7.5, false, 'center');
    }

    /* capacitors, cables, walls, cased signals, beacons and worms: the artwork plus their live numbers */
    function drawSpecial(t, px, py, size, scale, alpha) {
        var k = scale, look = LOOKS[t.kind];
        var urgent = (t.kind === 'CAPACITOR' && t.counter <= 2) || (t.kind === 'BEACON' && t.counter <= 3) || (t.kind === 'WORM' && t.counter <= 2);
        var flashOn = urgent && frameT % 20 < 10;
        if (look && (isHostile(t) || t.kind === 'CAPACITOR')) {
            ctx.globalAlpha = alpha * (urgent ? (flashOn ? 1 : 0.4) : 0.7 + 0.3 * Math.sin(frameT * 0.2 + t.id));
            ctx.drawImage(glowSprite(look.edge), px - 12, py - 12, size + 24, size + 24);
        }
        ctx.globalAlpha = alpha;
        if (t.kind === 'CASED') {
            ctx.drawImage(spriteFor(t.value), px, py, size, size);
            ctx.drawImage(caseSprites[t.counter <= 1 ? 1 : 0], px, py, size, size);
        } else ctx.drawImage(specialSprites[t.kind], px, py, size, size);
        if (isHostile(t) && nodePulse > 0) drawNodePulse(px, py, size, look.edge);
        if (t.kind === 'CAPACITOR') {
            /* a charge ring that empties towards the discharge */
            var col = flashOn ? '#ff4d6d' : look.text, cx = px + size / 2, cy = py + size * 0.47, rr = 17 * k;
            ctx.strokeStyle = rgba(look.edge, 0.25 * alpha); ctx.lineWidth = 3 * k;
            ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.stroke();
            ctx.strokeStyle = col;
            ctx.beginPath(); ctx.arc(cx, cy, rr, -Math.PI / 2, -Math.PI / 2 + TAU * t.counter / CAPACITOR_FUSE); ctx.stroke();
            text('' + t.counter, cx, cy + 8 * k, col, 22 * k, true, 'center', 6);
        } else if (t.kind === 'PATCH') {
            text('x2', px + size / 2, py + size * 0.46 + 8 * k, '#ffd27a', 22 * k, true, 'center', 6);
        } else if (t.kind === 'WALL') {
            /* one bar per layer left */
            for (var i = 0; i < WALL_STRENGTH; i++) {
                ctx.fillStyle = i < t.counter ? look.text : 'rgba(216,222,228,0.24)';
                var bx = px + size / 2 + (i - 0.5) * 12 * k;
                ctx.fillRect(bx - 4.5 * k, py + size * 0.42, 9 * k, size * 0.16);
            }
        } else if (t.kind === 'BEACON' || t.kind === 'WORM') {
            text('' + t.value, px + size * 0.5, py + size * 0.62 + 8 * k, look.text, 24 * k, true, 'center', 6);
            /* the countdown, top right */
            var ox = px + size - 13 * k, oy = py + 13 * k;
            ctx.fillStyle = '#14060a'; ctx.beginPath(); ctx.arc(ox, oy, 9 * k, 0, TAU); ctx.fill();
            ctx.strokeStyle = flashOn ? '#ff4d6d' : look.edge; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.textBaseline = 'middle';
            text('' + t.counter, ox, oy + 0.5, flashOn ? '#ffffff' : look.text, 9 * k, false, 'center');
            ctx.textBaseline = 'alphabetic';
        }
        ctx.globalAlpha = 1;
    }
    /* a ring that swells out of a red block while it feeds the trace */
    function drawNodePulse(px, py, size, col) {
        var grow = (1 - nodePulse) * 14;
        ctx.strokeStyle = rgba(col, nodePulse); ctx.lineWidth = 3;
        roundRect(ctx, px - grow, py - grow, size + grow * 2, size + grow * 2, 10 + grow); ctx.stroke();
    }

    function drawTileAt(t, gx, gy, scale, alpha) {
        var size = CELL * scale;
        var px = GX + GAP + gx * (CELL + GAP) + (CELL - size) / 2;
        var py = GY + GAP + gy * (CELL + GAP) + (CELL - size) / 2;
        ctx.globalAlpha = alpha;
        if (t.kind !== 'SIGNAL' && t.kind !== 'NODE') { drawSpecial(t, px, py, size, scale, alpha); return; }
        if (t.kind === 'NODE') {
            var fl = 0.7 + 0.3 * Math.sin(frameT * 0.25);
            ctx.globalAlpha = alpha * fl;
            ctx.drawImage(glowSprite('#ff2a44'), px - 12, py - 12, size + 24, size + 24);
            ctx.globalAlpha = alpha;
            ctx.drawImage(corruptSprite, px, py, size, size);
            if (nodePulse > 0) drawNodePulse(px, py, size, '#ff2a44');
            ctx.globalAlpha = alpha;
            text('' + t.value, px + size * 0.62, py + size * 0.58, '#ffd6d9', 24 * scale, true, 'center', 6);
            if (frameT % 7 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(px, py + Math.random() * size, size, 2); }
            ctx.globalAlpha = 1;
            return;
        }
        var d = tileDef(t.value);
        if (t.value >= 64) {
            ctx.globalAlpha = alpha * (t.value >= 2048 ? 0.9 : 0.55);
            var gs = t.value >= 1024 ? 20 : 12;
            ctx.drawImage(glowSprite(d.col2), px - gs, py - gs, size + gs * 2, size + gs * 2);
            ctx.globalAlpha = alpha;
        }
        ctx.drawImage(spriteFor(t.value), px, py, size, size);
        /* animated details */
        var s = scale;
        if (t.value === 4) {
            var on = Math.floor(frameT / 24 + t.id) % 2 === 0;
            ctx.fillStyle = on ? '#d8ffe4' : 'rgba(216,255,228,0.25)';
            ctx.beginPath(); ctx.arc(px + 14 * s, py + 13 * s, 2.8 * s, 0, TAU); ctx.fill();
            if (on) { ctx.globalAlpha = alpha * 0.8; ctx.drawImage(glowSprite('#d8ffe4'), px + 4 * s, py + 3 * s, 20 * s, 20 * s); ctx.globalAlpha = alpha; }
        } else if (t.value === 16) {
            var na = Math.PI * (1.15 + 0.7 * (0.5 + 0.5 * Math.sin(frameT * 0.08 + t.id)));
            ctx.strokeStyle = '#fff3cc'; ctx.lineWidth = 1.2 * s;
            ctx.beginPath(); ctx.moveTo(px + 17 * s, py + 18 * s); ctx.lineTo(px + 17 * s + Math.cos(na) * 8 * s, py + 18 * s + Math.sin(na) * 8 * s); ctx.stroke();
        } else if (t.value === 512) {
            var fl2 = 0.5 + 0.5 * Math.sin(frameT * 0.3 + t.id * 2);
            ctx.globalAlpha = alpha * (0.3 + fl2 * 0.5);
            ctx.drawImage(glowSprite('#ffb86b'), px + 8 * s, py + 1 * s, 20 * s, 20 * s);
            ctx.globalAlpha = alpha;
        } else if (t.value === 1024) {
            var ra = (frameT * 0.07 + t.id) % TAU;
            ctx.save();
            ctx.translate(px + 15 * s, py + 13 * s);
            ctx.strokeStyle = '#e4ecff'; ctx.lineWidth = 1.3 * s;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ra) * 6.5 * s, Math.sin(ra) * 6.5 * s); ctx.stroke();
            ctx.fillStyle = 'rgba(228,236,255,0.35)';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 6.5 * s, ra - 0.9, ra); ctx.closePath(); ctx.fill();
            ctx.restore();
        } else if (t.value >= 2048) {
            if (frameT % 5 === 0 || t.pop > 0.3) {
                ctx.strokeStyle = t.value === 2048 ? '#ffffff' : d.col2; ctx.lineWidth = 1.5;
                ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 8;
                for (var b = 0; b < 3; b++) {
                    var bx = px + Math.random() * size, by = py + Math.random() * size;
                    ctx.beginPath(); ctx.moveTo(bx, by);
                    for (var k = 0; k < 4; k++) { bx += (Math.random() - 0.5) * 16; by += (Math.random() - 0.5) * 16; ctx.lineTo(bx, by); }
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            }
        }
        ctx.globalAlpha = 1;
    }

    function drawTiles() {
        var k = easeOut(Math.min(1, anim.t));
        /* ghosts slide into the merge and vanish when the slide ends */
        if (anim.t < 1) {
            ghosts.forEach(function (g) {
                var gx = g.px + (g.x - g.px) * k, gy = g.py + (g.y - g.py) * k;
                drawTileAt(g, gx, gy, 1, 1);
            });
            /* nodes an EMP fried stay until the slide lands, then the arc takes them */
            friedShown.forEach(function (f) { drawTileAt(f, f.px + (f.x - f.px) * k, f.py + (f.y - f.py) * k, 1, 1); });
        }
        eachTile(function (t) {
            if (t.mergedFrom && anim.t < 1) return;                 /* appears when the ghosts arrive */
            var gx = t.px + (t.x - t.px) * k, gy = t.py + (t.y - t.py) * k;
            var scale = 1, alpha = 1;
            if (t.appear > 0) { scale = 1 - easeOut(1 - (1 - t.appear)) * 0 + (1 - t.appear); alpha = 1 - t.appear * 0.4; scale = Math.max(0.2, 1 - t.appear); }
            if (t.pop > 0) scale = 1 + 0.22 * Math.sin(t.pop * Math.PI);
            drawTileAt(t, gx, gy, scale, alpha);
        });
    }

    function drawEffects() {
        ctx.save();
        roundRect(ctx, GX, GY, GW, GW, 8); ctx.clip();
        /* power surge across the grid */
        if (surge) {
            var p = surge.t / 14;
            var band = 46;
            var grad;
            if (surge.dir === 0 || surge.dir === 2) {
                var y = surge.dir === 0 ? GY + GW - p * (GW + band) : GY - band + p * (GW + band);
                grad = ctx.createLinearGradient(0, y, 0, y + band);
                grad.addColorStop(0, rgba(theme.main, 0)); grad.addColorStop(0.5, rgba(theme.main, 0.26 * (1 - p))); grad.addColorStop(1, rgba(theme.main, 0));
                ctx.fillStyle = grad; ctx.fillRect(GX, y, GW, band);
            } else {
                var x = surge.dir === 3 ? GX + GW - p * (GW + band) : GX - band + p * (GW + band);
                grad = ctx.createLinearGradient(x, 0, x + band, 0);
                grad.addColorStop(0, rgba(theme.main, 0)); grad.addColorStop(0.5, rgba(theme.main, 0.26 * (1 - p))); grad.addColorStop(1, rgba(theme.main, 0));
                ctx.fillStyle = grad; ctx.fillRect(x, GY, band, GW);
            }
        }
        /* frequency rings on merges */
        rings.forEach(function (r) {
            var a = r.life / 30;
            ctx.strokeStyle = rgba(r.col, a * 0.9); ctx.lineWidth = 2.5 * a + 0.5;
            ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, TAU); ctx.stroke();
            /* a little waveform riding the ring */
            ctx.strokeStyle = rgba('#ffffff', a * 0.6); ctx.lineWidth = 1;
            ctx.beginPath();
            for (var i = 0; i <= 40; i++) {
                var ang = i / 40 * TAU, rr = r.r + Math.sin(ang * 8 + frameT * 0.5) * 3 * a;
                var xx = r.x + Math.cos(ang) * rr, yy = r.y + Math.sin(ang) * rr;
                if (i === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
            }
            ctx.stroke();
        });
        /* sparks */
        particles.forEach(function (p) {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 20));
            ctx.fillStyle = p.col;
            ctx.fillRect(p.x - 1, p.y - 1, 2.4, 2.4);
        });
        ctx.globalAlpha = 1;
        if (flash > 0.02) { ctx.fillStyle = 'rgba(255,255,255,' + (flash * 0.18) + ')'; ctx.fillRect(GX, GY, GW, GW); }
        if (rewind > 0) {
            /* the tape rewinds: a band of light runs up the matrix */
            var ry = GY + GW - (1 - rewind) * (GW + 40);
            var rg = ctx.createLinearGradient(0, ry, 0, ry + 40);
            rg.addColorStop(0, rgba(theme.main, 0)); rg.addColorStop(0.5, rgba(theme.main, 0.35)); rg.addColorStop(1, rgba(theme.main, 0));
            ctx.fillStyle = rg; ctx.fillRect(GX, ry, GW, 40);
        }
        ctx.restore();
        /* EMP arcs: a jagged bolt from the 64 to the node */
        bolts.forEach(function (b) {
            var a = Math.max(0, Math.min(1, b.life / 24));
            ctx.strokeStyle = rgba('#fff6b0', a); ctx.lineWidth = 2.5;
            ctx.shadowColor = rgba('#ffe64d', a); ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.moveTo(b.x0, b.y0);
            for (var i = 1; i < 7; i++) {
                var f = i / 7;
                ctx.lineTo(b.x0 + (b.x1 - b.x0) * f + (Math.random() - 0.5) * 14, b.y0 + (b.y1 - b.y0) * f + (Math.random() - 0.5) * 14);
            }
            ctx.lineTo(b.x1, b.y1);
            ctx.stroke();
            ctx.shadowBlur = 0;
        });
        /* floaters */
        floaters.forEach(function (f) {
            ctx.globalAlpha = Math.min(1, f.life / 30);
            centerText(f.text, f.y, f.color, f.big ? 12 : 9, true, 10);
        });
        ctx.globalAlpha = 1;
    }

    /* interference: stray lines, a bar of static, horizontal tearing */
    function drawNoise() {
        var n = noiseBurst > 0 ? 3 + Math.floor(noiseBurst / 8) : (Math.random() < 0.06 ? 1 : 0);
        for (var i = 0; i < n; i++) {
            var y = 8 + Math.random() * (H - 16), h = 1 + Math.random() * 2.5;
            ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + Math.random() * 0.1) + ')';
            ctx.fillRect(8, y, W - 16, h);
        }
        if (noiseBurst > 0 && Math.random() < 0.5) {
            /* tear a strip of the picture sideways */
            var ty = 8 + Math.random() * (H - 40), th = 6 + Math.random() * 18, dx = (Math.random() - 0.5) * 14;
            ctx.save();
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.drawImage(canvas, 8 * DPR, ty * DPR, (W - 16) * DPR, th * DPR, (8 + dx) * DPR, ty * DPR, (W - 16) * DPR, th * DPR);
            ctx.restore();
        }
        if (Math.random() < 0.012) {
            ctx.fillStyle = rgba(theme.main, 0.05);
            var by = 8 + Math.random() * (H - 60);
            ctx.fillRect(8, by, W - 16, 30 + Math.random() * 40);
        }
    }

    function panel(y, h, alpha) {
        ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
        roundRect(ctx, GX, y, GW, h, 8); ctx.fill();
        ctx.strokeStyle = rgba(theme.main, 0.4); ctx.lineWidth = 1;
        roundRect(ctx, GX + 0.5, y + 0.5, GW - 1, h - 1, 8); ctx.stroke();
    }

    function drawAttract() {
        panel(GY, GW, 0.84);
        var blink = stateTimer % 60 < 38;
        centerText('2048', GY + 58, theme.bright, 38, true, 18);
        centerText('OVERRIDE', GY + 84, theme.main, 19, true, 10);
        centerText('RESISTANCE TERMINAL  //  BUILD 20.48', GY + 100, theme.mid, 7);
        var lore = ['THE YEAR IS 2048. NEXUS-9 OWNS THE GRID.', 'YOU HAVE A CRT, A SAWTOOTH AND A PLAN.', '', 'SLIDE SIGNALS. EQUAL SIGNALS FUSE.', 'ASSEMBLE A 2048-BIT PULSE.', 'OVERLOAD THE CORE.'];
        for (var i = 0; i < lore.length; i++) centerText(lore[i], GY + 126 + i * 13, i < 2 ? theme.main : theme.bright, 8.5);
        var tips = ['WATCH THE AI TRACE: EMPTY MOVES RAISE IT,', 'FUSIONS LOWER IT. AT 100% NEXUS-9 LOCKS A CELL.', 'RED NODES ARE CORRUPTED: PURGE THEM WITH', 'AN EQUAL SIGNAL OR PARK THEM NEXT TO AN EMP CELL.'];
        for (var k = 0; k < tips.length; k++) centerText(tips[k], GY + 214 + k * 12, theme.mid, 7.5);
        if (progress.best > 0) centerText('BEST ' + pad(progress.best, 6) + ' Hz   MAX TILE ' + progress.bestTile, GY + 282, theme.mid, 8);
        if (blink) centerText(isCoarse() ? 'TAP TO JACK IN' : 'PRESS SPACE TO JACK IN', GY + 306, '#ffb000', 11, true, 8);
    }

    function drawWon() {
        var st = stateTimer;
        if (st < 70) {
            /* two pulses of light over the whole tube, under the three flashes a
               second that photosensitive players can take (it used to strobe at 10 Hz) */
            var pulse = st < 27 ? 1 - st / 27 : (st >= 30 && st < 57 ? 0.6 * (1 - (st - 30) / 27) : 0);
            if (pulse > 0 && !calm) {
                ctx.fillStyle = 'rgba(255,255,255,' + (0.75 * pulse) + ')';
                roundRect(ctx, 7, 7, W - 14, H - 14, 18); ctx.fill();
            }
            if (st > 21) centerText('OVERRIDE', GY + GW / 2 + 10, '#ffffff', 30, true, 20);
            return;
        }
        var a = Math.min(1, (st - 70) / 30);
        ctx.globalAlpha = a;
        panel(GY, GW, 0.93);
        centerText('SYSTEM OVERRIDE', GY + 46, '#ffffff', 19, true, 14);
        centerText('SUCCESSFUL', GY + 70, '#ffffff', 19, true, 14);
        centerText('AI CORE OFFLINE  //  SECTOR 7 FREED', GY + 90, '#4dff9a', 8.5);
        var rows = [['INJECTIONS', pad(moves, 4)], ['FREQUENCY', pad(score, 6) + ' Hz'], ['UPTIME', fmtTime(elapsed)], ['TRACE AT OVERRIDE', pad(Math.round(trace), 3) + '%'], ['NEXUS-9 LOCKS', '' + stats.locks], ['ROLLBACKS USED', '' + rollbacksUsed]];
        for (var i = 0; i < rows.length; i++) {
            text(rows[i][0], GX + 40, GY + 112 + i * 17, theme.mid, 8);
            text(rows[i][1], GX + GW - 40, GY + 112 + i * 17, theme.bright, 11, true, 'right');
        }
        centerText('TRANSMISSION UNLOCKED', GY + 220, '#ffb000', 9, true);
        centerText('FILE 04 DECRYPTED + OVERRIDE WHITE PHOSPHOR', GY + 234, theme.main, 7.5);
        centerText('SEE THE ARCHIVE BELOW THE TERMINAL', GY + 246, theme.mid, 7.5);
        if (st % 60 < 38) {
            centerText(isCoarse() ? 'CONTINUE: GLOBAL PURGE (4096)' : 'ENTER: GLOBAL PURGE (4096)  ESC: END SESSION', GY + 290, theme.bright, 8.5, true);
        }
        ctx.globalAlpha = 1;
    }

    function drawOver() {
        var st = stateTimer;
        var lost = overReason === 'lost';
        if (lost) {
            /* the picture collapses into static */
            var density = st < 40 ? st / 40 : Math.max(0.25, 1 - (st - 40) / 120);
            ctx.save();
            roundRect(ctx, 7, 7, W - 14, H - 14, 18); ctx.clip();
            var n = Math.floor(260 * density);
            for (var i = 0; i < n; i++) {
                var v = Math.floor(Math.random() * 200);
                ctx.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + (0.25 + Math.random() * 0.4) + ')';
                ctx.fillRect(8 + Math.random() * (W - 16), 8 + Math.random() * (H - 16), 2 + Math.random() * 10, 1 + Math.random() * 3);
            }
            ctx.restore();
        }
        var a = Math.min(0.9, st / 40);
        panel(GY, GW, a);
        if (st > 20) {
            var blink = st % 40 < 26;
            if (lost) {
                if (blink) { centerText('SIGNAL LOST', GY + 70, '#ff2a44', 26, true, 18); centerText('AI DETECTED', GY + 98, '#ff6b7a', 16, true, 10); }
            } else {
                centerText('SESSION TERMINATED', GY + 70, '#ffb000', 18, true, 12);
                centerText('LINK CLOSED BY OPERATOR', GY + 92, theme.mid, 9);
            }
            var rows = [['FREQUENCY', pad(score, 6) + ' Hz'], ['HIGHEST SIGNAL', pad(maxTile, 4) + '  ' + tileDef(maxTile).name], ['INJECTIONS', pad(moves, 4)], ['UPTIME', fmtTime(elapsed)]];
            for (var r = 0; r < rows.length; r++) {
                text(rows[r][0], GX + 30, GY + 140 + r * 20, theme.mid, 8);
                text(rows[r][1], GX + GW - 30, GY + 140 + r * 20, theme.bright, 10, true, 'right');
            }
            if (canRollback() && st > 40) {
                centerText(isCoarse() ? 'ROLLBACK UNDOES THE LAST MOVE' : 'ROLLBACK [U] UNDOES THE LAST MOVE', GY + 228, '#4dff9a', 9, true);
            }
            if (state === 'name-entry') {
                centerText('TOP 10! SIGN THE', GY + 250, '#ffb000', 11, true);
                centerText('HALL OF FAME BELOW', GY + 266, '#ffb000', 11, true);
            } else if (st > 90 && st % 60 < 38) {
                centerText(isCoarse() ? 'TAP TO RE-ESTABLISH LINK' : 'PRESS SPACE TO RE-ESTABLISH LINK', GY + 290, theme.bright, 10, true);
            }
        }
    }

    function render() {
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.clearRect(0, 0, W, H);
        var sx = 0, sy = 0;
        if (shake > 0.3) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
        ctx.translate(sx, sy);
        ctx.drawImage(bgCanvas, 0, 0, W, H);

        ctx.save();
        roundRect(ctx, 7, 7, W - 14, H - 14, 18); ctx.clip();
        drawHud();
        drawLadder();
        drawVu();
        drawLog();
        if (state !== 'attract') {
            drawLocks();
            drawTiles();
            drawPins();
            drawEffects();
        }
        if (state === 'attract') drawAttract();
        else if (state === 'won') drawWon();
        else if (state === 'over' || state === 'name-entry') drawOver();
        ctx.restore();

        drawNoise();
        ctx.drawImage(overlayCanvas, 0, 0, W, H);
        /* LED on the bezel: link status */
        var linkOn = state === 'playing' || state === 'won';
        ctx.fillStyle = linkOn ? '#39ff6a' : (state === 'over' ? '#ff4d4d' : '#ffb000');
        if (!linkOn && frameT % 50 > 30) ctx.fillStyle = 'rgba(255,176,0,0.25)';
        ctx.beginPath(); ctx.arc(W - 30, 14, 2.4, 0, TAU); ctx.fill();
    }

    /* ---------------------------------------------------------
       Update
       --------------------------------------------------------- */
    var startPulse = false;
    function update() {
        stateTimer++;
        frameT++;
        if (shake > 0) shake *= 0.82;
        if (flash > 0) flash *= 0.88;
        if (strobe > 0) strobe -= 1 / 70;
        if (noiseBurst > 0) noiseBurst--;
        if (anim.t < 1) { anim.t = Math.min(1, anim.t + 1 / anim.dur); if (anim.t >= 1) { ghosts = []; fireImpact(); } }
        /* a move made during the slide goes as soon as the slide is half done */
        if (pending >= 0 && anim.t >= 0.5) { var pd = pending; pending = -1; if (state === 'playing') move(pd); }
        if (surge) { surge.t++; if (surge.t > 14) surge = null; }
        eachTile(function (t) {
            if (t.pop > 0) t.pop = Math.max(0, t.pop - 1 / 12);
            if (t.appear > 0 && anim.t >= 0.5) t.appear = Math.max(0, t.appear - 1 / 9);
        });
        for (var i = particles.length - 1; i >= 0; i--) {
            var p = particles[i];
            p.x += p.vx; p.y += p.vy; p.vx *= 0.94; p.vy = p.vy * 0.94 + 0.06; p.life--;
            if (p.life <= 0) particles.splice(i, 1);
        }
        for (var r = rings.length - 1; r >= 0; r--) { rings[r].r += 2.6; rings[r].life--; if (rings[r].life <= 0) rings.splice(r, 1); }
        for (var f = floaters.length - 1; f >= 0; f--) { floaters[f].y += floaters[f].dy; floaters[f].life--; if (floaters[f].life <= 0) floaters.splice(f, 1); }
        for (var b = bolts.length - 1; b >= 0; b--) { bolts[b].life--; if (bolts[b].life <= 0) bolts.splice(b, 1); }
        if (nodePulse > 0) nodePulse = Math.max(0, nodePulse - 1 / 50);
        if (rewind > 0) rewind = Math.max(0, rewind - 1 / 23);
        if (cardEl && !cardEl.hidden) placeCard();
        blinkRollback();

        /* meters */
        vu.level *= 0.90;
        var target = vu.level + (state === 'playing' ? 0.04 + 0.03 * Math.sin(frameT * 0.05) : 0);
        vu.vel += (target - vu.needle) * 0.22;
        vu.vel *= 0.68;
        vu.needle = Math.max(0, Math.min(1, vu.needle + vu.vel));
        var seg = Math.round(vu.needle * 20) - 1;
        if (seg >= vu.peak) { vu.peak = seg; vu.peakHold = 40; } else if (vu.peakHold > 0) vu.peakHold--; else vu.peak = -1;

        if (state === 'playing') elapsed = (Date.now() - sessionStart) / 1000;

        if (state === 'attract' || state === 'over') {
            if (startPulse && (state === 'attract' || stateTimer > 90)) { startPulse = false; startSession(); }
            startPulse = false;
        }
    }

    /* ---------------------------------------------------------
       Hall of fame — shared scoreboard via override-scores.php
       --------------------------------------------------------- */
    /* the shared scoreboard; a page can point it elsewhere, or set
       window.OVERRIDE_SCORES_URL = null to keep the scores in this
       browser only (the standalone version on GitHub does that) */
    var SCORES_URL = window.OVERRIDE_SCORES_URL !== undefined ? window.OVERRIDE_SCORES_URL : 'override-scores.php';
    var board = [];
    var localScores = [];
    var lastEntry = null;
    var nameRow = document.getElementById('ov-name-row');
    var nameInput = document.getElementById('ov-name');
    var nameSubmitting = false;
    try { localScores = JSON.parse(localStorage.getItem('override-local-scores') || '[]') || []; } catch (e) {}

    function mergedBoard() {
        var extras = localScores.filter(function (l) {
            return !board.some(function (s) { return s.name === l.name && s.score === l.score; });
        });
        var all = board.concat(extras);
        all.sort(function (a, b) { return b.score - a.score; });
        return all.slice(0, 10);
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function renderBoard() {
        var list = document.getElementById('ov-hiscore-list');
        if (!list) return;
        var entries = mergedBoard();
        var rankNames = ['1ST', '2ND', '3RD', '4TH', '5TH', '6TH', '7TH', '8TH', '9TH', '10TH'];
        var html = '';
        for (var i = 0; i < 10; i++) {
            var r = entries[i];
            var me = r && lastEntry && r.name === lastEntry.name && r.score === lastEntry.score;
            html += '<li class="hiscore-row' + (me ? ' hiscore-me' : '') + '">' +
                '<span class="hiscore-rank">' + rankNames[i] + '</span>' +
                '<span class="hiscore-name">' + (r ? escapeHtml(r.name) : '<span class="hiscore-empty">YOUR NAME HERE</span>') + '</span>' +
                '<span class="hiscore-dots" aria-hidden="true"></span>' +
                '<span class="hiscore-score">' + (r ? pad(r.score, 6) + ' Hz' : '...... Hz') + '</span>' +
                '<span class="hiscore-wave">' + (r ? 'TILE ' + r.tile : 'TILE ....') + '</span>' +
                '</li>';
        }
        list.innerHTML = html;
    }

    function fetchBoard() {
        if (!window.fetch || !SCORES_URL) { renderBoard(); return; }
        fetch(SCORES_URL, { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .then(function (data) { if (Array.isArray(data)) board = data; renderBoard(); })
            .catch(function () { renderBoard(); });
    }

    function qualifies(s) {
        if (s < 4) return false;
        var entries = mergedBoard();
        if (entries.length < 10) return true;
        return s > entries[9].score;
    }

    function sanitizeName(s) {
        return s.toUpperCase().replace(/[^A-Z0-9 .\-!?:]/g, '').replace(/\s+/g, ' ').slice(0, 25);
    }

    function beginNameEntry() {
        state = 'name-entry';
        nameSubmitting = false;
        if (nameRow) nameRow.hidden = false;
        if (nameInput) {
            var prev = '';
            try { prev = localStorage.getItem('override-name') || ''; } catch (e) {}
            nameInput.value = prev;
            setTimeout(function () { nameInput.focus(); }, 50);
        }
        sfxHiscore();
    }

    function finishNameEntry(save) {
        if (nameSubmitting) return;
        nameSubmitting = true;
        if (save) {
            var name = sanitizeName(nameInput ? nameInput.value.trim() : '');
            if (name === '') name = 'MYSTERY PLAYER';
            try { localStorage.setItem('override-name', name); } catch (e) {}
            var entry = { name: name, score: score, tile: maxTile };
            lastEntry = entry;
            submitted = true;
            submitScore(entry);
        }
        if (nameRow) nameRow.hidden = true;
        if (nameInput) nameInput.blur();
        state = 'over';
        stateTimer = 100;
        updateRollbackUi();
    }

    function submitScore(entry) {
        var fallback = function () {
            localScores.push(entry);
            localScores.sort(function (a, b) { return b.score - a.score; });
            localScores = localScores.slice(0, 10);
            try { localStorage.setItem('override-local-scores', JSON.stringify(localScores)); } catch (e) {}
            renderBoard();
        };
        if (typeof gtag === 'function') gtag('event', 'highscore_entry', { 'event_category': 'override', 'event_label': 'tile_' + entry.tile, 'value': entry.score });
        if (!window.fetch || !SCORES_URL) { fallback(); return; }
        fetch(SCORES_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) })
            .then(function (r) { if (!r.ok) throw new Error('rejected'); return r.json(); })
            .then(function (data) { if (Array.isArray(data)) board = data; renderBoard(); })
            .catch(fallback);
    }

    /* ---------------------------------------------------------
       Archive (DOM, below the game): phosphor themes and the
       decrypted files, both unlocked by the highest tile ever
       --------------------------------------------------------- */
    function renderArchive() {
        var root = document.getElementById('ov-archive');
        if (!root) return;
        var html = '<div class="ov-status">HIGHEST SIGNAL EVER <b>' + (progress.bestTile || '----') + '</b> ' +
            (progress.bestTile ? tileDef(progress.bestTile).name : '') +
            ' <span class="ov-status-note">' + progress.wins + ' override' + (progress.wins === 1 ? '' : 's') + ', ' + progress.games + ' session' + (progress.games === 1 ? '' : 's') + ' on this terminal</span></div>';
        html += '<div class="ov-group"><h3>Phosphor</h3><div class="ov-options">';
        THEME_KEYS.forEach(function (k) {
            var t = THEMES[k], open = progress.bestTile >= t.req;
            html += '<button type="button" class="ov-opt' + (k === progress.theme ? ' is-active' : '') + (open ? '' : ' is-locked') + '" data-theme="' + k + '" ' + (open ? '' : 'aria-disabled="true"') + '>' +
                '<span class="ov-swatch" style="background:' + t.main + '"></span>' +
                '<span class="ov-opt-name">' + escapeHtml(t.name) + '</span>' +
                '<span class="ov-opt-desc">' + (open ? escapeHtml(t.desc) : 'LOCKED: reach tile ' + t.req) + '</span></button>';
        });
        html += '</div></div>';
        html += '<div class="ov-group"><h3>Decrypted Files</h3><div class="ov-files">';
        FILES.forEach(function (f) {
            var open = progress.bestTile >= f.req;
            if (open) {
                html += '<details class="ov-file"' + (f.req === progress.bestTile && f.req > 0 ? ' open' : '') + '><summary>' + escapeHtml(f.title) + '</summary>';
                f.lines.forEach(function (l) { html += '<p>' + escapeHtml(l) + '</p>'; });
                html += '</details>';
            } else {
                html += '<div class="ov-file is-locked"><span>' + escapeHtml(f.title.split(' // ')[0]) + ' // ENCRYPTED</span><span class="ov-file-req">reach tile ' + f.req + '</span></div>';
            }
        });
        html += '</div></div>';
        if (progress.bestTile >= 2048) {
            html += '<div class="ov-group ov-reward"><h3>Transmission Unlocked</h3><p>You assembled the Override Code. The resistance thanks you with the one thing it still broadcasts: my Corporate Electro EP, six tracks, free. <a href="https://lloydstellar.bandcamp.com/album/corporate-electro-ep" target="_blank" rel="noopener" onclick="if (typeof gtag === \'function\') gtag(\'event\', \'navigate\', {\'event_category\': \'corporate_electro\', \'event_label\': \'override_reward\', \'value\': 1});">Stream or download it on Bandcamp</a>.</p></div>';
        }
        root.innerHTML = html;
        Array.prototype.forEach.call(root.querySelectorAll('.ov-opt'), function (btn) {
            btn.addEventListener('click', function () {
                var k = btn.getAttribute('data-theme');
                if (progress.bestTile < THEMES[k].req) {
                    btn.classList.remove('is-shake'); void btn.offsetWidth; btn.classList.add('is-shake');
                    initAudio(); sfxBlocked();
                    return;
                }
                if (k === progress.theme) return;
                progress.theme = k;
                theme = THEMES[k];
                saveProgress();
                bakeBackground();
                initAudio(); sfxUnlock();
                logLine('PHOSPHOR SWITCHED: ' + theme.name.toUpperCase(), 'ok');
                renderArchive();
                if (typeof gtag === 'function') gtag('event', 'override_theme', { 'event_category': 'override', 'event_label': k, 'value': 1 });
            });
        });
    }

    /* ---------------------------------------------------------
       The card over the bottom panel of the screen: one-time
       hints and the tutorial. It is DOM, not canvas, so the text
       stays readable on a phone and a screen reader hears it.
       --------------------------------------------------------- */
    var cardEl = document.getElementById('ov-card');
    var cardTitle = cardEl ? cardEl.querySelector('.ov-card-title') : null;
    var cardBody = cardEl ? cardEl.querySelector('.ov-card-body') : null;
    var cardActions = cardEl ? cardEl.querySelector('.ov-card-actions') : null;
    var hint = null, hintMoves = 0, cardPos = '';

    /* the card's bottom edge sits on the bottom panel of the canvas; long text grows upwards */
    function placeCard() {
        var w = canvas.offsetWidth, h = canvas.offsetHeight;
        if (!w || !h) return;
        var key = canvas.offsetLeft + ',' + canvas.offsetTop + ',' + w + ',' + h;
        if (key === cardPos) return;
        cardPos = key;
        cardEl.style.left = (canvas.offsetLeft + w * 12 / W) + 'px';
        cardEl.style.top = (canvas.offsetTop + h * 570 / H) + 'px';
        cardEl.style.width = (w * 376 / W) + 'px';
        cardEl.style.minHeight = (h * 124 / H) + 'px';
    }
    function showCard(title, body, actions) {
        if (!cardEl) return;
        cardTitle.textContent = '> ' + title;
        cardBody.textContent = body;
        cardActions.innerHTML = '';
        actions.forEach(function (a) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = a.label;
            if (a.primary) b.className = 'is-primary';
            b.addEventListener('click', function (e) { e.preventDefault(); initAudio(); a.fn(); });
            cardActions.appendChild(b);
        });
        cardEl.hidden = false;
        cardPos = '';
        placeCard();
    }
    function hideCard() {
        hint = null;
        if (cardEl) cardEl.hidden = true;
    }
    function showHint(id) {
        if (mode === 'tutorial' || seen[id] || hint || !HINTS[id]) return;
        hint = id;
        hintMoves = 0;
        showCard(HINTS[id][0], HINTS[id][1], [{ label: 'OK', fn: dismissHint }]);
    }
    function dismissHint() {
        if (hint && hint !== 'tutorial') markSeen(hint);
        hideCard();
    }
    var TUT_STEPS = ['SLIDE', 'FUSE', 'TRACE', 'COOL', 'LOCK', 'ROLLBACK', 'READY'];
    function showTutorialCard() {
        var t = tutText(tut.step);
        hint = 'tutorial';
        showCard(t[0] + '   ' + (TUT_STEPS.indexOf(tut.step) + 1) + '/' + TUT_STEPS.length, t[1], tut.step === 'READY'
            ? [{ label: tut.resume ? 'BACK TO MY SESSION' : 'JACK IN', primary: true, fn: function () { finishTutorial(true); } }]
            : [{ label: 'SKIP TUTORIAL', fn: function () { finishTutorial(false); } }]);
    }
    /* a block or a pin lock met for the first time: the manual decrypts it */
    function meetBlock(id) {
        if (markSeen('met_' + id)) renderManual();
    }

    /* ---- the rollback buttons under the screen ---- */
    var rbBtn = document.getElementById('ov-rollback'), rbTouch = document.getElementById('ov-rb-touch');
    var rbLit = false;
    function updateRollbackUi() {
        var max = mode === 'tutorial' ? 1 : rules.rollbackMax, marks = '';
        for (var i = 0; i < max; i++) marks += i < charges ? '■' : '□';
        var ok = canRollback();
        var label = 'Rollback, ' + charges + (charges === 1 ? ' charge' : ' charges') + ' left';
        [rbBtn, rbTouch].forEach(function (b) {
            if (!b) return;
            b.disabled = !ok;
            b.setAttribute('aria-label', label);
            var m = b.querySelector('.ov-rb-marks');
            if (m) m.textContent = marks;
        });
    }
    /* the tutorial points at the rollback button: it blinks when it is its turn */
    function blinkRollback() {
        var on = mode === 'tutorial' && tut.step === 'ROLLBACK' && history.length > 0 && frameT % 54 < 27;
        if (on === rbLit) return;
        rbLit = on;
        if (rbBtn) rbBtn.classList.toggle('is-lit', on);
        if (rbTouch) rbTouch.classList.toggle('is-lit', on);
    }

    /* the board in words, for screen readers: one row per sentence */
    function describeTile(t) {
        switch (t.kind) {
            case 'NODE': return t.value + ' corrupted node';
            case 'BEACON': return t.value + ' trace beacon, transmits in ' + t.counter;
            case 'WORM': return t.value + ' worm, infects in ' + t.counter;
            case 'CASED': return t.value + ' cased, ' + t.counter + (t.counter === 1 ? ' hit' : ' hits');
            case 'CAPACITOR': return 'surge capacitor, discharges in ' + t.counter;
            case 'PATCH': return 'patch cable';
            case 'WALL': return 'static wall, strength ' + t.counter;
            default: return '' + t.value;
        }
    }
    function describeBoard() {
        var rows = [];
        for (var y = 0; y < SIZE; y++) {
            var cells = [];
            for (var x = 0; x < SIZE; x++) {
                var t = grid[x][y], l = lockAt(x, y);
                cells.push(t ? describeTile(t) + (l ? ' (pinned)' : '') : (l ? 'locked' : 'empty'));
            }
            rows.push('Row ' + (y + 1) + ': ' + cells.join(', '));
        }
        canvas.setAttribute('aria-label', '2048 Override. ' + score + ' hertz, ' + moves + ' moves, AI trace ' + trace + ' percent, ' +
            charges + (charges === 1 ? ' rollback' : ' rollbacks') + ' left. ' + rows.join('. ') + '.');
    }

    /* ---------------------------------------------------------
       Field Manual (DOM, below the game): the rules and every
       block. Blocks you have not met stay classified, with the
       text folded away for anyone who wants it early.
       --------------------------------------------------------- */
    var MANUAL_REQ = { NODE: 32, PIN: PIN_UNLOCK };
    SPECIALS.forEach(function (sp) { MANUAL_REQ[sp.kind] = sp.unlock; });
    function renderManual() {
        var root = document.getElementById('ov-manual');
        if (!root || !bgCanvas) return;
        Array.prototype.forEach.call(root.querySelectorAll('.ov-block[data-block]'), function (el) {
            var id = el.getAttribute('data-block'), req = MANUAL_REQ[id];
            var known = !req || id === 'NODE' || progress.bestTile >= req || !!seen['met_' + id];
            el.classList.toggle('is-classified', !known);
            var det = el.querySelector('details');
            if (det && (known || !el.hasAttribute('data-ready'))) det.open = known;
            el.setAttribute('data-ready', '1');
            var tag = el.querySelector('.ov-block-tag');
            if (tag && req) {
                var sp = SPECIALS.filter(function (x) { return x.kind === id; })[0];
                tag.textContent = !known ? 'Classified: decrypts at your first ' + req + ', or when you meet it'
                    : (id === 'NODE' ? 'Turns up from a 32' : (id === 'PIN' ? 'From your first 512' : 'Turns up from a ' + sp.early));
            }
            var cv = el.querySelector('canvas');
            if (cv) drawPreview(cv, el.getAttribute('data-icon') || id, known);
        });
    }
    /* one cell's artwork on a small canvas, drawn with the game's own routines */
    function drawPreview(cv, id, known) {
        var g = cv.getContext('2d'), S = cv.width;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, S, S);
        g.setTransform(S / CELL, 0, 0, S / CELL, 0, 0);
        if (!known) {
            g.fillStyle = '#101614'; roundRect(g, 0, 0, CELL, CELL, 10); g.fill();
            g.setLineDash([4, 4]); g.strokeStyle = 'rgba(160,180,170,0.43)'; g.lineWidth = 1.5;
            roundRect(g, 1.5, 1.5, CELL - 3, CELL - 3, 10); g.stroke(); g.setLineDash([]);
            g.fillStyle = 'rgba(160,180,170,0.6)'; g.font = 'bold 30px ' + FONT_DISPLAY; g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText('?', CELL / 2, CELL / 2 + 1);
            return;
        }
        var main = ctx, pulse = nodePulse;
        ctx = g; nodePulse = 0;
        var gx = -(GX + GAP) / (CELL + GAP), gy = -(GY + GAP) / (CELL + GAP);
        var COUNTERS = { CAPACITOR: 4, CASED: 2, BEACON: 15, WORM: 8, WALL: 2 };
        try {
            if (id === 'LOCK') drawLockAt(0, 0, 5);
            else if (id === 'PIN') { drawTileAt({ id: 0, value: 128, kind: 'SIGNAL' }, gx, gy, 1, 1); drawPinAt(0, 0, 5); }
            else if (id === 'NODE') drawTileAt({ id: 0, value: 4, kind: 'NODE' }, gx, gy, 1, 1);
            else if (id === 'SUPPLY') {
                /* the supply drop is an ordinary signal: a crate badge marks it here */
                drawTileAt({ id: 0, value: 32, kind: 'SIGNAL' }, gx, gy, 1, 1);
                g.fillStyle = '#0a2412'; g.beginPath(); g.arc(CELL - 13, 13, 9, 0, TAU); g.fill();
                g.strokeStyle = '#4dff9a'; g.lineWidth = 1.4;
                g.strokeRect(CELL - 18, 9, 10, 9);
                g.beginPath(); g.moveTo(CELL - 18, 12.5); g.lineTo(CELL - 8, 12.5); g.stroke();
            } else drawTileAt({ id: 0, value: id === 'CASED' ? 16 : (id === 'WORM' ? 2 : 4), kind: id, counter: COUNTERS[id] || 0 }, gx, gy, 1, 1);
        } finally {
            ctx = main; nodePulse = pulse;
        }
    }
    var tutBtn = document.getElementById('ov-tutorial');
    if (tutBtn) tutBtn.addEventListener('click', function () {
        initAudio();
        if (mode === 'tutorial') return;
        if (state === 'name-entry') return;
        startTutorial(true);
        var cab = document.querySelector('.override-cabinet');
        if (cab && cab.scrollIntoView) cab.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
    });

    /* ---------------------------------------------------------
       Main loop
       --------------------------------------------------------- */
    var last = 0, acc = 0, STEP = 1000 / 60, running = true;
    function frame(now) {
        if (!running) return;
        if (!last) last = now;
        acc += Math.min(now - last, 100);
        last = now;
        while (acc >= STEP) { update(); acc -= STEP; }
        render();
        requestAnimationFrame(frame);
    }
    document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
            running = false;
            if (state === 'playing') { elapsed = (Date.now() - sessionStart) / 1000; saveState(); }
            if (audioCtx && musicBus) musicBus.gain.setTargetAtTime(0, audioCtx.currentTime, 0.2);
        } else {
            running = true; last = 0;
            if (state === 'playing') sessionStart = Date.now() - elapsed * 1000;
            updateMusicGain();
            requestAnimationFrame(frame);
        }
    });

    /* ---------------------------------------------------------
       Input
       --------------------------------------------------------- */
    function isCoarse() { return window.matchMedia && window.matchMedia('(pointer: coarse)').matches; }
    function isTyping(e) {
        var t = e.target;
        return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    }
    function primaryAction() {
        if (state === 'attract' || state === 'over') { startPulse = true; return; }
        if (state === 'won') { continueGame(); return; }
        if (mode === 'tutorial' && tut.step === 'READY') finishTutorial(true);
    }
    function endSession() {
        if (mode === 'tutorial') { finishTutorial(false); return; }
        if (state === 'playing' || state === 'won') gameOver('abort');
    }
    function doMove(dir) {
        initAudio();
        if (state === 'attract' || (state === 'over' && stateTimer > 90)) { startPulse = true; return; }
        if (state === 'won' && stateTimer > 70) { continueGame(); }
        if (state === 'playing') move(dir);
    }

    var KEYS = { ArrowUp: 0, ArrowRight: 1, ArrowDown: 2, ArrowLeft: 3, w: 0, W: 0, d: 1, D: 1, s: 2, S: 2, a: 3, A: 3, k: 0, K: 0, l: 1, L: 1, j: 2, J: 2, h: 3, H: 3 };
    document.addEventListener('keydown', function (e) {
        if (isTyping(e)) return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        /* Space and Enter on a focused hint or tutorial button belong to that button */
        if ((e.key === ' ' || e.key === 'Enter') && e.target && e.target.closest && e.target.closest('#ov-card')) return;
        if (KEYS.hasOwnProperty(e.key)) { e.preventDefault(); if (!e.repeat) doMove(KEYS[e.key]); return; }
        switch (e.key) {
            case ' ': initAudio(); if (!e.repeat) primaryAction(); e.preventDefault(); break;
            case 'Enter': initAudio(); if (!e.repeat) { if (state === 'won' && stateTimer > 70) continueGame(); else primaryAction(); } break;
            case 'Escape': if (state === 'won' && stateTimer > 70) { e.preventDefault(); endSession(); } break;
            case 'r': case 'R': initAudio(); if (!e.repeat) { if (state === 'playing') endSession(); else primaryAction(); } break;
            case 'm': case 'M': toggleMute(); break;
            case 'n': case 'N': toggleMusic(); break;
            case 'u': case 'U': case 'z': case 'Z': initAudio(); if (!e.repeat) rollback(); break;
        }
    });

    function bindTap(id, fn) {
        var el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', function (e) { e.preventDefault(); initAudio(); fn(); });
        el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    }
    bindTap('ov-up', function () { doMove(0); });
    bindTap('ov-right', function () { doMove(1); });
    bindTap('ov-down', function () { doMove(2); });
    bindTap('ov-left', function () { doMove(3); });
    if (rbBtn) rbBtn.addEventListener('click', function () { initAudio(); rollback(); });
    bindTap('ov-rb-touch', function () { rollback(); });

    /* swipes on the screen */
    var swipe = null;
    canvas.addEventListener('pointerdown', function (e) {
        initAudio();
        e.preventDefault();
        swipe = { x0: e.clientX, y0: e.clientY, t0: performance.now(), done: false };
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    });
    canvas.addEventListener('pointermove', function (e) {
        if (!swipe || swipe.done || state !== 'playing') return;
        e.preventDefault();
        var dx = e.clientX - swipe.x0, dy = e.clientY - swipe.y0;
        var thr = Math.max(18, canvas.getBoundingClientRect().width * 0.06);
        var ax = Math.abs(dx), ay = Math.abs(dy);
        /* commit as soon as the swipe is clearly long and clearly straight */
        if (Math.max(ax, ay) < thr || Math.max(ax, ay) < 1.4 * Math.min(ax, ay)) return;
        swipe.done = true;
        if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : 3); else doMove(dy > 0 ? 2 : 0);
    });
    function endSwipe(e) {
        if (!swipe) return;
        e.preventDefault();
        var dx = e.clientX - swipe.x0, dy = e.clientY - swipe.y0;
        var thr = Math.max(18, canvas.getBoundingClientRect().width * 0.06);
        if (!swipe.done) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= thr * 0.8) {
                if (Math.abs(dx) > Math.abs(dy)) doMove(dx > 0 ? 1 : 3); else doMove(dy > 0 ? 2 : 0);
            } else if (state !== 'playing') {
                primaryAction();
            }
        }
        swipe = null;
    }
    canvas.addEventListener('pointerup', endSwipe);
    canvas.addEventListener('pointercancel', function () { swipe = null; });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* buttons under the screen */
    var muteBtn = document.getElementById('ov-mute');
    var musicBtn = document.getElementById('ov-music');
    var newBtn = document.getElementById('ov-new');
    function updateLabels() {
        if (muteBtn) muteBtn.textContent = muted ? 'SOUND: OFF [M]' : 'SOUND: ON [M]';
        if (musicBtn) musicBtn.textContent = music.on ? 'MUSIC: ON [N]' : 'MUSIC: OFF [N]';
    }
    function toggleMute() {
        initAudio();
        muted = !muted;
        try { localStorage.setItem('override-muted', muted ? '1' : '0'); } catch (err) {}
        updateLabels();
        updateMusicGain();
    }
    function toggleMusic() {
        initAudio();
        music.on = !music.on;
        progress.music = music.on;
        saveProgress();
        updateLabels();
        updateMusicGain();
    }
    if (muteBtn) muteBtn.addEventListener('click', toggleMute);
    if (musicBtn) musicBtn.addEventListener('click', toggleMusic);
    if (newBtn) newBtn.addEventListener('click', function () {
        initAudio();
        if (state === 'playing' || state === 'won') endSession();
        else if (state === 'attract' || state === 'over') startPulse = true;
    });
    updateLabels();

    /* victory choices (touch friendly) */
    var winRow = document.getElementById('ov-win-row');
    function showWinRow(on) { if (winRow) winRow.hidden = !on; }
    var contBtn = document.getElementById('ov-continue'), endBtn = document.getElementById('ov-end');
    if (contBtn) contBtn.addEventListener('click', function () { initAudio(); continueGame(); });
    if (endBtn) endBtn.addEventListener('click', function () { initAudio(); endSession(); });

    /* name entry */
    if (nameInput) {
        nameInput.addEventListener('input', function () {
            var clean = sanitizeName(nameInput.value);
            if (nameInput.value !== clean) nameInput.value = clean;
        });
        nameInput.addEventListener('keydown', function (e) {
            if (state !== 'name-entry') return;
            if (e.key === 'Enter') { e.preventDefault(); finishNameEntry(true); }
            if (e.key === 'Escape') { e.preventDefault(); finishNameEntry(false); }
        });
    }
    var nameOk = document.getElementById('ov-name-ok');
    if (nameOk) nameOk.addEventListener('click', function () { if (state === 'name-entry') finishNameEntry(true); });

    var overChecked = false;
    setInterval(function () {
        if (state === 'over' && !overChecked && stateTimer > 45) {
            overChecked = true;
            if (qualifies(score)) beginNameEntry();
        }
        if (state === 'playing') overChecked = false;
    }, 100);

    /* ---- boot ---- */
    grid = emptyGrid();
    bakeAll();
    renderArchive();
    fetchBoard();
    if (restoreState()) { if (state === 'won') showWinRow(true); }
    updateRollbackUi();
    if (document.fonts && document.fonts.load) {
        Promise.all([document.fonts.load('bold 13px "Share Tech Mono"'), document.fonts.load('bold 26px "Orbitron"')]).then(bakeAll).catch(function () {});
    }
    requestAnimationFrame(frame);
})();
