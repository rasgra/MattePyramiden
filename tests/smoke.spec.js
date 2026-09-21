import { test, expect } from '@playwright/test';

async function startGame(page) {
  await page.goto('/');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');
  await page.click('#introSkipBtn');
}

test('loads with the setup screen', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Pyramid Reckoning');
  await expect(page.locator('#setupOverlay')).toBeVisible();
  await expect(page.locator('#levelGrid .level-pill')).toHaveCount(10);
});

test('the dev bar stays hidden by default (dev.config.js ships disabled)', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#devBar')).toBeHidden();
});

test('dev.config.js can enable a room/mini-game jump bar for local testing', async ({ page }) => {
  // dev.config.js ships with enabled:false (see dev.config.js) — this
  // intercepts it with an enabled copy rather than touching the real file,
  // so the feature is verified without ever risking it landing enabled.
  await page.route('**/dev.config.js', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: 'window.PYRAMID_DEV_CONFIG = { enabled: true };' })
  );
  await page.goto('/');

  await expect(page.locator('#devBar')).toBeVisible();
  await expect(page.locator('#devRoomSelect option')).toHaveCount(12);

  // Jumps straight into a forced mini-game from a cold boot, before ever
  // touching the normal setup/intro flow.
  await page.selectOption('#devRoomSelect', '4');
  await page.selectOption('#devGameSelect', 'mastermind');
  await page.click('#devJumpBtn');

  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 5 / 12');
  await expect(page.locator('#roomNameLabel')).toContainText('Master Mind');
});

test('choosing a language and difficulty starts the intro', async ({ page }) => {
  await page.goto('/');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');
  await expect(page.locator('#introOverlay')).toBeVisible();
  await expect(page.locator('#introBeatText')).not.toHaveText('');
});

test('the intro finds an oil lamp before the letter, and the letter is lit by it', async ({ page }) => {
  await page.goto('/');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');

  // 5 beats now: wall, corridor, the lamp discovery, the letter, the shaft.
  await expect(page.locator('#introDots span')).toHaveCount(5);

  await page.click('#introNextBtn'); // corridor
  await page.click('#introNextBtn'); // the lamp discovery
  await expect(page.locator('#introBeatText')).toContainText('oil lamp');
  await expect(page.locator('#introScene')).toBeVisible();

  await page.click('#introNextBtn'); // the letter
  await expect(page.locator('#introLetter')).toBeVisible();
  await expect(page.locator('.intro-lamp .flame')).toHaveText('🪔');
});

test('skipping the intro drops you into chamber 1', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('#introOverlay')).toBeHidden();
  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 1 / 12');
});

test('the answer blank sits inline at the end of the current worksheet row', async ({ page }) => {
  await startGame(page);
  const worksheet = page.locator('#worksheet');
  // Not every chamber is a worksheet room (Nim/Mastermind/Treasury Door aren't) —
  // this test only asserts the worksheet interaction when chamber 1 happens to be one.
  if (await worksheet.isVisible()) {
    // "X + Y = __" — the blank itself is the shared #answerInput, relocated into
    // the row's own slot, not a separate field below the sheet.
    await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();
    await expect(page.locator('#answerRow')).toBeHidden();

    await page.fill('#answerInput', '0');
    // No submit button lives in the worksheet slot (too little room for it) —
    // Enter is the only way to submit here.
    await page.locator('#answerInput').press('Enter');
    // The answer itself may be right or wrong (problems are randomized) — only
    // assert that the row left its unanswered "placeholder" state either way,
    // and that the blank moved on to the next row rather than vanishing.
    await expect(page.locator('#wsSlot-0')).not.toHaveClass(/placeholder/);
    await expect(page.locator('#wsSlot-0 #answerInput')).toHaveCount(0);
    await expect(page.locator('#setTallyLabel')).toHaveText(/^Correct: [01]$/);
    await expect(page.locator('#wsSlot-1 #answerInput')).toBeVisible();
  }
});

test('arrow keys navigate between not-yet-correct worksheet rows, and a wrong row can be revisited', async ({
  page
}) => {
  await startGame(page);
  const worksheet = page.locator('#worksheet');
  if (!(await worksheet.isVisible())) return; // chamber 1 landed on a non-worksheet room this run

  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();

  // Down moves within the left column to the next not-yet-correct row,
  // and leaves row 0 showing its "?" placeholder again, not an empty gap.
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#wsSlot-1 #answerInput')).toBeVisible();
  await expect(page.locator('#wsSlot-0')).toHaveClass(/placeholder/);
  await expect(page.locator('#wsSlot-0')).toHaveText('?');

  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();

  // Right hops across to the same row in the other column, Left hops back.
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#wsSlot-5 #answerInput')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();

  // A wrong answer no longer locks the row out for the rest of the sheet —
  // it hands off to another row, but row 0 stays revisitable afterward.
  await page.fill('#answerInput', '999999999');
  await page.locator('#answerInput').press('Enter');
  await expect(page.locator('#wsSlot-0')).toHaveClass(/wrong/);
  await page.waitForTimeout(800); // clears the 700ms hand-off delay
  await expect(page.locator('#wsSlot-0 #answerInput')).toHaveCount(0);

  await page.keyboard.press('ArrowUp'); // back up to row 0 from wherever the hand-off landed
  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();
  await expect(page.locator('#wsSlot-0')).not.toHaveClass(/wrong/);
});

test('a worksheet row can be selected with a click/tap, not just the arrow keys', async ({ page }) => {
  await startGame(page);
  const worksheet = page.locator('#worksheet');
  if (!(await worksheet.isVisible())) return; // chamber 1 landed on a non-worksheet room this run

  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();

  await page.click('#wsRow-6');
  await expect(page.locator('#wsSlot-6 #answerInput')).toBeVisible();
  await expect(page.locator('#wsSlot-0')).toHaveClass(/placeholder/);

  // Clicking the already-active row, or one already answered correctly, is a no-op.
  await page.click('#wsRow-6');
  await expect(page.locator('#wsSlot-6 #answerInput')).toBeVisible();
});

test('no submit button crowds the worksheet slot, and arrow-key navigation ignores caret position', async ({
  page
}) => {
  await startGame(page);
  const worksheet = page.locator('#worksheet');
  if (!(await worksheet.isVisible())) return; // chamber 1 landed on a non-worksheet room this run

  // Regression test: #submitBtn used to be squeezed into the slot alongside
  // the answer input, leaving little room to type — it's dropped now that
  // Enter already submits.
  await expect(page.locator('.ws-slot #submitBtn')).toHaveCount(0);

  // Regression test: Left/Right used to only navigate once the caret sat at
  // the exact start/end of the field, which real typing rarely leaves it at
  // — in practice the arrows just seemed dead (only Up/Down, within a single
  // column, ever visibly worked). They now always navigate regardless.
  await page.click('#wsRow-5'); // right-hand column, row 0
  await page.fill('#answerInput', '17'); // fill() leaves the caret at the end, the old failure case
  await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible(); // hopped back to the left column
});

test('the hint, rules and map panels open and close', async ({ page }) => {
  await startGame(page);

  await page.click('#hintBtn');
  await expect(page.locator('#hintText')).toHaveClass(/show/);

  await page.click('#rulesBtn');
  await expect(page.locator('#rulesOverlay')).toBeVisible();
  await page.click('#rulesXBtn');
  await expect(page.locator('#rulesOverlay')).toBeHidden();

  await page.click('#mapBtn');
  await expect(page.locator('#mapOverlay')).toBeVisible();
  await expect(page.locator('#mapTrack .map-node')).toHaveCount(12);
  await page.click('#mapXBtn');
  await expect(page.locator('#mapOverlay')).toBeHidden();
});

test('the map opens/closes via the corner X, Escape, and the M-key toggle — and never traps the player', async ({
  page
}) => {
  await startGame(page);

  // Corner close button.
  await page.click('#mapBtn');
  await expect(page.locator('#mapOverlay')).toBeVisible();
  await page.click('#mapXBtn');
  await expect(page.locator('#mapOverlay')).toBeHidden();

  // Escape key.
  await page.click('#mapBtn');
  await expect(page.locator('#mapOverlay')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mapOverlay')).toBeHidden();

  // M toggles it open, then closed again, without getting stuck.
  await page.keyboard.press('m');
  await expect(page.locator('#mapOverlay')).toBeVisible();
  await page.keyboard.press('m');
  await expect(page.locator('#mapOverlay')).toBeHidden();

  // With the map closed, the game underneath is interactive again.
  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 1 / 12');
});

test('switching to Swedish updates on-screen text', async ({ page }) => {
  await page.goto('/');
  await page.click('#langSv');
  await expect(page.locator('#setupPrimaryBtn')).toHaveText('Påbörja klättringen');
  await expect(page.locator('#levelGrid .level-pill').first()).toHaveText('Nivå 1');
});

test('a sequential visual chamber (Geometry Vault / Coordinate Grid / Triangular Seal) plays through one step', async ({
  page
}) => {
  await startGame(page);
  const charges = page.locator('#trialCharges');
  let tries = 0;
  while (!(await charges.isVisible()) && tries < 60) {
    await page.click('#resetBtn');
    tries++;
  }
  if (!(await charges.isVisible())) return; // unlucky streak of worksheet-only rooms; nothing to assert

  // The diagram lives on the shared canvas, which the parchment card overlays —
  // this is exactly the layout that once let the parchment cut a diagram off,
  // so the canvas must stay visible and reasonably tall alongside it.
  const canvasBox = await page.locator('#scene').boundingBox();
  expect(canvasBox.height).toBeGreaterThan(100);
  await expect(page.locator('.trial-charge').first()).toBeVisible();
  await expect(page.locator('#promptText')).not.toHaveText('');

  // The Coordinate Grid marks its answer via arrow keys/clicks rather than
  // typing (see room-variety.spec.js for that room's own dedicated tests),
  // so its #answerInput is read-only — skip filling it and just confirm
  // whatever it's already showing.
  const isReadOnly = await page.locator('#answerInput').evaluate((el) => el.readOnly);
  if (!isReadOnly) await page.fill('#answerInput', '0');
  await page.click('#submitBtn');
  // Right or wrong (content is randomized), answering should register — either
  // the tally moved, or (Nim/Mastermind-style rooms aside) the room's own
  // feedback/prompt updated to the next step.
  await expect(page.locator('#feedbackText')).not.toHaveText('');
});

test('the sound toggle switches icon/label and survives a reload', async ({ page }) => {
  await startGame(page);
  await expect(page.locator('#soundIcon')).toHaveText('🔊');
  await expect(page.locator('#lblSound')).toHaveText('Sound');

  await page.click('#soundBtn');
  await expect(page.locator('#soundIcon')).toHaveText('🔇');
  await expect(page.locator('#lblSound')).toHaveText('Muted');

  // A reload starts back at the setup screen (this test never saved a run),
  // but the persisted sound preference should already show through there.
  await page.reload();
  await expect(page.locator('#soundIcon')).toHaveText('🔇');
});

test('answering questions triggers no console errors (audio cues included)', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err));

  await startGame(page);
  if (await page.locator('#worksheet').isVisible()) {
    await page.fill('#answerInput', '0');
    await page.locator('#answerInput').press('Enter'); // plays the positive or negative cue
    await page.waitForTimeout(200);
  }

  expect(errors).toEqual([]);
});

test('opening settings mid-run can be cancelled without restarting', async ({ page }) => {
  await startGame(page);
  await page.click('#settingsBtn');
  await expect(page.locator('#setupOverlay')).toBeVisible();
  await expect(page.locator('#setupCancelBtn')).toBeVisible();
  await page.click('#setupCancelBtn');
  await expect(page.locator('#setupOverlay')).toBeHidden();
  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 1 / 12');
});

async function endSceneHasContent(page) {
  return page.evaluate(() => {
    const c = document.getElementById('endScene');
    const ctx = c.getContext('2d');
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0 && data[i - 1] > 40) return true;
    return false;
  });
}

test('clearing the finale shows the treasure-chamber illustration', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');
  await page.click('#introSkipBtn');

  await page.evaluate(() => window.__debug.loadRoom(11, { skipTimer: true }));
  await page.evaluate(() => window.__debug.onSuccess());
  await page.waitForTimeout(900); // onSuccess's own delay before winGame() fires

  await expect(page.locator('#endOverlay')).toHaveClass(/show/);
  await expect(page.locator('#endOverlay')).not.toHaveClass(/mummy/);
  await expect(page.locator('#endScene')).toBeVisible();
  await expect(page.locator('#endBody')).toContainText('Difficulty level 6'); // level 5 -> "try level 6 next"

  // The scene should actually be drawing something, not sitting blank —
  // regression: the canvas element wasn't wired into `els`, so
  // drawTreasureScene() silently no-opped every frame.
  expect(await endSceneHasContent(page)).toBe(true);
});

test("losing shows the mummy illustration and Cheops's mummification message", async ({ page }) => {
  await page.goto('/?debug=1');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');
  await page.click('#introSkipBtn');

  // Running out of air is the only way to lose — drain it directly rather
  // than playing the whole climb out.
  await page.evaluate(() => {
    window.__debug.state.airLeft = 1; // about to run out on the next tick
  });
  await page.waitForTimeout(1300);

  await expect(page.locator('#endOverlay')).toHaveClass(/show/);
  await expect(page.locator('#endOverlay')).toHaveClass(/mummy/);
  await expect(page.locator('#endScene')).toBeVisible();
  await expect(page.locator('#endBody')).toContainText('mummified');

  expect(await endSceneHasContent(page)).toBe(true);
});
