# Cheops Pyramid (1993) — Reverse-engineering notes & remake spec

Source: `CHEOPS.EXE` + `CHEOPS.OVR`, "Version 4.2 930524", school license
"Tanumsskolan, Tanumshede". Credits string in `INFO.EXE`:
**Göran Hjalmarsson, Alega Skolmateriel** (Swedish educational publisher).
Copyright almost certainly still held by Alega/the author — treat the
original text, art and room names as reference material for a personal
remake, not as content to redistribute verbatim if you ever publish it.

## 1. What the binary is

- `CHEOPS.EXE`: MS-DOS MZ executable, 112,464 bytes, header 6,448 bytes
  (403 paragraphs), 1,602 relocation entries, entry point `0000:078A`.
- `CHEOPS.OVR`: 145,405-byte **overlay file** loaded on demand by the
  `Cheops.ovr` string baked into the EXE — classic Borland **Turbo
  Pascal OVERLAY unit** pattern (a Pascal unit's code lives in the .OVR
  and gets swapped into a fixed memory window as needed — this is how a
  program bigger than conventional-memory limits shipped in 1993).
- RTL evidence: `"Runtime error "` string, exact BGI error-string table
  ("BGI Error: Graphics not initialized...", "No error", "(BGI) graphics
  not installed", ...), `.BGI`/`.CHR` driver/font extensions, `EGAVGA`,
  `IBM8514`, `PC3270` driver names → this is **Borland Turbo Pascal 6/7
  with the standard `Graph` unit (BGI)**, using `EGAVGA.BGI` (shipped
  alongside the EXE) and `LCOM.CHR` as the stroked font.
- On top of BGI it links a commercial add-on: **"GX Development Series"
  / "GX Kernel 2.00" / "GX Effects 2.02", Copyright (c) Genus
  Microprogramming, Inc. 1988-92, by Christopher A. Howard** — this is
  what does PCX loading/display (`pcxGetFilePalette`, `pcxFileDisplay`,
  `gxSetDisplayPalette`, `gxSetMode`, `DisplayFile`) and its own
  window/screen manager (`WinTTT`, "Max screens exceeded", "Screen has
  not been created", etc.). All the `*.PCX` art assets in the game
  folder are drawn through this library.
- Disassembling the entry point (x86-16, real mode, via Capstone —
  see `entry_dispatcher_disasm.txt`) shows the textbook Turbo Pascal
  startup: a run of `lcall seg:off` far calls (each unit's
  initialization section, called in dependency order), then the main
  program's `push bp / mov bp,sp` frame. Immediately after that sits a
  **big `cmp al, N / jne / lcall` dispatch chain** — i.e. the main menu
  / room-selector reading a numeric choice into `AL` and far-calling a
  shared "open room" routine with the room number and flags pushed on
  the stack. This matches the F-key menu strings below almost exactly.
- Full instruction-level recovery beyond this is impractical without a
  segment-aware disassembler (IDA/Ghidra with proper fixups) because of
  the 1,602 relocations and heavy overlay swapping — but it isn't needed
  for a remake: the _content_ (below) is what's worth mining, not the
  Pascal codegen.

Raw dumps for your own digging:

- `cheops_exe_strings.txt`, `cheops_ovr_strings.txt` — every printable
  string in each module (Swedish text uses the DOS/CP437 codepage, so
  å/ä/ö render as stray high-bit bytes in plain `strings` output).
- `entry_dispatcher_disasm.txt` — first ~700 disassembled instructions
  from the entry point / main dispatcher.
- `VINJETT.png`, `KARTA.png`, `PYRAMID.png`, `BIGGAM.png` — a few of the
  `.PCX` art assets converted to PNG so you can look at them without DOS.
  `KARTA.PCX` in particular is the in-game pyramid map (bound to F3).

## 2. What the game actually is

**Genre:** a Swedish maths-education adventure game — "Ett äventyr i
matematikens underbara värld!" ("An adventure in the wonderful world of
mathematics"). Framing story: on a tour of the Cheops (Khufu) pyramid
you get separated from the guide and lost in a pitch-black corridor;
you must solve one maths problem per room to progress, working your way
out (and eventually to a treasure) while your air/light literally runs
out.

**Structure:** the pyramid interior is a fixed maze of numbered rooms
(see `KARTA.png`), each themed around one math topic. Entering a room
shows a PCX illustration plus a text problem; a correct answer lets you
climb up (deeper toward the exit)/move on, a wrong one drops you back a
room, sometimes several ("consult the map" is one of the F-keys for a
reason). A handful of rooms are pure logic/strategy games rather than
answer-a-question rooms.

**Global UI (from the string table), bound to function keys:**

- F1 — room rules, F2 — help/hint for current room, F3 — map, F4 —
  toggle sound, F8 — save current room, F9 — load saved room, F10 —
  jump to any previously-visited room ("byta rum"), Esc — quit (with a
  J/N confirm).
- Save system is period-appropriate: name + a numeric "code" (like a
  PIN) + target floppy drive letter, so a whole classroom could keep
  separate saves on their own diskettes.
- A resource-pressure mechanic: an hourglass/"luften" (the air) timer
  runs per room in the dark corridors; some rooms require lighting a
  minimum number of candles/matches to avoid falling back a level.
- Every room also has a canned **hint text** teaching the actual maths
  concept (e.g. carrying/estimation tricks for addition/subtraction,
  the sin/cos unit-circle explanation, Pascal's-triangle background,
  logarithm definition, Nim strategy) — this is worth keeping as a
  "?"/help panel in a remake; it's the pedagogical backbone, not filler.

**Full room roster recovered from strings** (grouped by kind):

_Arithmetic & foundations_

- Additions-rummet, Subtraktions-rummet, Multiplikations-rummet,
  Divisions-rummet — mental-math with a worked trick shown as the hint.
- Överslags-rummet — estimation (rounding to nearest 10/100).
- Procent-rummet — percent-of and percent-that-is problems.
- Talsystems-rummet — base conversion: binary/decimal/hex/Roman/
  Egyptian numerals (this is a literal door-lock puzzle in the story).
- Gissa-rummet — "guess the number I'm thinking of" (higher/lower,
  10 tries), classic binary-search teaching moment.

_Algebra_

- Ekvations-rummet — solve for x mentally.
- 2:a grads-rummet — quadratic equations (two roots).
- Logaritmiska rummet — log definition and values.
- Talföljds-rummet — find the next term in a sequence.
- Serie-rummet — sum an infinite geometric series.
- Komplexa-rummet — complex numbers, plot on the Argand plane.

_Geometry & trig_

- Geometri-rummet — parallel-line angle relationships.
- Trekants-rummet / Fyrkants-rummet / Runda-rummet — perimeter & area
  of triangle/quadrilateral/circle, "name this shape" prompts.
- Bollen (sphere) / Brunnen (well → cylinder volume, with a "sharks in
  the well" escape event!) / Pyramid-rummet (pyramid volume, paint
  needed, weight in tons).
- Pythagoras rum — right-triangle Pythagorean-theorem word problems.
- Vinkel-rummet / Sinus-rummet / Cosinus-rummet — protractor angle
  reading, unit-circle sin/cos.
- Koordinat-rummet, Linje-rummet (y=kx+m), Funktions-rummet (match a
  graph to its equation), Derivata-rummet (mark regions of positive/
  negative slope, zero, max, min, inflection on a curve).
- Grekiska rummet — name the Greek letter (σ, ω, π...).

_Applied word problems tied to the Egypt setting_

- Kart-rummet — read distances off a scaled map (Suez canal, Cairo↔
  El-Alamein) and unit-convert km/miles/cm.
- Mikroskop-rummet — magnification word problem about a daphnia
  (water flea) under a microscope.
- Pascals rum — reconstruct Pascal's triangle, told through Blaise
  Pascal's name.

_Logic / strategy mini-games (the "arcade" rooms)_

- Torn-rummet / "Mersennes rum" — **Towers of Hanoi**, player picks
  ring count (1–64), counts moves, and the game explicitly teaches the
  Mersenne-number connection (2ⁿ−1) as the payoff.
- Nim-rummet — Nim (take stones from heaps) vs. the computer, with a
  difficulty setting and a hint pointing at optimal strategy.
- Master Mind-rummet — full Mastermind clone (guess count, exact/
  partial-match feedback).
- OTHELLO-rummet — full Othello/Reversi vs. computer AI.
- Magiska-rummet — Dürer's magic-square engraving (_Melencolia I_):
  reconstruct the missing numbers.

_Set-piece story puzzles (one-off narrative beats, not repeatable rooms)_

- Diophantus's age riddle (the classic epitaph algebra problem).
- `SEND + MORE = MONEY` cryptarithm — you need "money" for the trip home.
- A combination-lock puzzle (3-digit code, no repeats → 720 permutations).
- "How many ways could the rooms you've passed be reordered?" — asks
  for the factorial as a "mathematical abbreviation" (n!).
- Nefertiti name-guess, Khufu's Egyptian-vs-Greek name trivia, Dürer's
  painting, composer-name riddle, candle-stub resource riddle
  ("how many hours of light from these stubs, 5 stubs → 1 new candle"),
  pyramid build-date multiple choice, count-the-triangles-in-a-figure.
- A dynamite room: identify a geometric shape correctly to blast
  through a wall (fail = "too weak a charge, try again").
- Ending: reach the treasure room, or run out of air and get mummified
  (there's a genuinely dark "Cheops regrets you never made it out, but
  arranges for..." → mummification game-over text).

## 3. Porting this to a modern version — suggestions

The design holds up well; what's dated is the delivery, not the
concept. A few things worth deciding before scaffolding a project:

- **Fidelity vs. reinterpretation**: reuse the room _types_ and
  pedagogical hints (all public-domain maths, safe to reuse in spirit)
  but write fresh problem text/numbers and new art instead of copying
  the PCX images or Swedish copy verbatim, since those are the parts
  actually owned by Alega/Hjalmarsson.
- **Content model**: almost every room is (prompt template + generator
  for the numbers + validator + hint text) — this maps cleanly onto a
  small JSON/YAML "room definition" schema, with a handful of custom
  components for the arcade rooms (Hanoi, Nim, Mastermind, Othello).
  That schema is the natural first artifact to build.
- **Platform**: a browser app (Canvas/SVG + a lightweight framework) is
  the closest modern analogue to the BGI-drawn rooms and gets you
  cross-platform for free; Godot is a good alternative if you want a
  standalone app with the same room-based structure and easy save
  files.

Happy to draft the room-schema and scaffold a project once you've
picked a stack — just say the word.
