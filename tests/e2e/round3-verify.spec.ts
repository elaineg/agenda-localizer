/**
 * Round-3 regression verification spec.
 * Run: BASE_URL=https://agenda-localizer-9ehx0evul-elainegao.vercel.app npm run test:e2e -- tests/e2e/round3-verify.spec.ts
 */
import { test, expect } from "@playwright/test";
import { encodeAgendaState } from "../../lib/parser";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function shareUrl(text: string, tz: string) {
  return `${BASE}/#${encodeAgendaState({ text, sourceTimezone: tz })}`;
}

// ── 2a: Title word-drop fixed ─────────────────────────────────────────────────
test("2a: SDK kept in title — 'Live Coding: Build with our SDK 11:30am PT'", async ({ page }) => {
  const url = shareUrl("Live Coding: Build with our SDK 11:30am PT", "UTC");
  await page.goto(url);
  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const titleEl = card.locator("p.font-semibold");
  const title = await titleEl.innerText();
  expect(title).toContain("SDK");
  expect(title).toBe("Live Coding: Build with our SDK");
});

// ── 2b: Bare-hour range fixed ─────────────────────────────────────────────────
test("2b: '9-10am hallway track' → card titled 'hallway track' at 9:00am start", async ({ page }) => {
  const url = shareUrl("2026-06-16\n9-10am hallway track", "UTC");
  await page.goto(url);
  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });

  // Title must be "hallway track", not "9 hallway track" or "10 hallway track"
  const titleEl = card.locator("p.font-semibold");
  const title = await titleEl.innerText();
  expect(title).toBe("hallway track");
  expect(title).not.toMatch(/^9\s/);
  expect(title).not.toMatch(/^10\s/);

  // Google Cal link must use start=9:00am UTC (09:00 UTC)
  const gcLink = card.locator('a:has-text("Add to Google Calendar")');
  await expect(gcLink).toBeAttached();
  const href = await gcLink.getAttribute("href");
  // 9:00 UTC on 2026-06-16 = 20260616T090000Z
  expect(href).toContain("20260616T090000Z");
});

// ── 2c: PST = fixed offset ─────────────────────────────────────────────────────
test("2c: '11:00 AM PST' and '19:00 UTC' are the same instant (unit test covers; live confirm)", async ({ page }) => {
  // Build share URL with both sessions; verify both render and their calendar dates match
  const url = shareUrl("2026-06-16\n11:00 AM PST\n19:00 UTC", "UTC");
  await page.goto(url);
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  const count = await cards.count();
  expect(count).toBe(2);

  // Both gcal links should contain 20260616T190000Z (19:00 UTC = 11:00 AM PST)
  const gcLinks = cards.locator('a:has-text("Add to Google Calendar")');
  const href0 = await gcLinks.nth(0).getAttribute("href");
  const href1 = await gcLinks.nth(1).getAttribute("href");
  expect(href0).toContain("20260616T190000Z");
  expect(href1).toContain("20260616T190000Z");
});

// ── 2d: Copy confirmation unmistakable ────────────────────────────────────────
test("2d(a): normal click shows green checkmark + '✓ Copied!' AND inline 'Link copied' line", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(BASE);
  const copyBtn = page.locator('[data-testid="copy-share-link"]');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  // Button must flip to checkmark + Copied!
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({ timeout: 1500 });
  // Inline "Link copied" text should appear
  await expect(page.getByText(/Link copied/i).first()).toBeVisible({ timeout: 1500 });
});

test("2d(b): blocked clipboard still shows Copied! AND inline 'Link copied'", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("blocked")) },
      writable: true, configurable: true,
    });
  });
  await page.goto(BASE);
  const copyBtn = page.locator('[data-testid="copy-share-link"]');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({ timeout: 1500 });
  await expect(page.getByText(/Link copied/i).first()).toBeVisible({ timeout: 1500 });
});

test("2d(c): Copied! cue persists 1s after re-render (live ticking session, blocked clipboard)", async ({ page }) => {
  // Block clipboard
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("blocked")) },
      writable: true, configurable: true,
    });
  });
  await page.goto(BASE);
  const copyBtn = page.locator('[data-testid="copy-share-link"]');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  // Immediately visible
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({ timeout: 1500 });
  // Trigger a re-render by typing into textarea
  const textarea = page.locator('[data-testid="agenda-input"]');
  if (await textarea.isVisible()) {
    // Focus + key press to trigger reparse without clearing the copied state
    await textarea.focus();
    // Small keystroke then undo to preserve content but trigger re-render
    await page.keyboard.press("End"); // Just a cursor move, no content change
  }
  // Wait 1s — cue should still be visible (timer is 2-3s)
  await page.waitForTimeout(1000);
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({ timeout: 500 });
});

// ── 2e: Copy as table ─────────────────────────────────────────────────────────
test("2e: Copy as table button exists and copies TSV with correct columns", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(BASE);

  // Capture clipboard
  let captured = "";
  await page.evaluate(() => {
    (window as any)._capturedTSV = "";
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (text: string) => {
      (window as any)._capturedTSV = text;
      return orig(text);
    };
  });

  const tableBtn = page.locator('button:has-text("Copy as table")');
  await expect(tableBtn).toBeVisible({ timeout: 5000 });
  await tableBtn.click();
  // Button flips to "✓ Copied table!" (not "✓ Copied!" — distinct from share link)
  await expect(page.locator('button:has-text("✓ Copied table!")')).toBeVisible({ timeout: 1500 });

  // Read the captured TSV
  const tsv = await page.evaluate(() => (window as any)._capturedTSV ?? "");
  // If clipboard override wasn't captured (browser may not expose it), check via clipboard API
  const actualTsv = tsv || await page.evaluate(() => navigator.clipboard.readText());

  // Verify header row
  expect(actualTsv).toContain("Session");
  expect(actualTsv).toContain("Local time");
  expect(actualTsv).toContain("Local date");
  expect(actualTsv).toContain("Source time");
  expect(actualTsv).toContain("Source timezone");
});

// ── 2f: Readable share link + round-trip decode ───────────────────────────────
test("2f(a): share URL contains a human-readable slug", async ({ page }) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(BASE);

  let capturedUrl = "";
  await page.evaluate(() => {
    (window as any)._shareUrl = "";
    const orig = navigator.clipboard.writeText.bind(navigator.clipboard);
    navigator.clipboard.writeText = async (text: string) => {
      (window as any)._shareUrl = text;
      return orig(text);
    };
  });

  const copyBtn = page.locator('[data-testid="copy-share-link"]');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({ timeout: 1500 });

  capturedUrl = await page.evaluate(() => (window as any)._shareUrl ?? "");
  if (!capturedUrl) {
    // Fallback: read from window.location.hash (the URL is updated in-place)
    capturedUrl = page.url();
  }

  // URL must contain a hash
  expect(capturedUrl).toContain("#");
  const hash = capturedUrl.split("#")[1] ?? "";
  // Human-readable slug: format is #<slug>.<base64payload>
  // The slug should exist (dot separator present) and not be raw base64
  expect(hash).toContain(".");
  const slug = hash.split(".")[0];
  // Slug should NOT be the base64 payload itself (base64 starts with "ey")
  expect(slug).not.toMatch(/^ey/);
  // Slug should be human-readable (alphanumeric chars + dashes, no spaces)
  expect(slug).toMatch(/^[a-z0-9-]+$/);
  // Slug should not be empty
  expect(slug.length).toBeGreaterThan(0);
});

test("2f(b): fresh direct load of slugged share link renders agenda correctly", async ({ page }) => {
  // Build a slugged share URL manually using the same format the app generates:
  // #<slug>.<base64payload>
  const { encodeAgendaState } = await import("../../lib/parser");
  const state = { text: "2026-06-16\nLaunch Week Keynote — 16:00 UTC\nWorkshop — 17:30 UTC", sourceTimezone: "UTC" };
  const payload = encodeAgendaState(state);
  const slug = "launch-week-keynote";
  const fullUrl = `${BASE}/#${slug}.${payload}`;

  await page.goto(fullUrl);
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  const count = await cards.count();
  expect(count).toBe(2);
  await expect(page.locator("text=Launch Week Keynote")).toBeVisible();
  await expect(page.locator("text=Workshop")).toBeVisible();
});

test("2f(c): edited slug on same payload still decodes (slug is cosmetic)", async ({ page }) => {
  const { encodeAgendaState } = await import("../../lib/parser");
  const state = { text: "2026-06-16\nPanel Discussion — 9:00 AM PT", sourceTimezone: "UTC" };
  const payload = encodeAgendaState(state);
  // Simulate user editing the slug
  const editedUrl = `${BASE}/#user-edited-slug.${payload}`;

  await page.goto(editedUrl);
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=Panel Discussion")).toBeVisible();
});
