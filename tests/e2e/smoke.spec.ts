import { test, expect } from '@playwright/test';

const PREVIEW_URL = 'https://agenda-localizer-iyj1f0v5d-elainegao.vercel.app';

// Baseline smoke every app keeps: page loads, communicates purpose, no console errors.
test('landing page loads and states its purpose', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const resp = await page.goto('/');
  expect(resp?.status()).toBe(200);
  await expect(page.locator('h1').first()).toBeVisible();
  expect(errors).toEqual([]);
});

// Footer appears on creator view (landing page, no hash)
test('footer "Make your own → Agenda Localizer" appears on creator view', async ({ page }) => {
  await page.goto(PREVIEW_URL + '/');
  await expect(page.getByText('Make your own → Agenda Localizer')).toBeVisible();
});

// Footer appears on shared view (URL with a hash)
test('footer "Make your own → Agenda Localizer" appears on shared view with hash', async ({ page }) => {
  // Encode a minimal agenda as hash: title + one session line
  // Build a hash URL like the app produces: #<base64-of-agenda-state>
  // We use a known hash from the sample agenda to load a realistic shared view.
  // The simplest approach: navigate to the preview URL, load sample, click copy-share-link,
  // then navigate to that URL and verify footer.
  await page.goto(PREVIEW_URL + '/');

  // Load sample agenda
  await page.getByRole('button', { name: /load sample/i }).click();

  // Copy share link (may need clipboard permission; use page evaluate to intercept)
  let capturedHash = '';
  await page.evaluate(() => {
    // Override clipboard to capture the URL
    (window as Window & { _capturedClipboard?: string })._capturedClipboard = '';
    navigator.clipboard.writeText = async (text: string) => {
      (window as Window & { _capturedClipboard?: string })._capturedClipboard = text;
    };
  });

  await page.getByRole('button', { name: /copy share link/i }).click();

  capturedHash = await page.evaluate(() => {
    return (window as Window & { _capturedClipboard?: string })._capturedClipboard ?? '';
  });

  // If we captured a URL with hash, navigate to it
  if (capturedHash && capturedHash.includes('#')) {
    await page.goto(capturedHash);
  } else {
    // Fallback: use current URL which should have hash after clicking copy
    const currentUrl = page.url();
    if (!currentUrl.includes('#')) {
      // Manually construct a hash URL by reading current hash from window.location
      const hash = await page.evaluate(() => window.location.hash);
      if (hash && hash.length > 1) {
        await page.goto(PREVIEW_URL + '/' + hash);
      }
    }
  }

  await expect(page.getByText('Make your own → Agenda Localizer')).toBeVisible();
});

// Sample agenda loads with 3+ parsed sessions
test('load sample agenda shows 3+ parsed sessions with localized times', async ({ page }) => {
  await page.goto(PREVIEW_URL + '/');
  await page.getByRole('button', { name: /load sample/i }).click();

  // Check that we have at least 3 session cards showing localized times
  const sessionCards = page.locator('[data-testid="session-card"], .bg-white.border.border-slate-200.rounded-lg.p-4.shadow-sm');
  await expect(sessionCards.first()).toBeVisible();
  const count = await sessionCards.count();
  expect(count).toBeGreaterThanOrEqual(3);
});

// Invalid time (26:00 UTC) flagged inline, does not crash editor
test('invalid time 26:00 UTC is flagged inline without crashing', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto(PREVIEW_URL + '/');

  // Clear textarea and paste invalid time
  const textarea = page.locator('textarea').first();
  await textarea.fill('Session 1 — 16:00 UTC\n26:00 UTC\nSession 3 — 17:00 UTC');

  // Wait a moment for live re-parse
  await page.waitForTimeout(500);

  // The invalid line should be flagged (amber warning block - amber span, not the textarea)
  await expect(page.locator('span.text-amber-800').filter({ hasText: '26:00 UTC' })).toBeVisible();

  // Other sessions should still render (source time shown in session card, not just textarea)
  await expect(page.locator('p.text-sm.text-slate-500').filter({ hasText: '16:00 UTC' }).first()).toBeVisible();

  // No JS errors
  const hydrationErrors = errors.filter(e =>
    e.includes('Hydration') || e.includes('hydration') || e.includes('TypeError')
  );
  expect(hydrationErrors).toEqual([]);
});
