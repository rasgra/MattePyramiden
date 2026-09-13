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
step, no dependencies.

## What's here

A single-page game (`index.html`, vanilla HTML/CSS/JS, no build tooling) —
_Pyramid Reckoning_:

- 12 chambers: 9 random maths topics (arithmetic, percent, geometry, algebra,
  sequences, number bases, Pythagoras, quadratics — 12 topic generators in
  the pool, each producing fresh random problems every run) drawn as a
  two-column worksheet of 10 problems, plus a Nim room, a full Mastermind
  room, and a combinatorics riddle finale.
- Two "sequential visual" chambers (Geometry Vault — name 3D wireframe
  shapes to earn dynamite charges and blast through a wall; Coordinate Grid —
  plot points to collect melons) sharing one canvas-driven engine.
- Difficulty selectable by Swedish school year (Åk 1–9) or College, which
  changes both number ranges and which topics can appear.
- Swedish/English language toggle, a skippable narrated intro, a torch/life
  system, save/load via `localStorage`, an in-game map, and separate
  Hint (F2-style) and Rules (F1-style) panels per the original's own
  control scheme.
- Original art direction (a torch-lit stone-corridor aesthetic) — the
  original's `.PCX` art and exact copy are not reused; only the game
  _mechanics and structure_ are carried over.

## Development

The game itself has no build step or dependencies — `index.html` is
self-contained on purpose (it's also published as a Claude Artifact, which
requires a single inline file). All dev tooling (Node, npm packages,
Playwright's browser) lives in a Docker image; nothing is installed on the
host beyond Docker itself.

```
make install      # one-time: builds the tooling image (npm install runs inside it)
make dev           # serve the game at http://localhost:8080 (PORT=... to override)
make format        # check formatting               make format-fix  # apply it
make lint          # eslint (inline <script>) + stylelint (inline <style>)
make test          # Playwright smoke tests, headless
make report        # view the last test run's HTML report at http://localhost:9223
make check         # format + lint + test — what CI should run
```

Run `make help` for the full list, or `make shell` to poke around inside the
container. Every command runs via `docker compose run`, with `node_modules`
kept in an anonymous volume — it's never written to the project directory
on the host.

## Status

Actively evolving against reference material (screenshots and a playthrough
video of the original) supplied during development. See
`docs/CHEOPS_DESIGN_NOTES.md` for room types identified in the original but
not yet built (Tower of Hanoi, Othello, Dürer's magic square, dependent
multi-part word problems, per-room pass thresholds other than "all correct").
