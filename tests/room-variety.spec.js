import { test, expect } from '@playwright/test';

// These use the debug-only hook (window.__debug, active solely with
// ?debug=1 in the URL — see index.html) to jump straight to a room and read
// real internal state, rather than solving arbitrary worksheets to get
// there. Ordinary play never loads with that query param, so the hook is
// never present for real players.

const MINIGAME_TYPES = ['nim', 'mastermind', 'guess', 'minesweeper'];
const MINIGAME_SLOTS = [4, 9]; // chambers 5 and 10
const DRILL_SLOTS = [0, 1, 2, 3, 5, 6, 7, 8, 10]; // every other chamber before the finale (11)
const MINIGAME_ICONS = { nim: '🧱', mastermind: '🎯', guess: '🔢', minesweeper: '🧟' };
const MINIGAME_ACCENTS = { nim: '#9c6b2f', mastermind: '#6b3f8a', guess: '#2f8a7a', minesweeper: '#8a3f2f' };

async function roomAccent(page) {
  return page.evaluate(() =>
    getComputedStyle(document.getElementById('parchment')).getPropertyValue('--room-accent').trim()
  );
}

async function startWithDebug(page) {
  await page.goto('/?debug=1');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');
  await page.click('#introSkipBtn');
}

test('chambers 5 and 10 are always a mini-game, and never the same one twice in a row', async ({ page }) => {
  await startWithDebug(page);

  await page.evaluate((i) => window.__debug.loadRoom(i, { skipTimer: true }), MINIGAME_SLOTS[0]);
  const typeA = await page.evaluate(() => window.__debug.state.current && window.__debug.state.current.minigameType);
  expect(MINIGAME_TYPES).toContain(typeA);

  await page.evaluate((i) => window.__debug.loadRoom(i, { skipTimer: true }), MINIGAME_SLOTS[1]);
  const typeB = await page.evaluate(() => window.__debug.state.current && window.__debug.state.current.minigameType);
  expect(MINIGAME_TYPES).toContain(typeB);
  expect(typeB).not.toBe(typeA);
});

test('re-planning the map eventually surfaces all four mini-game types in chamber 5', async ({ page }) => {
  // Which mini-game each slot gets is now fixed once per run (planRooms()),
  // not re-rolled on every visit — so variety is sampled across many fresh
  // plans instead of many loads of the same chamber (see the "same room
  // twice" test below for the no-longer-re-rolls-on-revisit guarantee).
  await startWithDebug(page);
  const seen = await page.evaluate(
    ({ level, slot, types }) => {
      const dbg = window.__debug;
      const found = new Set();
      for (let i = 0; i < 40 && found.size < types.length; i++) {
        dbg.state.roomPlan = dbg.planRooms(level);
        found.add(dbg.state.roomPlan[slot]);
      }
      return [...found];
    },
    { level: 5, slot: MINIGAME_SLOTS[0], types: MINIGAME_TYPES }
  );
  expect(seen.sort()).toEqual([...MINIGAME_TYPES].sort());
});

test('falling back to an earlier chamber and climbing back up shows the same topic and mini-game again', async ({
  page
}) => {
  // The core of the fixed-map behavior: re-entering a chamber you've
  // already generated a topic/type for must not re-roll it — only the
  // numbers inside it re-roll.
  await startWithDebug(page);

  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), DRILL_SLOTS[0]);
  const topicFirst = await page.evaluate(() => window.__debug.state.set.topicName);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), DRILL_SLOTS[1]);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), DRILL_SLOTS[0]);
  const topicSecond = await page.evaluate(() => window.__debug.state.set.topicName);
  expect(topicSecond).toBe(topicFirst);

  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[0]);
  const mgFirst = await page.evaluate(() => window.__debug.state.current.minigameType);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[1]);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[0]);
  const mgSecond = await page.evaluate(() => window.__debug.state.current.minigameType);
  expect(mgSecond).toBe(mgFirst);
});

async function landOnMinigame(page, wanted) {
  let type;
  for (let i = 0; i < 40; i++) {
    // Re-plan the map each attempt — the mini-game type is now fixed per
    // chamber for the whole run, so sampling for variety means sampling
    // across plans, not repeated visits to the same fixed chamber.
    await page.evaluate((level) => {
      window.__debug.state.roomPlan = window.__debug.planRooms(level);
    }, 5);
    await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[0]);
    type = await page.evaluate(() => window.__debug.state.current.minigameType);
    if (type === wanted) return true;
  }
  return false;
}

test('nim: shows three piles of clickable bricks, and clicking one removes it plus everything above', async ({
  page
}) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'nim')), 'nim did not come up in the sample of attempts');

  const piles = page.locator('.nim-pile');
  await expect(piles).toHaveCount(3);

  const sizeBefore = await page.evaluate(() => window.__debug.state.nimState.piles[0]);
  const bricks = piles.nth(0).locator('.nim-brick');
  await expect(bricks).toHaveCount(sizeBefore);

  // Click the top brick (highest data-level = last brick added on top) to
  // take exactly one brick from the pile.
  await bricks.first().click();
  await page.waitForTimeout(500); // removal animation

  const sizeAfter = await page.evaluate(() => window.__debug.state.nimState.piles[0]);
  expect(sizeAfter).toBe(sizeBefore - 1);
  await expect(piles.nth(0).locator('.nim-pile-count')).toHaveText(String(sizeAfter));
});

test('nim: the rival replies with a legal move after the player takes bricks', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'nim')), 'nim did not come up in the sample of attempts');

  const totalBefore = await page.evaluate(() => window.__debug.state.nimState.piles.reduce((a, b) => a + b, 0));
  await page.locator('.nim-pile').nth(0).locator('.nim-brick').first().click();
  // Chain: 320ms removal animation, then a 600ms "thinking" pause, then the
  // rival's own 320ms removal animation before the state actually updates.
  await page.waitForTimeout(1800);

  const ns = await page.evaluate(() => window.__debug.state.nimState);
  const totalAfter = ns.piles.reduce((a, b) => a + b, 0);
  // At least two bricks gone (one from the player, one-plus from the rival).
  expect(totalAfter).toBeLessThanOrEqual(totalBefore - 2);
  // Once the rival's reply lands, the board unlocks for the player's next
  // move — unless that reply already ended the room.
  if (!ns.over) expect(ns.locked).toBe(false);
});

test('nim: an optimal move always leaves an even nim-sum (or the misère odd-ones endgame) so the AI plays correctly', async ({
  page
}) => {
  // Exercises nimBestMove directly across many random pile configurations —
  // a cheap way to sanity-check the misère-Nim strategy without playing out
  // full games. A position with 2+ "big" (>=2) piles should always have a
  // move to nim-sum 0 when one exists; the endgame (<=1 big pile) should
  // always resolve to a single well-defined move.
  await startWithDebug(page);
  const failures = await page.evaluate(() => {
    const bad = [];
    for (let trial = 0; trial < 500; trial++) {
      const piles = [Math.floor(Math.random() * 8), Math.floor(Math.random() * 8), Math.floor(Math.random() * 8)];
      const total = piles.reduce((a, b) => a + b, 0);
      if (total === 0) continue;
      const move = window.__debug.nimBestMove(piles);
      if (!move) {
        bad.push({ piles, reason: 'no move returned' });
        continue;
      }
      if (move.remove < 1 || move.remove > piles[move.pile]) {
        bad.push({ piles, move, reason: 'illegal move' });
      }
    }
    return bad;
  });
  expect(failures).toEqual([]);
});

test('minesweeper: the opening click is always safe, and reveals adjacent-mummy counts', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'minesweeper')), 'minesweeper did not come up in the sample of attempts');

  const cells = page.locator('.ms-cell');
  await expect(cells).toHaveCount(100);

  // Mines are placed lazily, excluding the clicked tile and its neighbors,
  // specifically so the first click can never be an instant loss.
  await cells.nth(0).click();
  await expect(cells.nth(0)).toHaveClass(/revealed/);
  await expect(page.locator('#feedbackText')).toHaveText('');
});

test('minesweeper: flag mode marks a tile without revealing it, and the mummy counter updates', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'minesweeper')), 'minesweeper did not come up in the sample of attempts');

  const cells = page.locator('.ms-cell');
  await cells.nth(0).click(); // seeds the mine layout
  const mineIndex = await page.evaluate(() => window.__debug.state.msState.mines.findIndex((m) => m));

  const counterBefore = await page.locator('.ms-counter').textContent();
  await page.click('.ms-flag-btn');
  await cells.nth(mineIndex).click();
  await expect(cells.nth(mineIndex)).toHaveText('🚩');
  const counterAfter = await page.locator('.ms-counter').textContent();
  expect(counterAfter).not.toBe(counterBefore);

  // Flagged tiles are protected from an accidental reveal even after
  // switching flag mode back off.
  await page.click('.ms-flag-btn');
  await cells.nth(mineIndex).click();
  await expect(cells.nth(mineIndex)).not.toHaveClass(/revealed/);
});

test('minesweeper: clicking a mummy sends you back a chamber', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'minesweeper')), 'minesweeper did not come up in the sample of attempts');

  const cells = page.locator('.ms-cell');
  await cells.nth(0).click(); // seeds the mine layout, safely
  const mineIndex = await page.evaluate(() => window.__debug.state.msState.mines.findIndex((m) => m));

  await cells.nth(mineIndex).click();
  await expect(page.locator('#feedbackText')).not.toHaveText('');
  await page.waitForTimeout(1000); // onFail's hand-off delay
  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 4 / 12'); // fell back from chamber 5
});

test('the guessing room gives too-high/too-low feedback, visible in a growing history', async ({ page }) => {
  // Regression test: #mmHistory's stylesheet rule is `display:none` by
  // default, so the old `els.mmHistory.style.display = ''` reset never
  // actually revealed it — it just cleared the inline override and fell
  // straight back to the CSS default. Guesses were recorded correctly but
  // the whole history (and so every guess's too-high/too-low answer)
  // stayed invisible. Must be an explicit 'block', not ''.
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'guess')), 'the guessing room did not come up in the sample of attempts');

  const history = page.locator('#mmHistory');
  await expect(history).toBeVisible();

  await page.fill('#answerInput', '1');
  await page.click('#submitBtn');
  await expect(history.locator('.mm-row')).toHaveCount(1);
  await expect(history.locator('.mm-row').first()).toBeVisible();
  await expect(history.locator('.mm-row').first()).toContainText(/too low|correct!/);

  await page.fill('#answerInput', '2');
  await page.click('#submitBtn');
  // Earlier guesses stay in the history rather than being replaced.
  await expect(history.locator('.mm-row')).toHaveCount(2);
  await expect(history.locator('.mm-row').first()).toContainText('Guess 1');
  await expect(history.locator('.mm-row').nth(1)).toContainText('Guess 2');
});

test('mastermind guesses are also visible in a growing history', async ({ page }) => {
  // Same #mmHistory element and bug as the guessing room above.
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'mastermind')), 'mastermind did not come up in the sample of attempts');

  const history = page.locator('#mmHistory');
  await expect(history).toBeVisible();

  await page.fill('#answerInput', '012');
  await page.click('#submitBtn');
  await expect(history.locator('.mm-row')).toHaveCount(1);
  await expect(history.locator('.mm-row').first()).toBeVisible();
  await expect(history.locator('.mm-row').first()).toContainText(/exact/);
});

test('the worksheet still answers correctly right after a Nim/Minesweeper chamber', async ({ page }) => {
  // Regression test: Nim and Minesweeper are the two mini-game types whose
  // checkAnswer() short-circuits (they're played via their own on-screen
  // controls, not the shared input). state.current used to only ever be
  // *set* when entering one of those rooms, never cleared afterward — so
  // the next room, even a plain worksheet, would inherit its stale
  // minigameType and silently swallow every Enter press and Answer click.
  await startWithDebug(page);
  const landed = (await landOnMinigame(page, 'nim')) || (await landOnMinigame(page, 'minesweeper'));
  test.skip(!landed, 'neither Nim nor minesweeper came up in the sample of attempts');

  const roomAfter = MINIGAME_SLOTS[0] + 1;
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), roomAfter);

  const currentAfter = await page.evaluate(() => window.__debug.state.current);
  expect(currentAfter).toBeNull();

  // And the answer control itself must actually still work, not just the
  // internal state — if it's a worksheet room, answering should register.
  if (await page.locator('#worksheet').isVisible()) {
    await page.fill('#answerInput', '0');
    await page.locator('#answerInput').press('Enter');
    await expect(page.locator('#wsSlot-0')).not.toHaveClass(/placeholder/);
  }
});

test('drill topics never repeat within the last 4 chambers', async ({ page }) => {
  // Topics are decided once, for the whole map, when the run starts (see
  // engine/room-plan.js) — the no-repeat rule is enforced then, not as the
  // player reaches each chamber, so this reads the plan directly rather
  // than walking through loadRoom() for every slot.
  await startWithDebug(page);

  const drillTopics = await page.evaluate((slots) => slots.map((i) => window.__debug.state.roomPlan[i]), DRILL_SLOTS);
  expect(drillTopics.length).toBe(DRILL_SLOTS.length);
  for (let i = 0; i < drillTopics.length; i++) {
    const window4 = drillTopics.slice(Math.max(0, i - 3), i + 1);
    expect(new Set(window4).size).toBe(window4.length);
  }
});

test('a worksheet/trial chamber never shows the same problem twice at any difficulty', async ({ page }) => {
  // Regression test: build()/buildSet() draw each item independently, so
  // nothing stopped e.g. two identical "7 + 5 =" additions landing in the
  // same 10-question chamber. buildDrillSet and the trial buildSet loops
  // now re-roll (via uniqueDraw) until each item's visible text is new
  // within that chamber.
  await startWithDebug(page);

  const failures = await page.evaluate(() => {
    const dbg = window.__debug;
    const drillSlots = [0, 1, 2, 3, 5, 6, 7, 8, 10];
    const found = [];
    for (let level = 1; level <= 10; level++) {
      dbg.state.level = level;
      // Re-plan for this level — topics are level-appropriate at plan time,
      // not re-picked per visit, so a stale plan from a different level
      // would silently narrow which topics this loop ever touches.
      dbg.state.roomPlan = dbg.planRooms(level);
      for (let i = 0; i < 30; i++) {
        dbg.loadRoom(drillSlots[i % drillSlots.length], { skipTimer: true });
        const set = dbg.state.set;
        if (!set || set.topicName === 'The Geometry Vault') continue; // shapes are shuffled distinct, not text-differentiated
        const seen = new Set();
        for (const item of set.items) {
          const label = item.label || item.prompt;
          if (seen.has(label)) found.push({ level, topic: set.topicName, label });
          seen.add(label);
        }
      }
    }
    return found;
  });

  expect(failures).toEqual([]);
});

test('clearing a mini-game chamber shows a "You won!" banner, then transitions to the next chamber', async ({
  page
}) => {
  await startWithDebug(page);
  await page.evaluate((i) => window.__debug.loadRoom(i, { skipTimer: true }), MINIGAME_SLOTS[0]);

  await page.evaluate(() => window.__debug.onSuccess());
  await expect(page.locator('#roomClearBanner')).toHaveClass(/show/);
  await expect(page.locator('#roomClearText')).toHaveText('You won! 🎉');

  // The banner fades, the stage hands off, and the next chamber loads.
  await page.waitForTimeout(1500);
  await expect(page.locator('#roomClearBanner')).not.toHaveClass(/show/);
  await expect(page.locator('#roomIndexLabel')).toContainText(`CHAMBER ${MINIGAME_SLOTS[0] + 2} / 12`);
});

test('clearing a worksheet/trial chamber shows a "You did it!" banner, then transitions to the next chamber', async ({
  page
}) => {
  await startWithDebug(page);
  await page.evaluate((i) => window.__debug.loadRoom(i, { skipTimer: true }), DRILL_SLOTS[0]);

  await page.evaluate(() => window.__debug.advanceRoom());
  await expect(page.locator('#roomClearBanner')).toHaveClass(/show/);
  await expect(page.locator('#roomClearText')).toHaveText('You did it!');

  await page.waitForTimeout(1500);
  await expect(page.locator('#roomClearBanner')).not.toHaveClass(/show/);
  await expect(page.locator('#roomIndexLabel')).toContainText(`CHAMBER ${DRILL_SLOTS[0] + 2} / 12`);
});

test('a perfect worksheet skips the "Flawless!" confirmation screen and celebrates immediately', async ({ page }) => {
  await startWithDebug(page);
  await page.evaluate((i) => window.__debug.loadRoom(i, { skipTimer: true }), DRILL_SLOTS[0]);

  // Fake a perfect sheet (every row already marked correct) without having
  // to solve 10 real problems, and finalize it exactly as the last correct
  // answer's own handler would.
  await page.evaluate(() => {
    const set = window.__debug.state.set;
    set.results = new Array(set.items.length).fill('correct');
    window.__debug.finalizeSet(false);
  });

  // Straight to the room-clear banner — never the old static "Flawless —
  // the way opens!" screen with its own separate Continue button.
  await expect(page.locator('#roomClearBanner')).toHaveClass(/show/);
  await expect(page.locator('#roomClearText')).toHaveText('You did it!');
  await expect(page.locator('#promptText')).not.toHaveText('Flawless — the way opens!');
  await expect(page.locator('#setContinueBtn')).toBeHidden();

  // ...and it still advances on its own a moment later, same as before.
  await page.waitForTimeout(1500);
  await expect(page.locator('#roomIndexLabel')).toContainText(`CHAMBER ${DRILL_SLOTS[0] + 2} / 12`);
});

test('a click during the "You did it!" banner skips the linger and advances right away', async ({ page }) => {
  await startWithDebug(page);
  await page.evaluate((i) => window.__debug.loadRoom(i, { skipTimer: true }), DRILL_SLOTS[0]);

  await page.evaluate(() => {
    const set = window.__debug.state.set;
    set.results = new Array(set.items.length).fill('correct');
    window.__debug.finalizeSet(false);
  });
  await expect(page.locator('#roomClearBanner')).toHaveClass(/show/);

  // The banner normally lingers ~1s before advancing on its own — clicking
  // anywhere well before that should fast-forward straight to the fade-out
  // instead of waiting the rest of it out.
  await page.waitForTimeout(150);
  await page.mouse.click(10, 10);
  await expect(page.locator('#roomIndexLabel')).toContainText(`CHAMBER ${DRILL_SLOTS[0] + 2} / 12`, {
    timeout: 900
  });
});

test('each mini-game chamber gets its own icon and accent color', async ({ page }) => {
  await startWithDebug(page);
  for (const type of MINIGAME_TYPES) {
    expect(await landOnMinigame(page, type)).toBe(true);
    await expect(page.locator('#roomNameLabel')).toContainText(MINIGAME_ICONS[type]);
    expect(await roomAccent(page)).toBe(MINIGAME_ACCENTS[type]);
  }
});

test('the finale chamber gets its own icon and accent color, distinct from the mini-games', async ({ page }) => {
  await startWithDebug(page);
  await page.evaluate(() => window.__debug.loadRoom(11, { skipTimer: true }));
  await expect(page.locator('#roomNameLabel')).toContainText('🏺');
  expect(await roomAccent(page)).toBe('#c9a227');
  expect(Object.values(MINIGAME_ACCENTS)).not.toContain(await roomAccent(page));
});

test('a drill chamber shows a room-type icon before its topic name', async ({ page }) => {
  await startWithDebug(page);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), DRILL_SLOTS[0]);
  const name = (await page.locator('#roomNameLabel').textContent()).trim();
  expect(name.length).toBeGreaterThan(0);
  // Every drill/trial topic name is prefixed with an emoji icon (a generic
  // scroll for worksheets, or the trial room's own charge icon).
  expect(/^\p{Extended_Pictographic}/u.test(name)).toBe(true);
});

test('grade 1 mixes addition and subtraction rooms instead of always addition', async ({ page }) => {
  // Regression test: grade 1's topic pool used to be "The Threshold" (a
  // coinflip between + and -) and "The Coin Chest" (always addition), so a
  // player could easily land on several addition-only chambers in a row
  // with no dedicated subtraction room ever appearing.
  await startWithDebug(page);
  const result = await page.evaluate(() => {
    const dbg = window.__debug;
    dbg.state.level = 1;
    let sawSubtraction = false;
    const topics = new Set();
    for (let i = 0; i < 40; i++) {
      // Chamber 0's topic is now fixed per run — re-plan each attempt to
      // sample across what it *could* be, the same way repeated loadRoom()
      // calls on the same chamber used to.
      dbg.state.roomPlan = dbg.planRooms(1);
      dbg.loadRoom(0, { skipTimer: true });
      const set = dbg.state.set;
      topics.add(set.topicName);
      if (set.items.some((it) => it.label && it.label.includes('−'))) sawSubtraction = true;
    }
    return { sawSubtraction, topicCount: topics.size };
  });

  expect(result.sawSubtraction).toBe(true);
  expect(result.topicCount).toBeGreaterThan(1);
});

test('the subtraction room rarely (under 5%) allows a negative answer', async ({ page }) => {
  await startWithDebug(page);
  const stats = await page.evaluate(() => {
    const dbg = window.__debug;
    dbg.state.level = 1;
    let total = 0;
    let negative = 0;
    for (let i = 0; i < 400; i++) {
      dbg.state.roomPlan = dbg.planRooms(1);
      dbg.loadRoom(0, { skipTimer: true });
      const set = dbg.state.set;
      if (set.topicName !== 'The Subtraction Room') continue;
      for (const item of set.items) {
        total++;
        if (item.hint.includes('negative')) negative++;
      }
    }
    return { total, negative, ratio: total ? negative / total : null };
  });

  expect(stats.total).toBeGreaterThan(0);
  expect(stats.ratio).toBeLessThan(0.05);
});

test('minesweeper auto-completes once every mummy has been flagged', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'minesweeper')), 'minesweeper did not come up in the sample of attempts');

  await page.locator('.ms-cell').first().click(); // seeds the mine layout, safely
  const mineIndices = await page.evaluate(() =>
    window.__debug.state.msState.mines.map((m, i) => (m ? i : -1)).filter((i) => i >= 0)
  );

  await page.click('.ms-flag-btn');
  const cells = page.locator('.ms-cell');
  for (const idx of mineIndices) {
    await cells.nth(idx).click();
  }

  // Flagging the last mummy should clear the room outright — no need to
  // also individually reveal every remaining safe tile.
  await expect(page.locator('#feedbackText')).not.toHaveText('');
  expect(await page.evaluate(() => window.__debug.state.msState.over)).toBe(true);
});

async function loadCoordinateGrid(page) {
  // Force this specific topic via the (now per-run-planned) map, rather
  // than retrying loadRoom() until it randomly comes up.
  await page.evaluate((idx) => {
    window.__debug.state.roomPlan[idx] = 'coordinates';
    window.__debug.loadRoom(idx, { skipTimer: true });
  }, DRILL_SLOTS[0]);
}

test('the Coordinate Grid is marked with arrow keys/clicks, not typed', async ({ page }) => {
  // Regression test: the prompt used to literally spell out "(x, y)" and
  // check() just parsed whatever text was typed — so the room could be
  // solved by copying the numbers straight out of its own prompt, with no
  // actual marking involved. The answer now comes from an internal cursor,
  // moved via arrow keys or a canvas click, and the shared input is
  // read-only so typing can no longer stand in for it.
  await startWithDebug(page);
  await loadCoordinateGrid(page);

  expect(await page.locator('#answerInput').evaluate((el) => el.readOnly)).toBe(true);
  expect(await page.evaluate(() => window.__debug.state.set.items[0].cursor)).toEqual({ x: 0, y: 0 });
  await expect(page.locator('#answerInput')).toHaveValue('0,0');

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  expect(await page.evaluate(() => window.__debug.state.set.items[0].cursor)).toEqual({ x: 2, y: 1 });
  await expect(page.locator('#answerInput')).toHaveValue('2,1');
});

test('the Coordinate Grid can be marked by clicking/tapping the grid directly', async ({ page }) => {
  await startWithDebug(page); // level defaults to 5 -> tier 2 -> range 5 (see rooms/coordinate-grid.js)
  await loadCoordinateGrid(page);

  // Compute the exact viewport pixel for a chosen grid point, replicating
  // drawCoordGrid/coordGridPixelToGrid's own geometry (fx/fy/fw/fh, the
  // safeH-above-the-parchment carve-out, cell size), so the click lands
  // precisely rather than hoping a guessed position falls inside the grid.
  const targetGrid = { x: 2, y: -1 };
  const clickPoint = await page.evaluate((target) => {
    const canvas = document.getElementById('scene');
    const parchment = document.getElementById('parchment');
    const canvasRect = canvas.getBoundingClientRect();
    const parchRect = parchment.getBoundingClientRect();
    let frac = (parchRect.top - canvasRect.top) / canvasRect.height;
    if (!isFinite(frac) || frac < 0.15) frac = 0.45;
    const safeH = canvas.height * Math.min(frac, 0.95);
    const range = 5;
    const fx = canvas.width * 0.12,
      fy = safeH * 0.06,
      fw = canvas.width * 0.76,
      fh = safeH * 0.88;
    const cx = fx + fw / 2,
      cy = fy + fh / 2;
    const cells = range * 2,
      cellW = fw / cells,
      cellH = fh / cells;
    const px = cx + target.x * cellW,
      py = cy - target.y * cellH;
    const scaleX = canvasRect.width / canvas.width,
      scaleY = canvasRect.height / canvas.height;
    return { x: canvasRect.left + px * scaleX, y: canvasRect.top + py * scaleY };
  }, targetGrid);

  await page.mouse.click(clickPoint.x, clickPoint.y);

  const cursor = await page.evaluate(() => window.__debug.state.set.items[0].cursor);
  expect(cursor).toEqual(targetGrid);
  await expect(page.locator('#answerInput')).toHaveValue(`${targetGrid.x},${targetGrid.y}`);
});

test('the Coordinate Grid grades whatever the cursor is on when confirmed, not stale typed text', async ({ page }) => {
  await startWithDebug(page);
  await loadCoordinateGrid(page);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const cursorBeforeSubmit = await page.evaluate(() => window.__debug.state.set.items[0].cursor);

  await page.locator('#answerInput').press('Enter');

  const markedPoint = await page.evaluate(() => window.__debug.state.set.items[0].markedPoint);
  expect(markedPoint.x).toBe(cursorBeforeSubmit.x);
  expect(markedPoint.y).toBe(cursorBeforeSubmit.y);
});

test('the Mason’s Corridor (Pythagoras) is now a 5-item visual trial, not a 10-item worksheet', async ({ page }) => {
  // Regression test: this room used to be a plain build/text/check
  // worksheet (10 typed problems, no diagram) — it's now a visual trial
  // room like the Triangular Seal, with each item drawing its own
  // right-triangle-plus-squares diagram on the shared canvas.
  await startWithDebug(page);
  await page.evaluate((idx) => {
    window.__debug.state.roomPlan[idx] = 'pythagoras';
    window.__debug.loadRoom(idx, { skipTimer: true });
  }, DRILL_SLOTS[0]);

  await expect(page.locator('#worksheet')).toBeHidden();
  await expect(page.locator('.trial-charge')).toHaveCount(5);

  const canvasBox = await page.locator('#scene').boundingBox();
  expect(canvasBox.height).toBeGreaterThan(100);
  const hasContent = await page.evaluate(() => {
    const c = document.getElementById('scene');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0 && data[i - 1] > 40) return true;
    return false;
  });
  expect(hasContent).toBe(true);

  // Answering still works through the ordinary typed-number input (unlike
  // the Coordinate Grid, the value here genuinely has to be computed from
  // what's drawn, so typing it in isn't a shortcut around anything).
  expect(await page.locator('#answerInput').evaluate((el) => el.readOnly)).toBe(false);
  await page.fill('#answerInput', '5');
  await page.locator('#answerInput').press('Enter');
  await expect(page.locator('#feedbackText')).not.toHaveText('');
  expect(await page.evaluate(() => window.__debug.state.set.items[0].revealed)).toBe(true);
});

test('the air clock is one continuous budget across the whole run, never reset per chamber', async ({ page }) => {
  // Regression test for the hourglass's new fiction: it's the climb's
  // shared breathable air (TOTAL_ROOMS x 4 minutes), not a per-chamber
  // timer — loadRoom() must never touch it.
  await startWithDebug(page);
  const airTotal = await page.evaluate(() => window.__debug.state.airTotal);
  expect(airTotal).toBe(12 * 240);

  // startWithDebug() plays through the real setup/intro flow, which starts
  // the real tick (no skipTimer there) — pause it before hand-setting
  // airLeft, or the background interval can decrement it by the time the
  // assertions below run, making this flaky.
  await page.evaluate(() => {
    window.__debug.pauseTick();
    window.__debug.state.airLeft = 100; // simulate having already spent most of the budget
  });
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), DRILL_SLOTS[0]);
  expect(await page.evaluate(() => window.__debug.state.airLeft)).toBe(100);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), DRILL_SLOTS[1]);
  expect(await page.evaluate(() => window.__debug.state.airLeft)).toBe(100);
});

test('only the estimation room shows the hourglass, and it is fixed at 4 minutes regardless of level', async ({
  page
}) => {
  await startWithDebug(page);

  await page.evaluate((idx) => {
    window.__debug.state.roomPlan[idx] = 'coins';
    window.__debug.loadRoom(idx, { skipTimer: true });
  }, DRILL_SLOTS[0]);
  expect(await page.evaluate(() => window.__debug.state.roomTimeTotal)).toBe(0);
  await expect(page.locator('#hourglass')).toBeHidden();

  for (const level of [1, 5, 10]) {
    await page.evaluate((lvl) => {
      window.__debug.state.level = lvl;
    }, level);
    await page.evaluate((idx) => {
      window.__debug.state.roomPlan[idx] = 'estimation';
      window.__debug.loadRoom(idx, { skipTimer: true });
    }, DRILL_SLOTS[0]);
    expect(await page.evaluate(() => window.__debug.state.roomTimeTotal)).toBe(240);
    await expect(page.locator('#hourglass')).toBeVisible();
  }
});

test("the estimation room's own hourglass sends the player back a chamber if it runs out, without ending the game", async ({
  page
}) => {
  await startWithDebug(page);
  await page.evaluate((idx) => {
    window.__debug.state.roomPlan[idx] = 'estimation';
    window.__debug.loadRoom(idx, {}); // real tick running, not skipped
  }, DRILL_SLOTS[1]);

  const airBefore = await page.evaluate(() => window.__debug.state.airLeft);
  await page.evaluate(() => {
    window.__debug.state.roomTimeLeft = 1; // about to run out on the next tick
  });
  await page.waitForTimeout(1300);

  // Running out only shows the fail screen — the game doesn't end, and the
  // player doesn't move until they acknowledge it via Continue.
  await expect(page.locator('#endOverlay')).not.toHaveClass(/show/);
  await expect(page.locator('#setContinueBtn')).toBeVisible();

  await page.click('#setContinueBtn');
  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 1 / 12'); // fell back from chamber 2
  // The air clock keeps draining through the fail screen and the fall-back
  // — the estimation timeout doesn't pause it.
  const airAfter = await page.evaluate(() => window.__debug.state.airLeft);
  expect(airAfter).toBeLessThan(airBefore);
});

test('running out of air ends the game (mummified), regardless of which chamber the player is in', async ({ page }) => {
  await startWithDebug(page);
  await page.evaluate((idx) => window.__debug.loadRoom(idx, {}), DRILL_SLOTS[0]); // real tick running
  await page.evaluate(() => {
    window.__debug.state.airLeft = 1; // about to run out on the next tick
  });
  await page.waitForTimeout(1300);

  await expect(page.locator('#endOverlay')).toHaveClass(/show/);
  await expect(page.locator('#endOverlay')).toHaveClass(/mummy/);
});
