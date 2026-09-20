# Pyramid Reckoning — Design Rules

Living list of UI/layout principles for this project, added as they come
up. Not a style guide for colors/typography (the torch-lit palette in
`src/styles/base.css` already covers that) — this is about layout
behavior: what a screen must never do, regardless of how it's themed.

## No layout should require scrolling to reach its primary content or action

A screen's title, main content, and its primary button/action must all be
visible without the player needing to discover and use a scrollbar. If a
screen's content can vary in length or size (translated text, a
canvas illustration, a growing list), only the _secondary_, skippable part
should ever scroll — never the button the player actually needs to press
next.

**Why:** a cut-off action isn't just ugly, it's a dead end — the player
has no visual cue that anything exists below the fold, especially in
embedded/short viewports (a squished iframe, a landscape phone, a
side-by-side tablet split) where "just resize the window" isn't an option.

**How this is done elsewhere in the codebase** (follow this pattern for
new overlays): the Rules and Map overlays wrap their variable-length
content in `.overlay-body` (`flex:1 1 auto; min-height:0; overflow:auto;`)
and keep their heading and Close button outside it, marked `flex:none` so
they're pinned and always visible. The win/lose overlay (`#endOverlay`)
follows the same pattern via `.end-scroll` — the illustration, title, and
body text can scroll internally on a short viewport, but the restart
button never does.

**Caught by:** the win screen's restart button getting clipped below the
visible area once `winBody()` grew a second sentence (the "try the next
level" nudge) — the illustration + longer text + button no longer fit a
short viewport, and `.end-body` had no internal scroll region, no
`min-height:0` on its flex ancestors, and no `flex:none` pinning the
button — so the whole overlay silently relied on scroll gone unnoticed.
Fixed by giving the canvas a `max-height` safety cap _and_ wrapping the
scrollable part separately from the pinned button, so scrolling is a
fallback for extreme cases, not the primary way to reach "Climb again".

**A narrow text column wastes width the viewport already has.** A second
pass on the same overlay: even with the button safely pinned outside the
scroll region, the lose screen's body paragraph (`.end-body p`) still
needed to scroll to be read at all on a wide-but-short window (900×500) —
not because the overlay lacked room, but because `max-width:42ch` forced
a long sentence into 5 narrow lines when the overlay was hundreds of
pixels wider than that. Widening it to `60ch` let the same text wrap into
3 lines instead, and the whole message fit with no scrolling needed.
Lesson: when a block of translated (often longer-than-English) text is
scrolling on a short-but-wide viewport, check whether it's actually out
of _vertical_ room, or just artificially narrow — a wider text column can
remove the need to scroll at all, which beats making the scroll region
merely reachable.
