/**
 * Mobile viewport tests: detected-source-tz indicator must be visible at 375px
 * in both creator and shared/attendee views.
 * Fix: panel R3 Dana blocker — indicator was hidden below 1024px (hidden lg:flex).
 */
import { test, expect } from "@playwright/test";
import { encodeAgendaState } from "../../lib/parser";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function shareUrl(text: string, tz: string): string {
  return `${BASE}/#${encodeAgendaState({ text, sourceTimezone: tz })}`;
}

// ── CREATOR VIEW at 375px ─────────────────────────────────────────────────────

test("MOBILE: creator view shows detected-source-tz indicator at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nKeynote — 2:00 PM");

  const indicator = page.locator('[data-testid="detected-source-tz-mobile"]');
  await expect(indicator).toBeVisible({ timeout: 3000 });
  const text = await indicator.innerText();
  expect(text).toContain("Detected source timezone");
  expect(text).toContain("PT");
  expect(text).toContain("All times PT");
});

test("MOBILE: creator view detected-source-tz indicator is not clipped/zero-height at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nWorkshop — 10:00 AM");

  const indicator = page.locator('[data-testid="detected-source-tz-mobile"]');
  await expect(indicator).toBeVisible({ timeout: 3000 });
  const box = await indicator.boundingBox();
  expect(box).not.toBeNull();
  // Must have non-trivial height (not clipped to 0)
  expect(box!.height).toBeGreaterThan(10);
  // Must fit within 375px width (not overflowing)
  expect(box!.x + box!.width).toBeLessThanOrEqual(380);
});

test("MOBILE: sample pre-loads showing detected-source-tz-mobile indicator at 375px (cold load)", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE);
  // Sample contains "All times PT" — indicator must appear on cold load at mobile viewport
  const indicator = page.locator('[data-testid="detected-source-tz-mobile"]');
  await expect(indicator).toBeVisible({ timeout: 5000 });
  const text = await indicator.innerText();
  expect(text).toContain("PT");
});

// ── SHARED/ATTENDEE VIEW at 375px ─────────────────────────────────────────────

test("MOBILE: shared/attendee view shows detected-source-tz indicator at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const url = shareUrl("All times PT\n2026-06-16\nKeynote — 2:00 PM", "UTC");
  await page.goto(url);

  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 5000 });
  const text = await indicator.innerText();
  expect(text).toContain("Detected source timezone");
  expect(text).toContain("PT");
  expect(text).toContain("All times PT");
});

test("MOBILE: shared view detected-source-tz indicator not clipped at 375px", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const url = shareUrl("All times PT\n2026-06-16\nWorkshop — 10:00 AM", "UTC");
  await page.goto(url);

  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 5000 });
  const box = await indicator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(10);
  expect(box!.x + box!.width).toBeLessThanOrEqual(380);
});

// ── DESKTOP REGRESSION: desktop panel indicator still visible at 1280px ────────

test("DESKTOP REGRESSION: detected-source-tz indicator still visible at 1280px in creator view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nKeynote — 2:00 PM");

  // The desktop panel uses data-testid="detected-source-tz"
  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 3000 });
  const text = await indicator.innerText();
  expect(text).toContain("Detected source timezone");
  expect(text).toContain("PT");
});
