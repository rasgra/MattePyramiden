# Matte Pyramiden — Pyramid Reckoning

A modern, browser-based homage to _Cheops Pyramid_ (Alega Skolmateriel, 1993),
a Swedish maths-adventure floppy game by Göran Hjalmarsson. Built from a
reverse-engineering pass over the original `CHEOPS.EXE`/`CHEOPS.OVR` — see
[`docs/CHEOPS_DESIGN_NOTES.md`](docs/CHEOPS_DESIGN_NOTES.md) for the technical
analysis and the full room/mechanic inventory that inspired this build, and
[`docs/reference/`](docs/reference/) for the raw string dumps, a disassembly
excerpt of the entry dispatcher, and a few of the original `.PCX` screens
converted to PNG.

**Play it:** open [`index.html`](index.html) directly in a browser — no build
step, no dependencies. That file is generated (see Development below), but
it's checked into git specifically so this stays true for players.

## What's here

A vanilla HTML/CSS/JS game, no framework — _Pyramid Reckoning_:

- 12 chambers: 9 are random maths topics (arithmetic, percent, geometry,
  algebra, sequences, number bases, Pythagoras, quadratics, and two
  "sequential visual" topics — Geometry Vault and Coordinate Grid — sharing
  a canvas-driven engine), drawn as a two-column worksheet of 10 problems.
  The same topic never runs in back-to-back-ish chambers (no repeats within
  the last 4). Chambers 5 and 10 are always one of four mini-games —
  the Counting Wall (visualized 3-pile misère Nim: click a brick to take it
  and everything stacked above it), Mastermind, a Guess-the-Number game with
  too-high/too-low feedback, or a 10×10 Minesweeper field where the mines
  are sleeping mummies (the first click is always safe, and flagging every
  mummy auto-clears the field) — picked at random and never the same type
  in both slots. Chamber 12 is always the combinatorics riddle finale.
- Difficulty selectable across ten levels — Difficulty level 1 through 9, or
  Master — which changes number ranges, which topics can appear, and the
  mini-games' opponent strength.
- Swedish/English language toggle, a skippable narrated intro, a torch/life
  system, save/load via `localStorage`, an in-game map, and separate
  Hint (F2-style) and Rules (F1-style) panels per the original's own
  control scheme.
- Original art direction (a torch-lit stone-corridor aesthetic) — the
  original's `.PCX` art and exact copy are not reused; only the game
  _mechanics and structure_ are carried over.

## Development

The source lives in [`src/`](src/) as plain ES modules — one file per room,
mini-game, and engine concern (see `src/rooms/`, `src/minigames/`,
`src/engine/`, `src/ui/`, `src/styles/`). [`build.js`](build.js) (esbuild
under the hood) bundles that into the single self-contained `index.html` at
the repo root — the form the game is actually played from, since it's also
published as a Claude Artifact, which requires one inline file. **`index.html`
is generated — never hand-edit it; edit under `src/` and rebuild.** All dev
tooling (Node, npm packages, Playwright's browser) lives in a Docker image;
nothing is installed on the host beyond Docker itself.

```
make install      # one-time: builds the tooling image (npm install runs inside it)
make build         # bundle src/ into the root index.html once
make dev           # build, then serve at http://localhost:8080, rebuilding on save (PORT=... to override)
make dev-down      # stop a `make dev` left running (e.g. in another terminal, or after a crash)
make format        # check formatting               make format-fix  # apply it
make lint          # eslint (src/**/*.js) + stylelint (src/styles/**/*.css)
make test          # Playwright smoke tests, headless (builds first)
make report        # view the last test run's HTML report at http://localhost:9223
make check         # format + lint + test — what CI should run
```

Run `make help` for the full list, or `make shell` to poke around inside the
container. Every command runs via `docker compose run`, with `node_modules`
kept in an anonymous volume — it's never written to the project directory
on the host.

### Dev mode

[`dev.config.js`](dev.config.js) is a small git-tracked file (ships with
`enabled: false`) that the published Artifact never loads. Flip it to
`true` locally and reload to get a "DEV MODE" bar at the top of the page
with a chamber picker (and an optional "force this mini-game" picker for
chambers 5/10), so you can jump straight to any room to test it instead of
playing through the whole pyramid each time.

## Status

Actively evolving against reference material (screenshots and a playthrough
video of the original) supplied during development. See
`docs/CHEOPS_DESIGN_NOTES.md` for room types identified in the original but
not yet built (Tower of Hanoi, Othello, Dürer's magic square, dependent
multi-part word problems, per-room pass thresholds other than "all correct").
