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

test('opening settings mid-run can be cancelled without restarting', async ({ page }) => {
  await startGame(page);
  await page.click('#settingsBtn');
  await expect(page.locator('#setupOverlay')).toBeVisible();
  await expect(page.locator('#setupCancelBtn')).toBeVisible();
  await page.click('#setupCancelBtn');
  await expect(page.locator('#setupOverlay')).toBeHidden();
  await expect(page.locator('#roomIndexLabel')).toContainText('CHAMBER 1 / 12');
});
