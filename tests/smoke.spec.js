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

test('choosing a language and difficulty starts the intro', async ({ page }) => {
  await page.goto('/');
  await page.click('#langEn');
  await page.click('#setupPrimaryBtn');
  await expect(page.locator('#introOverlay')).toBeVisible();
  await expect(page.locator('#introBeatText')).not.toHaveText('');
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
    await page.click('#submitBtn');
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
  await page.click('#submitBtn');
  await expect(page.locator('#wsSlot-0')).toHaveClass(/wrong/);
  await page.waitForTimeout(800); // clears the 700ms hand-off delay
  await expect(page.locator('#wsSlot-0 #answerInput')).toHaveCount(0);

  await page.keyboard.press('ArrowUp'); // back up to row 0 from wherever the hand-off landed
  await expect(page.locator('#wsSlot-0 #answerInput')).toBeVisible();
  await expect(page.locator('#wsSlot-0')).not.toHaveClass(/wrong/);
});

test('the hint, rules and map panels open and close', async ({ page }) => {
  await startGame(page);

  await page.click('#hintBtn');
  await expect(page.locator('#hintText')).toHaveClass(/show/);

  await page.click('#rulesBtn');
  await expect(page.locator('#rulesOverlay')).toBeVisible();
  await page.click('#rulesCloseBtn');
  await expect(page.locator('#rulesOverlay')).toBeHidden();

  await page.click('#mapBtn');
  await expect(page.locator('#mapOverlay')).toBeVisible();
  await expect(page.locator('#mapTrack .map-room')).toHaveCount(12);
  await page.click('#mapCloseBtn');
  await expect(page.locator('#mapOverlay')).toBeHidden();
});

test('switching to Swedish updates on-screen text', async ({ page }) => {
  await page.goto('/');
  await page.click('#langSv');
  await expect(page.locator('#setupPrimaryBtn')).toHaveText('Kliv ner i pyramiden');
  await expect(page.locator('#levelGrid .level-pill').first()).toHaveText('Åk 1');
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

  await page.fill('#answerInput', '0');
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
    await page.click('#submitBtn'); // plays the positive or negative cue
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
