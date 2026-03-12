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

/** Map of template types that require a specific category to be selected first */
const TYPE_CATEGORY_MAP: Record<string, string> = {
  'Authentication': 'Authentication',
  'Carousel': 'Marketing',
  'Catalog': 'Marketing',
};

async function selectTemplateType(page: Page, typeLabel: string) {
  // Some types require selecting a category first
  const requiredCategory = TYPE_CATEGORY_MAP[typeLabel];
  if (requiredCategory) {
    const basicInfo = page.locator('section:has(h2:has-text("Basic Info"))');
    await basicInfo.locator(`button:has-text("${requiredCategory}")`).click();
  }

  // Click within the Template Type section, matching the label span exactly
  const typeSection = page.locator('section:has(h2:has-text("Template Type"))');
  await typeSection.locator(`button`, { has: page.locator(`span.text-xs:text-is("${typeLabel}")`) }).click();
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

  // ─── CATEGORY & LANGUAGE ──────────────────────────────

  test('Category selector shows MARKETING, UTILITY, AUTHENTICATION', async ({ page }) => {
    // Category section is inside Basic Info
    const basicInfo = page.locator('section:has(h2:has-text("Basic Info"))');
    await expect(basicInfo.locator('text=Category')).toBeVisible();

    await expect(basicInfo.locator('button:has-text("Marketing")')).toBeVisible();
    await expect(basicInfo.locator('button:has-text("Utility")')).toBeVisible();
    // "Authentication" text also exists in template type picker, so scope to Basic Info
    await expect(basicInfo.locator('button:has-text("Authentication")')).toBeVisible();
  });

  test('Language selector is present with default English', async ({ page }) => {
    const langSelect = page.locator('#tplLanguage');
    await expect(langSelect).toBeVisible();
    await expect(langSelect).toHaveValue('en');

    // Check that multiple languages are available
    const optionCount = await langSelect.locator('option').count();
    expect(optionCount).toBeGreaterThan(10);
  });

  // ─── AUTHENTICATION ───────────────────────────────────

  test('Authentication template shows preset body and security options', async ({ page }) => {
    await selectTemplateType(page, 'Authentication');

    // Body textarea should NOT be visible (preset by WhatsApp)
    await expect(page.locator('#tplBody')).not.toBeVisible();

    // Preset body info should be visible
    await expect(page.locator('text=Preset body by WhatsApp')).toBeVisible();
    await expect(page.locator('text=is your verification code')).toBeVisible();

    // Security recommendation toggle
    await expect(page.getByText('Security Recommendation', { exact: true })).toBeVisible();
    await expect(page.locator('#tplSecurityRecommendation')).toBeVisible();

    // Code expiration field
    await expect(page.locator('#tplCodeExpiration')).toBeVisible();
    await expect(page.locator('text=1–90 minutes')).toBeVisible();

    // Category should be auto-set to AUTHENTICATION
    await expect(page.locator('text=auto-set to AUTHENTICATION')).toBeVisible();
  });

  test('Authentication template shows COPY_CODE button type', async ({ page }) => {
    await selectTemplateType(page, 'Authentication');

    await expect(page.locator('text=Copy Code button for OTP auto-copy')).toBeVisible();

    await page.click('button:has-text("Add Button")');

    // The label should say "Copy Code" (the type badge, exact match)
    await expect(page.getByText('Copy Code', { exact: true })).toBeVisible();

    // Max 1 button — "Add Button" should be gone
    await expect(page.locator('button:has-text("Add Button")')).not.toBeVisible();
  });

  // ─── CATALOG ──────────────────────────────────────────

  test('Catalog template shows catalog_id and thumbnail_item_id fields', async ({ page }) => {
    await selectTemplateType(page, 'Catalog');

    await expect(page.locator('label:has-text("Catalog ID")')).toBeVisible();
    await expect(page.locator('#tplCatalogId')).toBeVisible();
    await expect(page.getByText('From Meta Commerce Manager. Required to link your product catalog.')).toBeVisible();

    // Thumbnail Product ID
    await expect(page.locator('label:has-text("Thumbnail Product ID")')).toBeVisible();
    await expect(page.locator('#tplThumbnailItemId')).toBeVisible();
  });

  // ─── LIST PICKER ──────────────────────────────────────

  test('List picker shows in-session only warning', async ({ page }) => {
    await selectTemplateType(page, 'List Picker');

    await expect(page.getByText('In-session only', { exact: true })).toBeVisible();
    await expect(
      page.locator('text=cannot be submitted for WhatsApp template approval')
    ).toBeVisible();
  });

  // ─── CAROUSEL ─────────────────────────────────────────

  test('Carousel shows min 2 cards requirement', async ({ page }) => {
    await selectTemplateType(page, 'Carousel');

    await expect(page.locator('text=Carousel Cards')).toBeVisible();
    await expect(page.locator('text=Min 2, max 10 cards')).toBeVisible();
    await expect(
      page.locator('text=same number/type of buttons')
    ).toBeVisible();

    // Add a card
    await page.click('text=Add Card');
    await expect(page.locator('text=Card 1')).toBeVisible();
    await expect(page.locator('text=/0\\/160/')).toBeVisible();
  });

  // ─── QUICK REPLY ──────────────────────────────────────

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

  // ─── FOOTER ───────────────────────────────────────────

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

  // ─── URL BUTTON VALIDATIONS ───────────────────────────

  test('URL button warns about shortened URLs', async ({ page }) => {
    await selectTemplateType(page, 'Call to Action');

    await page.click('button:has-text("Add Button")');

    // Find URL input and type a shortened URL
    const urlInput = page.locator('input[placeholder*="https://example.com"]');
    await urlInput.fill('https://bit.ly/abc123');

    await expect(
      page.locator('text=Shortened URLs are always rejected by Meta')
    ).toBeVisible();
  });

  test('URL button warns about variable not at end', async ({ page }) => {
    await selectTemplateType(page, 'Call to Action');

    await page.click('button:has-text("Add Button")');

    const urlInput = page.locator('input[placeholder*="https://example.com"]');
    await urlInput.fill('https://example.com/{{1}}/page');

    await expect(
      page.locator('text=must be at the end of the URL only')
    ).toBeVisible();
  });
});
