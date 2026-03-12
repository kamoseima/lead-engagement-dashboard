import { test, expect, type Page } from '@playwright/test';

const TEST_EMAIL = process.env.E2E_EMAIL || 'kamos@apextech.group';
const TEST_PASSWORD = process.env.E2E_PASSWORD || 'Test1234';

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  // App uses window.location.href = '/dashboard' (full page nav)
  await page.waitForURL('**/dashboard', { timeout: 20_000, waitUntil: 'domcontentloaded' });
}

async function navigateToTemplates(page: Page) {
  await page.goto('/templates');
  await page.waitForLoadState('domcontentloaded');
}

async function clickNewTemplate(page: Page) {
  await page.click('button:has-text("New Template")');
  await page.waitForSelector('text=Basic Info');
}

async function selectTemplateType(page: Page, typeLabel: string) {
  await page.click(`button:has-text("${typeLabel}")`);
}

// ─── LIGHT MODE (no auth needed) ──────────────────────

test('App starts in light mode by default', async ({ page }) => {
  await page.goto('/auth/login');
  await page.waitForLoadState('domcontentloaded');

  const htmlClass = await page.locator('html').getAttribute('class');
  expect(htmlClass).not.toContain('dark');
});

// ─── TEMPLATE EDITOR TESTS (auth required) ───────────

test.describe('Template Editor — Meta/WhatsApp/Twilio Alignment', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateToTemplates(page);
    await clickNewTemplate(page);
  });

  // ─── HIGH PRIORITY ───────────────────────────────────

  test('CTA body limit is 640 chars', async ({ page }) => {
    await selectTemplateType(page, 'Call to Action');

    const textarea = page.locator('#tplBody');
    await expect(textarea).toHaveAttribute('maxlength', '640');

    await expect(page.locator('text=/\\/640/')).toBeVisible();
  });

  test('Text body limit is 1024 chars', async ({ page }) => {
    await selectTemplateType(page, 'Text');

    const textarea = page.locator('#tplBody');
    await expect(textarea).toHaveAttribute('maxlength', '1024');

    await expect(page.locator('text=/\\/1024/')).toBeVisible();
  });

  test('Button text has 25 char maxLength', async ({ page }) => {
    await selectTemplateType(page, 'Quick Reply');

    await page.click('button:has-text("Add Button")');

    const buttonInput = page.locator('input[placeholder="Button text"]');
    await expect(buttonInput).toHaveAttribute('maxlength', '25');

    await expect(page.locator('text=/\\/25/')).toBeVisible();
  });

  // ─── MEDIUM PRIORITY ─────────────────────────────────

  test('Authentication template shows COPY_CODE button type', async ({ page }) => {
    await selectTemplateType(page, 'Authentication');

    await expect(page.locator('text=Copy Code button for OTP auto-copy')).toBeVisible();

    await page.click('button:has-text("Add Button")');

    // The label should say "Copy Code" (the type badge, exact match)
    await expect(page.getByText('Copy Code', { exact: true })).toBeVisible();

    // Max 1 button — "Add Button" should be gone
    await expect(page.locator('button:has-text("Add Button")')).not.toBeVisible();
  });

  test('Catalog template shows catalog_id field', async ({ page }) => {
    await selectTemplateType(page, 'Catalog');

    await expect(page.locator('label:has-text("Catalog ID")')).toBeVisible();
    await expect(page.locator('#tplCatalogId')).toBeVisible();
    await expect(page.getByText('From Meta Commerce Manager. Required to link your product catalog.')).toBeVisible();
  });

  // ─── LOW PRIORITY ────────────────────────────────────

  test('List picker shows in-session only warning', async ({ page }) => {
    await selectTemplateType(page, 'List Picker');

    await expect(page.getByText('In-session only', { exact: true })).toBeVisible();
    await expect(
      page.locator('text=cannot be submitted for WhatsApp template approval')
    ).toBeVisible();
  });

  test('Carousel shows card editor with constraints', async ({ page }) => {
    await selectTemplateType(page, 'Carousel');

    await expect(page.locator('text=Carousel Cards')).toBeVisible();
    await expect(
      page.locator('text=title + body max 160 chars combined')
    ).toBeVisible();

    // Add a card
    await page.click('text=Add Card');
    await expect(page.locator('text=Card 1')).toBeVisible();
    await expect(page.locator('text=/0\\/160/')).toBeVisible();
  });

  test('Quick reply allows up to 10 buttons', async ({ page }) => {
    await selectTemplateType(page, 'Quick Reply');

    await expect(
      page.locator('text=Max 10 (approved) or 3 (in-session)')
    ).toBeVisible();

    // Add 4 buttons to prove max > 3
    for (let i = 0; i < 4; i++) {
      await page.click('button:has-text("Add Button")');
    }

    const buttonInputs = page.locator('input[placeholder="Button text"]');
    await expect(buttonInputs).toHaveCount(4);
  });

  test('Footer blocks variables', async ({ page }) => {
    await selectTemplateType(page, 'Card');

    const footerInput = page.locator('#tplFooter');
    await expect(footerInput).toBeVisible();
    await expect(page.locator('text=No variables allowed in footer')).toBeVisible();

    // Type a variable into footer
    await footerInput.fill('Test {{1}} footer');

    await expect(
      page.locator('text=Variables are not supported in footers')
    ).toBeVisible();
  });
});
