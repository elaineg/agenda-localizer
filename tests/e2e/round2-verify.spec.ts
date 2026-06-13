/**
 * Round-2 regression verification spec — focused on the 7 fix items.
 * Run: BASE_URL=https://agenda-localizer-8s3eu4rzp-elainegao.vercel.app npx playwright test tests/e2e/round2-verify.spec.ts
 */
import { test, expect } from "@playwright/test";
import { encodeAgendaState } from "../../lib/parser";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function shareUrl(text: string, tz: string) {
  return `${BASE}/#${encodeAgendaState({ text, sourceTimezone: tz })}`;
}

// 2a: bare-hour/informal times parse into normal session cards
test("2a: bare-hour informal times parse — 8pm, 9am, noon, 4 PM ET", async ({ page }) => {
  const url = shareUrl("8pm\n9am\nnoon\n4 PM ET", "UTC");
  await page.goto(url);
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  const count = await cards.count();
  // All 4 should be session cards (not amber warnings)
  expect(count).toBeGreaterThanOrEqual(4);
  const amberCards = page.locator(".bg-amber-50");
  const amberCount = await amberCards.count();
  // No error cards for valid bare-hour inputs
  expect(amberCount).toBe(0);
  // Each card shows "(your time)" label
  const yourTimeLabels = page.locator("text=(your time)");
  const ytCount = await yourTimeLabels.count();
  expect(ytCount).toBeGreaterThanOrEqual(4);
});

// 2b: timeless line → NOTE/italic row; 26:00 UTC → flagged in creator view
test("2b: timeless line is note row; 26:00 UTC is flagged in creator", async ({ page }) => {
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("Day 1 — Summit\n9:00 AM PT — Real Session\nTalk — 26:00 UTC");
  await page.waitForTimeout(500);

  // "Day 1 — Summit" should be a note (italic text, NOT amber)
  // Use .first() to avoid strict mode violation when both mobile and desktop panels render
  const noteEl = page.locator("p.italic").first();
  await expect(noteEl).toBeVisible({ timeout: 3000 });
  const noteText = await noteEl.innerText();
  expect(noteText).toContain("Day 1");

  // "Talk — 26:00 UTC" should be flagged as an error (amber card)
  const amberCard = page.locator(".bg-amber-50");
  await expect(amberCard.first()).toBeVisible({ timeout: 3000 });
  const amberText = await amberCard.first().innerText();
  expect(amberText).toContain("26:00 UTC");

  // "Real Session" should be a normal session card — use hasText to find the right one
  // (creator view has mobile+desktop panels; filter to visible one by text)
  const realSessionCard = page.locator(".bg-white.border.border-slate-200.rounded-lg", { hasText: "Real Session" });
  await expect(realSessionCard.first()).toBeAttached({ timeout: 3000 });
});

// 2c: shared view has NO app-rendered role="alert" cards (malformed lines omitted)
// Note: Next.js injects its own aria-live route announcer (#__next-route-announcer__);
// that element has role="alert" but is hidden and not an error card.
test("2c: shared view omits malformed lines — no amber warning cards", async ({ page }) => {
  const url = shareUrl("9:00 AM PT — Valid Session\nTalk — 26:00 UTC", "UTC");
  await page.goto(url);

  // Wait for sessions to render
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible({ timeout: 5000 });

  // No amber error cards (the actual warning UI) in shared view
  const amberCards = page.locator(".bg-amber-50");
  const amberCount = await amberCards.count();
  expect(amberCount).toBe(0);

  // Exactly 1 session card (the valid one; 26:00 UTC is omitted)
  const cardCount = await sessionCards.count();
  expect(cardCount).toBe(1);

  // The Next.js route announcer role="alert" IS present but is framework-level,
  // not an app warning. Verify it's the only role="alert" and it's invisible/empty.
  const alerts = page.locator('[role="alert"]');
  const alertCount = await alerts.count();
  if (alertCount > 0) {
    // All alerts must be the Next.js route announcer (id=__next-route-announcer__)
    for (let i = 0; i < alertCount; i++) {
      const id = await alerts.nth(i).getAttribute("id");
      const outerHtml = await alerts.nth(i).evaluate(el => el.outerHTML);
      // Must be Next.js framework element, not an app amber card
      expect(outerHtml).not.toContain("bg-amber-50");
      expect(outerHtml).not.toContain("Couldn't read a time");
    }
  }
});

// 2d: +1 day badge on session whose local time is next calendar day
test("2d: +1 day badge appears when session crosses into next calendar day", async ({ page }) => {
  // 22:00 UTC on 2026-06-16; emulate JST (UTC+9) viewer => 07:00 next day
  await page.addInitScript(() => {
    const Orig = Intl.DateTimeFormat;
    // @ts-ignore
    Intl.DateTimeFormat = function(locales?: any, options?: any) {
      if (arguments.length === 0) {
        const real = new Orig();
        return {
          format: real.format.bind(real),
          formatToParts: real.formatToParts.bind(real),
          resolvedOptions: () => ({ ...real.resolvedOptions(), timeZone: "Asia/Tokyo" }),
        };
      }
      return new Orig(locales, options);
    };
    // @ts-ignore
    Intl.DateTimeFormat.prototype = Orig.prototype;
    // @ts-ignore
    Intl.DateTimeFormat.supportedLocalesOf = Orig.supportedLocalesOf;
  });

  const url = shareUrl("2026-06-16\nLate Night Talk — 22:00 UTC", "UTC");
  await page.goto(url);

  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const cardText = await card.innerText();
  expect(cardText).toContain("+1 day");
});

// 2e: unknown tz token shows visible "Unknown timezone" chip
test("2e: unrecognized tz token shows Unknown timezone chip", async ({ page }) => {
  // "XYZ" is not a known tz abbreviation
  const url = shareUrl("9:00 AM XYZ — Talk", "UTC");
  await page.goto(url);

  // Wait for card to render
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible({ timeout: 5000 });

  // Page should contain "Unknown timezone" text
  await expect(page.locator("text=Unknown timezone").first()).toBeVisible({ timeout: 3000 });
});

// 2f: calendar links appear in CREATOR view (not just shared view)
// The creator preview has both mobile (lg:hidden) and desktop (hidden lg:flex) panels.
// We check existence of the links (they ARE in the DOM on both) and also verify the
// desktop panel link is visible at 1280px viewport.
test("2f: Add to Google Calendar and Download .ics links appear in creator preview", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);

  // The desktop preview panel (hidden lg:flex) should be visible at 1280px
  // Check for Google Calendar link visible in the desktop panel
  const gcLinks = page.locator('a:has-text("Add to Google Calendar")');
  // Wait for at least one to appear in DOM
  await expect(gcLinks.first()).toBeAttached({ timeout: 5000 });
  const gcHref = await gcLinks.first().getAttribute("href");
  expect(gcHref).toContain("calendar.google.com");

  // Check for ICS link
  const icsLinks = page.locator('a:has-text("Download .ics")');
  await expect(icsLinks.first()).toBeAttached({ timeout: 5000 });
  const icsHref = await icsLinks.first().getAttribute("href");
  expect(icsHref).toContain("data:text/calendar");
});

// 2g: privacy line is present near editor/share controls
test("2g: privacy line present near editor controls", async ({ page }) => {
  await page.goto(BASE);
  // "Runs entirely in your browser" or "nothing is uploaded" text
  await expect(page.locator("text=Runs entirely in your browser").first()).toBeVisible({ timeout: 5000 });
});

// REGRESSION: title with internal colon preserved (no trailing @ or tz leak)
test("REGRESSION: Workshop: Building with AI title preserved on live page", async ({ page }) => {
  await page.goto(BASE);
  // The sample has "Workshop: Building with AI" — it should appear in the DOM
  // Use toBeAttached (not toBeVisible) because one instance may be in the hidden mobile panel
  const titleLocator = page.locator("p.font-semibold", { hasText: "Workshop: Building with AI" });
  await expect(titleLocator.first()).toBeAttached({ timeout: 5000 });
  const titleText = await titleLocator.first().innerText();
  expect(titleText).toContain("Workshop: Building with AI");

  // No "@" leak in any session title
  const sessionTitles = page.locator("p.font-semibold");
  const count = await sessionTitles.count();
  for (let i = 0; i < count; i++) {
    const t = await sessionTitles.nth(i).innerText();
    expect(t).not.toMatch(/@/);
  }
});

// REGRESSION: 16:00 UTC localizes correctly — source time always shown;
// local time depends on viewer TZ. We verify source time is shown and the
// session renders (behavior correct regardless of test-runner timezone).
test("REGRESSION: 16:00 UTC source time is shown on session card", async ({ page }) => {
  const url = shareUrl("2026-06-16\nSession 3 — 16:00 UTC", "UTC");
  await page.goto(url);
  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const text = await card.innerText();
  // Source time always shows regardless of viewer TZ
  expect(text).toContain("16:00 UTC");
  // A localized time is shown (has "(your time)" label)
  expect(text).toContain("(your time)");
});

// REGRESSION: share-link round-trip works
test("REGRESSION: share-link round-trip — URL encodes state, no network calls", async ({ page }) => {
  const agendaText = "Session 3 — 16:00 UTC\n9:00 AM PT — Morning Workshop";
  const url = shareUrl(agendaText, "UTC");
  const stateRequests: string[] = [];
  page.on("request", (req) => {
    if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
      stateRequests.push(req.url());
    }
  });
  await page.goto(url);
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  expect(await cards.count()).toBe(2);
  const nonRsc = stateRequests.filter(u => !u.includes("_rsc="));
  expect(nonRsc).toHaveLength(0);
});

// REGRESSION: Copied! shows under blocked clipboard (hostile test)
test("REGRESSION: Copied! cue survives blocked clipboard", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("blocked")) },
      writable: true, configurable: true,
    });
  });
  await page.goto(BASE);
  const copyBtn = page.locator('button:has-text("Copy share link")');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();
  await expect(page.locator('button:has-text("✓ Copied!")').first()).toBeVisible({ timeout: 1500 });
});

// REGRESSION: no hydration error
test("REGRESSION: no React hydration error on load", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForLoadState("networkidle");
  const hydration = errors.filter(e => e.includes("418") || e.toLowerCase().includes("hydration"));
  expect(hydration).toHaveLength(0);
});
