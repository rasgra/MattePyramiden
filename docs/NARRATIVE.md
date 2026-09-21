# Pyramid Reckoning — Narrative Notes

Working document, not shipped copy. Purpose: pin down the story as it's
_actually written_ right now (quoted verbatim from `src/i18n/strings.js`),
flag where recent mechanical changes have pulled the fiction out of sync
with itself, and settle on a direction before the text gets rewritten to
match. Once the open questions below are answered, the "then adjust the
game" pass edits `src/i18n/strings.js` (and any UI text it touches) to
match whatever's decided here.

> **Status: resolved and implemented.** §5's two questions were answered
> as Option 1 in both cases — lean into climbing, and mention the air
> supply up front with the existing shared "mummified" lose ending kept
> as-is (no second variant). §1's quotes below are the _pre-resolution_
> text, kept for the record; the actual current copy lives in
> `src/i18n/strings.js` — `subtitle`, `footer`, `settingsHeading`, `begin`,
> `rulesBodyDrill`, and `rulesBodyEstimation` were the ones that changed.
> Nothing in §2 (cast/motifs) or §4 (room roster) needed touching.
>
> **Follow-up, resolved and implemented:** §3.2's two-resource tension is
> gone — torches were removed as a mechanic entirely rather than
> reconciled with air. Running out of air is now the _only_ way to lose;
> every other failure (an imperfect drill sheet, a lost mini-game, the
> estimation room's hourglass expiring) simply sends the player back one
> chamber, with no life total ticking down alongside it. §2's "Torches"
> entry and §3.2 below are kept for the record but no longer describe the
> shipped game. The letter's "the stone lifts you higher" line was also
> reworded to "you can climb to the next chamber!" — same climbing
> metaphor, less poetic indirection.
>
> **Second follow-up, resolved and implemented:** the intro used to cut
> straight from "pitch-black corridor" to "here's a letter" with no
> explanation of how the player could suddenly read it in the dark. A new
> beat now sits between them: a faint light ahead turns out to be an old,
> still-burning oil lamp sitting next to the note — which is also what
> lights the letter beat now (the candle emoji next to the parchment was
> swapped for an oil lamp to match). Each of the intro's non-letter beats
> also got its own small canvas illustration this pass (the hieroglyph
> wall, the pitch-black corridor, the lamp discovery, the sand-filled
> shaft) — see `showIntroScene()`/`INTRO_SCENES` in
> `src/engine/canvas-scene.js`.
>
> Also implemented, unrelated to the fiction: a worksheet/trial chamber
> now ends the attempt (and sends the player back a chamber) after 3
> wrong answers total, rather than allowing a row to be retried
> indefinitely — see `MAX_WRONG_ANSWERS` in `src/engine/constants.js`.

## 1. The story as currently told (as of when this doc was written)

**Frame.** A sightseeing tour of Khufu's (Cheops') pyramid. The player
lingers too long over the hieroglyphs; the group moves on without them.

> _"A moment too long over the hieroglyphs on the wall — and the tour has
> already turned the corner without you."_
> _"You feel your way forward down a corridor gone pitch-black, the
> group's voices already swallowed by the stone."_
> _(a letter, found next)_
> _"Far above, sand has begun hissing into a shaft. Twelve chambers stand
> between you and the way out."_

**The letter** (found mid-intro, presumably left by an earlier, less
fortunate visitor, signed "— Cheops"):

> _"Whoever finds this is trapped here, same as you. Every chamber hides a
> problem of mathematics — solve it, and the stone lifts you higher. Miss
> it, and you fall back a step."_

**The goal**, per the setup screen and subtitle: reach Khufu's hoard
through twelve chambers, each a themed set of ten problems (or a mini-game
in chambers 5 and 10, or the finale riddle in chamber 12).

**The call to action** on the setup screen literally says _"Descend into
the pyramid"_ ("Kliv ner i pyramiden" — lit. "step down into the
pyramid"), and the intro's last line is _"Enter the pyramid."_

**Win**: _"You reach the treasury"_ — praise, gold, faience beads, and (as
of this session) a nudge to try a harder difficulty next.

**Lose**: torches run out (or, as of this session, air runs out — see §3).
Cheops appears, apologizes, and promises to have the player "properly
mummified and wrapped" to "rest here in the dark for eternity, in fine
company" (a wink at the sleeping-mummy motif in the Minesweeper room and
the mummy illustration on the loss screen).

**The map** shows all twelve chambers as a pyramid silhouette. It's opened
via a "Karta"/"Map" button mid-run.

## 2. Cast & recurring motifs

- **Cheops** — never directly present as a character in-room, but narrates
  the letter and both endings. Comes across as detached and darkly droll
  rather than menacing (mummification offered almost as a courtesy).
- **The tour group** — mentioned once (intro beat 2), never referenced
  again. A device to strand the player, not a returning element.
- **Sleeping mummies** — the Minesweeper room's "mines." Also who you'll
  be keeping company as, per the loss ending. The one other named
  inhabitant of the pyramid besides Cheops.
- **Torches** — the player's light and lives (3, shown burning in the
  HUD). Losing one is the standard "wrong answer" consequence across
  almost every room type.
- **The hourglass / air** — added this session; see §3, it's the one
  piece that doesn't yet have a story reason to exist.
- **Treasure imagery** — a chest, scattered coins, a shaft of sunlight
  through a wall breach (the win-screen illustration). Never described in
  the text itself beyond "gold, faience beads."

## 3. Where the fiction and the mechanics have drifted apart

These are things that were internally consistent (or at least
unexamined) before this session's changes, and now audibly clash. None of
them are "bugs" exactly — they're open story questions the mechanical
work surfaced.

### 3.1 Descending vs. climbing (the big one)

- The frame narrative, the setup screen's button ("Descend into the
  pyramid"), and the intro's closing line ("Enter the pyramid") all say
  the player is going **down and in**.
- But the letter already said the opposite before this session touched
  anything: _"solve it, and the stone lifts you **higher**. Miss it, and
  you fall **back a step**."_ Climbing language, not descending language.
  The Rules panel matches the letter: _"climbing upward requires a
  perfect sheet."_
- This session's map change (chamber 1 now at the pyramid's base, the
  treasury at its apex, so the visible map fills in bottom-to-top) makes
  the _map_ agree with the letter and the rules text — and now
  disagree with "descend into the pyramid."

So there were already two competing metaphors in the original text
("you're descending overall" vs. "correct answers lift you up"); the map
change picked a side without the surrounding copy following it.

**Options:**

1. **Lean into climbing.** The player enters at ground level (base) and
   climbs internal chambers toward a treasury near the apex. Rewrite the
   "descend" framing: setup button, subtitle, the two intro beats that
   imply going down, `settingsHeading` ("Before you descend"). Keep the
   letter and rules text untouched — they already say this.
   _Recommended_ — it's the smaller rewrite (the letter/rules text is
   already climb-flavored, and only the entry-framing lines need to
   change), and it's arguably closer to how a "treasure at the top of a
   pyramid" story reads anyway.
2. **Revert to descending**, put chamber 1 back at the map's apex and the
   treasury back at its base, and rewrite the letter/rules text instead
   ("the stone lowers you deeper," "falling back" becomes "being pushed up
   a step"). Larger rewrite, and it undoes the map-direction change you
   asked for last turn — only worth it if the descent framing matters more
   to you than the climb one.
3. **Leave both as loose metaphor** and not worry about literal
   direction — plausible for a short flavor intro nobody re-reads closely,
   but the Rules panel and the map are both reference material a stuck
   player might actually open mid-game, so the mismatch is more likely to
   be _noticed_ there than in the intro.

### 3.2 Two survival resources: torches vs. air

- Torches were always the life/light total (3, shown burning).
- This session added a second, independent failure condition: a
  pyramid-wide air supply (48 minutes total, ticking continuously) that
  ends the game outright if it runs out — narratively "you suffocate,"
  mechanically identical to the lose ending torches already trigger.
- Nothing in the intro/subtitle mentions air at all yet. A first-time
  player has no story reason to know a persistent countdown is running
  the moment they start, only that torches are their lives.
- The two resources don't obviously interact narratively: torches expire
  from a _wrong answer_, air expires from _elapsed time regardless of
  performance_. Both currently lead to the exact same ending screen and
  Cheops line, which doesn't distinguish "you got it wrong" from "you
  suffocated," even though those are quite different causes of death.

**Options:**

1. Add one sentence to the subtitle/setup screen introducing the air
   supply, and leave the shared mummy ending as-is (simplest — one line of
   new copy, no branching).
2. As above, plus a _second_ lose-screen variant specifically for running
   out of air (different `loseTitle`/`loseBody`, still the same mummy
   illustration) — more narratively precise, more text to maintain in two
   languages.
3. Leave the subtitle alone and let the Rules panel be the only place air
   is explained (current state) — cheapest, but a player who never opens
   Rules genuinely won't know why the game suddenly ended.

_Recommended:_ Option 1 — the mummy ending's "sorry for your fate" phrasing
is already vague enough to cover either cause without sounding wrong, so a
second variant (Option 2) is polish rather than a fix; but leaving the
intro completely silent about a mechanic that can end the game (Option 3)
is the one choice worth avoiding.

### 3.3 The pyramid is now "pre-mapped"

Also from this session: which topic/mini-game each chamber holds is now
decided once, at the start of a run, instead of reshuffling every time a
chamber is revisited. Nothing in the fiction currently acknowledges this
either way — the pyramid was never described as _randomly rearranging
itself_ to begin with, so this is less a contradiction than a free
improvement: the existing "Karta"/Map button and the letter's "every
chamber hides a problem" already read fine as "the layout is fixed, you
just haven't seen all of it yet." No text change strictly required here —
flagging it only because it's the kind of detail worth confirming reads
as intended rather than assuming.

### 3.4 Already fixed this session, listed for the record

- Rules text used to say "the torch above times the whole worksheet" —
  fixed to credit the hourglass/air clock instead of the torches.
- The Coordinate Grid and Pythagoras rooms' _mechanics_ changed
  (marking a point instead of typing it; a visual triangle-and-squares
  diagram instead of a bare worksheet), but neither room's flavor text
  needed to change — both still work as-is.

## 4. Room roster (for reference — flavor is untouched by any of the above)

| Room                    | EN name               | Flavor                                      |
| ----------------------- | --------------------- | ------------------------------------------- |
| threshold               | The Threshold         | worn step, hundreds/tens/ones               |
| coins                   | The Coin Chest        | gold coins in each hand                     |
| subtraction             | The Subtraction Room  | grain sacks carried off                     |
| multiplication          | The Hall of Rows      | stone blocks in rows                        |
| estimation              | The Overseer's Tally  | a foreman wants a quick estimate            |
| sequence                | The Frieze of Numbers | numbers carved into a frieze                |
| percent                 | The Scale Chamber     | a merchant's scale                          |
| area                    | The Sloped Floor      | a triangular stone slab                     |
| angle                   | The Triangular Seal   | a stamped seal, angle-sum                   |
| equation                | The Equation Hall     | —                                           |
| base                    | The Binary Lock       | a lock that only reads binary/hex           |
| pythagoras              | The Mason's Corridor  | a ramp, base/height/hypotenuse in "cubits"  |
| quadratic               | The Hall of Two Doors | two identical doors, x²                     |
| geometry3d (trial)      | The Geometry Vault    | "the room has no door — blast your way out" |
| coordinates (trial)     | The Coordinate Grid   | "collect melons" on a grid                  |
| nim (mini-game)         | The Counting Wall     | three brick walls, misère Nim               |
| mastermind (mini-game)  | The Master Mind Room  | —                                           |
| guess (mini-game)       | The Guessing Room     | —                                           |
| minesweeper (mini-game) | The Mummy Field       | sleeping mummies under the tiles            |
| combo (finale)          | The Treasury Door     | a combination lock, final chamber           |

All read as self-contained "chamber" flavor and don't depend on the
descend/climb direction — no changes needed here under any option above.

## 5. Decisions needed before the text pass

1. **Direction** (§3.1): climb, descend-and-rewrite-the-letter, or leave
   loose?
2. **Air framing** (§3.2): mention it up front (pick a spot — subtitle vs.
   setup screen), and single shared lose ending or a second air-specific
   one?
3. Anything in §3.3/§3.4 you want called out differently than assumed
   above?

Once these are settled, the follow-up pass touches: `subtitle`,
`settingsHeading`/`settingsSub`, `begin` (setup button), `introBeats`,
`introEnter`, and — only if Option 2 direction or Option 2 air is
chosen — `loseTitle`/`loseBody`. Everything else in `strings.js` already
reads consistently with the recommended options above.
