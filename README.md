# 2048 Override

A 2048 puzzle against a rogue AI, in the browser. It is the year 2048,
the AI NEXUS-9 owns every network, and you sit at a hacked military CRT
fusing data signals until you hold the 2048-bit pulse that overloads its
core. The rules of 2048 are untouched. On top come the AI Trace, which
locks a cell when you stall, red Corrupted Nodes that you purge with an
equal signal or an EMP Cell, seven special blocks, a rollback button and
a soundtrack that is generated live and speeds up as your tiles grow.

Play it on [lloydstellar.nl/override.html](https://lloydstellar.nl/override.html),
where it has a worldwide hall of fame. This repository is the same game
as a standalone page. There is also an
[Android version](https://github.com/lloydstellar/override-android); the
two engines play the same rules move for move.

I made it as [Lloyd Stellar](https://lloydstellar.nl), an electro producer
from Hilversum. I am a big fan of open source. I give my music away in
the spirit of the 1990s internet, and this game only exists because
Gabriele Cirulli put 2048 on GitHub in 2014, so its code is open too.

## Run it

There is no build step and nothing to install. Serve the folder with any
static web server and open it:

```
python3 -m http.server 8000
```

Then go to http://localhost:8000.

Keys: arrows, WASD or HJKL to slide, Space or Enter to start, U or Z for
rollback, R to end a session, M for sound, N for music, F for fullscreen.
On a phone, swipe on the screen or use the buttons under it.

## Files

| File | What it does |
|---|---|
| `index.html` | The page: the terminal, the Field Manual, the signal catalogue, the archive, the hall of fame |
| `override.js` | The whole game: engine, rendering, Web Audio sound and music, tutorial, hall of fame |
| `game-fullscreen.js` | Fullscreen with orientation lock on phones and a CSS fallback for iPhone |
| `css/` | The LLOYDOS look of the site (`base.css`) and the game's own styles (`override.css`) |
| `server/override-scores.php` | Optional shared hall of fame, see below |

The engine section of `override.js` (`engineMove`, `spawnTile`,
`spawnSpecial` and the functions around them) is a line by line port of
`Engine.kt` in the Android app. A change to the rules belongs on both
sides.

## Hall of fame

This copy keeps the top 10 in your browser (`localStorage`). For a
shared board, put `server/override-scores.php` next to `index.html` on a
server with PHP, make sure PHP can write `override-scores.json` in that
folder, and change this line in `index.html`:

```html
<script>window.OVERRIDE_SCORES_URL = null;</script>
```

to `'override-scores.php'`. The script accepts `{name, score, tile}`,
checks that the score is a multiple of 4 and the tile a power of two,
and keeps the best 100. It is a guestbook, not anti-cheat.

## The voice

At 2048 the terminal speaks. It uses S.A.M., the Software Automatic Mouth
from 1982, through [sam-js](https://github.com/discordier/sam) when
`samjs.min.js` sits next to `index.html`. S.A.M. has no open-source
license, so it is not in this repository; without it the game falls back
to your browser's own speech.

## Contributing

The live game runs on my website and this repository is exported from
it, so I copy pull requests over by hand. Issues and small, focused pull
requests are welcome.

## License

The code is released under the Apache License 2.0, see `LICENSE`. The
name "2048 Override", the story texts and the tile artwork are not; see
`NOTICE` for what that means if you publish your own version. The rules
of 2048 are by Gabriele Cirulli (MIT), the fonts are under the SIL Open
Font License.
