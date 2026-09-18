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

test('cycling chamber 5 eventually surfaces all four mini-game types', async ({ page }) => {
  await startWithDebug(page);
  const seen = new Set();
  for (let i = 0; i < 40 && seen.size < MINIGAME_TYPES.length; i++) {
    await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[0]);
    seen.add(await page.evaluate(() => window.__debug.state.current.minigameType));
  }
  expect([...seen].sort()).toEqual([...MINIGAME_TYPES].sort());
});

async function landOnMinigame(page, wanted) {
  let type;
  for (let i = 0; i < 40; i++) {
    await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[0]);
    type = await page.evaluate(() => window.__debug.state.current.minigameType);
    if (type === wanted) return true;
  }
  return false;
}

test('minesweeper: the opening click is always safe, and reveals adjacent-mummy counts', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'minesweeper')), 'minesweeper did not come up in the sample of attempts');

  const cells = page.locator('.ms-cell');
  await expect(cells).toHaveCount(100);

  // Mines are placed lazily, excluding the clicked tile and its neighbors,
  // specifically so the first click can never be an instant loss.
  await cells.nth(0).click();
  await expect(cells.nth(0)).toHaveClass(/revealed/);
  await expect(page.locator('.torch-icon.out')).toHaveCount(0);
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

test('minesweeper: clicking a mummy burns a torch and sends you back a chamber', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'minesweeper')), 'minesweeper did not come up in the sample of attempts');

  const cells = page.locator('.ms-cell');
  await cells.nth(0).click(); // seeds the mine layout, safely
  const mineIndex = await page.evaluate(() => window.__debug.state.msState.mines.findIndex((m) => m));

  await cells.nth(mineIndex).click();
  await expect(page.locator('#feedbackText')).not.toHaveText('');
  await page.waitForTimeout(1000); // onFail's hand-off delay
  await expect(page.locator('.torch-icon.out')).toHaveCount(1);
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
    await page.click('#submitBtn');
    await expect(page.locator('#wsSlot-0')).not.toHaveClass(/placeholder/);
  }
});

test('drill topics never repeat within the last 4 chambers', async ({ page }) => {
  await startWithDebug(page);

  for (const i of DRILL_SLOTS) {
    await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), i);
  }

  // The tracker itself is trimmed to a small bound well past what a single
  // run needs (see TOPIC_MEMORY*2 in buildDrillSet) — that's an unrelated
  // memory safety net, not part of the no-repeat guarantee, so this only
  // checks the property that actually matters: no repeat within any
  // 4-chamber window of whatever history is kept.
  const recent = await page.evaluate(() => window.__debug.state.recentTopics);
  expect(recent.length).toBeGreaterThan(0);
  for (let i = 0; i < recent.length; i++) {
    const window4 = recent.slice(Math.max(0, i - 3), i + 1);
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

test('each mini-game chamber gets its own icon and accent color', async ({ page }) => {
  await startWithDebug(page);
  for (const type of MINIGAME_TYPES) {
    let found = false;
    for (let i = 0; i < 40; i++) {
      await page.evaluate((idx) => window.__debug.loadRoom(idx, { skipTimer: true }), MINIGAME_SLOTS[0]);
      if ((await page.evaluate(() => window.__debug.state.current.minigameType)) === type) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
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
