import { test, expect } from '@playwright/test';

// These use the debug-only hook (window.__debug, active solely with
// ?debug=1 in the URL — see index.html) to jump straight to a room and read
// real internal state, rather than solving arbitrary worksheets to get
// there. Ordinary play never loads with that query param, so the hook is
// never present for real players.

const MINIGAME_TYPES = ['nim', 'mastermind', 'guess', 'tictactoe'];
const MINIGAME_SLOTS = [4, 9]; // chambers 5 and 10
const DRILL_SLOTS = [0, 1, 2, 3, 5, 6, 7, 8, 10]; // every other chamber before the finale (11)

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

test('tic-tac-toe: clicking a cell places X and the guardian replies with O', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'tictactoe')), 'tic-tac-toe did not come up in the sample of attempts');

  const cells = page.locator('.ttt-cell');
  await expect(cells).toHaveCount(9);
  await cells.nth(4).click(); // center
  await expect(cells.nth(4)).toHaveText('X');
  await page.waitForTimeout(700); // the guardian's reply is deliberately delayed
  const marks = await cells.allTextContents();
  expect(marks.filter((m) => m === 'O').length).toBe(1);
});

test('the guessing room gives too-high/too-low feedback', async ({ page }) => {
  await startWithDebug(page);
  test.skip(!(await landOnMinigame(page, 'guess')), 'the guessing room did not come up in the sample of attempts');

  await page.fill('#answerInput', '1');
  await page.click('#submitBtn');
  await expect(page.locator('.mm-row').first()).toContainText(/too low|correct!/);
});

test('the worksheet still answers correctly right after a Nim/Tic-Tac-Toe chamber', async ({ page }) => {
  // Regression test: Nim and Tic-Tac-Toe are the two mini-game types whose
  // checkAnswer() short-circuits (they're played via their own on-screen
  // controls, not the shared input). state.current used to only ever be
  // *set* when entering one of those rooms, never cleared afterward — so
  // the next room, even a plain worksheet, would inherit its stale
  // minigameType and silently swallow every Enter press and Answer click.
  await startWithDebug(page);
  const landed = (await landOnMinigame(page, 'nim')) || (await landOnMinigame(page, 'tictactoe'));
  test.skip(!landed, 'neither Nim nor tic-tac-toe came up in the sample of attempts');

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
