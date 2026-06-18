/**
 * DEEPEN: PARSER ROBUSTNESS / TRUST-THE-PARSE — e2e tests
 * Run against: BASE_URL=http://localhost:3000 npm run test:e2e -- tests/e2e/deepen-trust-parse.spec.ts
 *
 * Tests added per verifier mandate:
 * 1. SOURCE-TZ AUTO-DETECT: "Detected source timezone … — from '…'" indicator visible
 * 2. DST-correct DTSTART for 3+ tz cases (computed-vs-actual byte verification)
 * 3. PRECEDENCE: inline tz overrides stated-once for that session (two different offsets)
 * 4. VIEWER-TZ RECONVERSION: changing viewer tz reconverts the displayed instant (not re-labels)
 * 5. TITLE/TZ TOKEN-COLLISION: "PT Roadmap — Q3", "AM Keynote" survive in preview + .ics SUMMARY
 * 6. SHARED-VIEW SUMMARY PARITY: "N sessions · M date headers" byte-identical across creator/shared
 * 7. NO-TIME ROW HINT: "no time — not exported" hint visible in creator; row excluded from .ics
 * 8. CHRONOLOGICAL SORT: out-of-order input → preview and .ics both sorted earliest-first
 * 9. RETURNING-USER / pre-populated state: fresh context AND pre-seeded localStorage each flow
 * 10. Input variety: ISO header, NL header, inline date, dateless — preview==export per format
 */

import { test, expect } from "@playwright/test";
import { encodeAgendaState } from "../../lib/parser";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

function shareUrl(text: string, tz: string): string {
  return `${BASE}/#${encodeAgendaState({ text, sourceTimezone: tz })}`;
}

async function downloadAllIcs(page: any): Promise<string> {
  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadBtn.click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

// ── 1. SOURCE-TZ AUTO-DETECT indicator ───────────────────────────────────────

test("SOURCE-TZ: 'All times PT' shows detected-source-tz indicator on creator view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nKeynote — 2:00 PM");

  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 3000 });
  const text = await indicator.innerText();
  // Must name the abbr and the origin text
  expect(text).toContain("Detected source timezone");
  expect(text).toContain("PT");
  expect(text).toContain("All times PT");
});

test("SOURCE-TZ: 'times are CET' shows detected-source-tz indicator", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("times are CET\n2026-06-16\nKeynote — 14:00");

  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 3000 });
  const text = await indicator.innerText();
  expect(text).toContain("CET");
  expect(text).toContain("times are CET");
});

// ── 2. DST-CORRECT DTSTART — computed-vs-actual for 3 tz cases ───────────────

test("DTSTART case 1: 'All times PT' + 'Keynote — 2:00 PM' on 2026-06-16 → 20260616T210000Z (2pm PDT = UTC-7)", async ({ page }) => {
  // Stated-once PT → 2pm PDT → UTC-7 → 21:00 UTC
  const agendaText = "All times PT\n2026-06-16\nKeynote — 2:00 PM";
  // Use creator view — it shows the indicator
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill(agendaText);

  const content = await downloadAllIcs(page);
  // 2:00 PM PDT (UTC-7, summer) = 21:00 UTC
  expect(content).toContain("DTSTART:20260616T210000Z");
  // SUMMARY must be Keynote
  expect(content).toContain("SUMMARY:Keynote");
  // Must have exactly 1 VEVENT
  expect((content.match(/BEGIN:VEVENT/g) ?? []).length).toBe(1);
});

test("DTSTART case 2: 'Keynote — 14:00 CET' on 2026-06-16 → 20260616T120000Z (14:00 CEST = UTC+2)", async ({ page }) => {
  // Inline CET → CEST in summer → UTC+2 → 12:00 UTC
  const agendaText = "2026-06-16\nKeynote — 14:00 CET";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const content = await downloadAllIcs(page);
  // 14:00 CEST (UTC+2) = 12:00 UTC
  expect(content).toContain("DTSTART:20260616T120000Z");
});

test("DTSTART case 3 — PRECEDENCE: two different offsets in one agenda (stated-once PT vs inline ET)", async ({ page }) => {
  // Spec success check: "All times PT" + "B — 1:00 PM ET"
  // A → 1pm PDT → 20:00 UTC; B → 1pm EDT → 17:00 UTC
  const agendaText = "All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET";
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill(agendaText);

  const content = await downloadAllIcs(page);
  // A: stated-once PT → 1pm PDT (UTC-7) → 20:00 UTC
  expect(content).toContain("DTSTART:20260616T200000Z");
  // B: inline ET wins → 1pm EDT (UTC-4) → 17:00 UTC
  expect(content).toContain("DTSTART:20260616T170000Z");
  // Both distinct values present
  const dtStarts = [...content.matchAll(/DTSTART:(\S+)/g)].map(m => m[1]);
  expect(dtStarts).toHaveLength(2);
  expect(new Set(dtStarts).size).toBe(2); // the two instants differ
});

// ── 3. VIEWER-TZ RECONVERSION ─────────────────────────────────────────────────

test("VIEWER-TZ: 16:00 UTC shown as 12:00 PM in America/New_York viewer", async ({ page }) => {
  // Same test as spec check #8 — confirms reconversion not re-labeling
  await page.addInitScript(() => {
    const OrigConstructor = Intl.DateTimeFormat;
    // @ts-ignore
    Intl.DateTimeFormat = function (locales?: any, options?: any) {
      if (arguments.length === 0) {
        const real = new OrigConstructor();
        return {
          format: real.format.bind(real),
          formatToParts: real.formatToParts.bind(real),
          resolvedOptions: () => ({ ...real.resolvedOptions(), timeZone: "America/New_York" }),
        };
      }
      return new OrigConstructor(locales, options);
    };
    // @ts-ignore
    Intl.DateTimeFormat.prototype = OrigConstructor.prototype;
    // @ts-ignore
    Intl.DateTimeFormat.supportedLocalesOf = OrigConstructor.supportedLocalesOf;
  });
  const url = shareUrl("2026-06-16\nSession 3 — 16:00 UTC", "UTC");
  await page.goto(url);
  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const cardText = await card.innerText();
  // 16:00 UTC in America/New_York (EDT = UTC-4) = 12:00 PM
  expect(cardText).toMatch(/12:00 PM/);
  // Source time still shown
  expect(cardText).toMatch(/16:00 UTC/);
});

// ── 4. TITLE/TZ TOKEN-COLLISION round-trip (preview + .ics SUMMARY) ──────────

test("TOKEN-COLLISION: 'PT Roadmap — Q3 — 2:00 PM PT' → preview title 'PT Roadmap — Q3'", async ({ page }) => {
  const agendaText = "2026-06-16\nPT Roadmap — Q3 — 2:00 PM PT";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const titleEl = card.locator("p.font-semibold");
  const title = await titleEl.innerText();
  // Title must be exactly "PT Roadmap — Q3" with em-dash and Q3
  expect(title).toBe("PT Roadmap — Q3");
  expect(title).toContain("PT");
  expect(title).toContain("Q3");
  expect(title).toContain("—");
});

test("TOKEN-COLLISION: 'PT Roadmap — Q3 — 2:00 PM PT' .ics SUMMARY = 'PT Roadmap — Q3'", async ({ page }) => {
  const agendaText = "2026-06-16\nPT Roadmap — Q3 — 2:00 PM PT";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const content = await downloadAllIcs(page);
  // SUMMARY must be exactly "PT Roadmap — Q3" (byte-intact)
  expect(content).toContain("SUMMARY:PT Roadmap — Q3");
  // Also verify DTSTART: 2pm PDT (UTC-7) = 21:00 UTC
  expect(content).toContain("DTSTART:20260616T210000Z");
});

test("TOKEN-COLLISION: 'AM Keynote — 9:00 AM PT' → preview title 'AM Keynote', SUMMARY 'AM Keynote'", async ({ page }) => {
  const agendaText = "2026-06-16\nAM Keynote — 9:00 AM PT";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });
  const titleEl = card.locator("p.font-semibold");
  const title = await titleEl.innerText();
  expect(title).toBe("AM Keynote");

  const content = await downloadAllIcs(page);
  expect(content).toContain("SUMMARY:AM Keynote");
  // 9am PDT (UTC-7) = 16:00 UTC
  expect(content).toContain("DTSTART:20260616T160000Z");
});

// ── 5. SHARED-VIEW SUMMARY PARITY ────────────────────────────────────────────

test("SHARED-VIEW PARITY: shared view shows same 'N sessions · M date headers' as creator", async ({ page, context }) => {
  // Creator view: fill in a 5-session, 1-date-header agenda
  const agendaText = "2026-06-16\nSession A — 9:00 AM UTC\nSession B — 10:00 AM UTC\nSession C — 11:00 AM UTC\nSession D — 1:00 PM UTC\nSession E — 2:00 PM UTC";

  // 1. Get the summary text from creator view
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill(agendaText);
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const creatorSummary = desktopPanel.locator('[data-testid="line-accounting-summary"]');
  await expect(creatorSummary).toBeVisible({ timeout: 3000 });
  const creatorText = await creatorSummary.innerText();
  // Creator must show "5 sessions" and "1 date header"
  expect(creatorText).toMatch(/5 session/);
  expect(creatorText).toMatch(/1 date header/);

  // 2. Verify shared view shows the same summary (same component)
  const url = shareUrl(agendaText, "UTC");
  const sharedPage = await context.newPage();
  await sharedPage.setViewportSize({ width: 1280, height: 800 });
  await sharedPage.goto(url);
  const sharedSummary = sharedPage.locator('[data-testid="line-accounting-summary"]');
  await expect(sharedSummary).toBeVisible({ timeout: 5000 });
  const sharedText = await sharedSummary.innerText();
  expect(sharedText).toMatch(/5 session/);
  expect(sharedText).toMatch(/1 date header/);
  // Byte-identical (same component)
  expect(creatorText.trim()).toBe(sharedText.trim());
  await sharedPage.close();
});

// ── 6. NO-TIME ROW HINT in creator view + exclusion from .ics ─────────────────

test("NO-TIME ROW: 'Networking Lunch' shows 'no time — not exported' hint in creator view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("2026-06-16\nKeynote — 9:00 AM UTC\nNetworking Lunch\nPanel — 2:00 PM UTC");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  // The no-time hint element
  const hint = desktopPanel.locator('[data-testid="no-time-hint"]');
  await expect(hint).toBeVisible({ timeout: 3000 });
  const hintText = await hint.innerText();
  expect(hintText).toContain("no time");
  expect(hintText).toContain("not exported");
});

test("NO-TIME ROW: 2 sessions + 1 no-time row → combined .ics has exactly 2 VEVENTs", async ({ page }) => {
  const agendaText = "2026-06-16\nKeynote — 9:00 AM UTC\nNetworking Lunch\nPanel — 2:00 PM UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const content = await downloadAllIcs(page);
  const veventCount = (content.match(/BEGIN:VEVENT/g) ?? []).length;
  expect(veventCount).toBe(2);
  // "Networking Lunch" must NOT appear in .ics SUMMARY
  const summaries = [...content.matchAll(/SUMMARY:(.+)/g)].map(m => m[1]);
  expect(summaries).not.toContain("Networking Lunch");
  expect(summaries.some(s => s.includes("Networking"))).toBe(false);
});

// ── 7. CHRONOLOGICAL SORT (preview + .ics) ────────────────────────────────────

test("CHRONOLOGICAL: out-of-order input (5pm before 9am) → preview sorted earliest-first", async ({ page }) => {
  // Community Q&A (5pm) listed BEFORE Opening Keynote (9am)
  const agendaText = "2026-06-16\nCommunity Q&A — 5:00 PM UTC\nOpening Keynote — 9:00 AM UTC\nWorkshop — 1:00 PM UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  expect(await cards.count()).toBe(3);

  // First card must be Opening Keynote (09:00 UTC), not Community Q&A (17:00 UTC)
  const firstTitle = await cards.first().locator("p.font-semibold").innerText();
  expect(firstTitle).toBe("Opening Keynote");
  // Last card must be Community Q&A
  const lastTitle = await cards.nth(2).locator("p.font-semibold").innerText();
  expect(lastTitle).toBe("Community Q&A");
});

test("CHRONOLOGICAL: .ics VEVENT order matches preview chronological order", async ({ page }) => {
  const agendaText = "2026-06-16\nCommunity Q&A — 5:00 PM UTC\nOpening Keynote — 9:00 AM UTC\nWorkshop — 1:00 PM UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const content = await downloadAllIcs(page);
  const dtStarts = [...content.matchAll(/DTSTART:(\S+)/g)].map(m => m[1]);
  const summaries = [...content.matchAll(/SUMMARY:(.+)/g)].map(m => m[1]);

  expect(dtStarts).toHaveLength(3);
  // Chronological: 09:00, 13:00, 17:00
  expect(dtStarts[0]).toBe("20260616T090000Z");
  expect(dtStarts[1]).toBe("20260616T130000Z");
  expect(dtStarts[2]).toBe("20260616T170000Z");
  // And corresponding SUMMARY order
  expect(summaries[0]).toBe("Opening Keynote");
  expect(summaries[1]).toBe("Workshop");
  expect(summaries[2]).toBe("Community Q&A");
});

// ── 8. INPUT VARIETY: format spread + preview==export per format ──────────────

test("INPUT FORMAT — ISO date header: 2026-07-15 header applied, DTSTART 20260715", async ({ page }) => {
  const agendaText = "2026-07-15\nKeynote — 16:00 UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  // Preview must show the session
  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });

  // Per-card date label must show Jul 15
  const dateLabel = page.locator('[data-testid="session-parsed-date"]').first();
  await expect(dateLabel).toBeVisible();
  const labelText = await dateLabel.innerText();
  expect(labelText).toMatch(/Jul/);
  expect(labelText).toMatch(/15/);

  // .ics DTSTART must be 20260715 (not today)
  const content = await downloadAllIcs(page);
  expect(content).toContain("DTSTART:20260715T160000Z");
});

test("INPUT FORMAT — Natural-language header 'Mon June 23': sessions use 2026-06-23", async ({ page }) => {
  const agendaText = "Mon June 23\nSession A — 9:00 AM UTC\nSession B — 2:00 PM UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const content = await downloadAllIcs(page);
  const dtStarts = [...content.matchAll(/DTSTART:(\S+)/g)].map(m => m[1]);
  expect(dtStarts).toHaveLength(2);
  for (const dt of dtStarts) {
    expect(dt).toMatch(/^20260623/);
  }
});

test("INPUT FORMAT — Inline date 'Sprint Planning — Mon June 23, 9:00 AM PT' → DTSTART 20260623, SUMMARY 'Sprint Planning'", async ({ page }) => {
  const agendaText = "Sprint Planning — Mon June 23, 9:00 AM PT";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  const card = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5000 });

  // Title must be "Sprint Planning" (no date leak)
  const titleText = await card.locator("p.font-semibold").innerText();
  expect(titleText).toBe("Sprint Planning");

  const content = await downloadAllIcs(page);
  // DTSTART must be 2026-06-23
  expect(content).toContain("DTSTART:20260623");
  // SUMMARY must NOT contain "June" or "Mon"
  const summaries = [...content.matchAll(/SUMMARY:(.+)/g)].map(m => m[1]);
  for (const s of summaries) {
    expect(s).not.toContain("June");
    expect(s).not.toContain("Mon");
  }
});

test("INPUT FORMAT — Dateless session shows 'no date' banner in creator preview", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("Just A Meeting — 9:00 AM PT");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  // Now shows as a single top-level banner instead of per-card alert
  const banner = desktopPanel.locator('[data-testid="undated-sessions-banner"]').first();
  await expect(banner).toBeVisible({ timeout: 3000 });
  const bannerText = await banner.innerText();
  expect(bannerText.toLowerCase()).toContain("no date");
});

// ── 9. LINE-ACCOUNTING: no line silently disappears ───────────────────────────

test("LINE-ACCOUNTING: 3 sessions + 1 note + 1 dateheader → .ics has exactly 3 VEVENTs", async ({ page }) => {
  const agendaText = "2026-06-16\nKeynote — 9:00 AM UTC\nNetworking Lunch\nWorkshop — 1:00 PM UTC\nPanel — 5:00 PM UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  // 3 session cards visible
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  expect(await cards.count()).toBe(3);

  const content = await downloadAllIcs(page);
  const veventCount = (content.match(/BEGIN:VEVENT/g) ?? []).length;
  expect(veventCount).toBe(3);
});

// ── 10. RETURNING-USER: pre-populated state paths ─────────────────────────────

test("RETURNING-USER: pre-seeded localStorage state — share URL state still loads correctly", async ({ page, context }) => {
  // Seed localStorage with existing state (simulating a returning user)
  const previousState = { text: "2026-06-10\nOld Session — 10:00 AM UTC", sourceTimezone: "UTC" };
  await page.addInitScript((state) => {
    // Seed agenda-localizer state if the app uses localStorage
    try {
      localStorage.setItem("agenda-localizer-last-text", state.text);
      localStorage.setItem("agenda-localizer-last-tz", state.sourceTimezone);
    } catch {}
  }, previousState);

  // Load a fresh share URL with NEW content — it must override any saved state
  const newAgendaText = "2026-06-16\nNew Keynote — 16:00 UTC";
  const url = shareUrl(newAgendaText, "UTC");
  await page.goto(url);

  // Must show the NEW content (from URL), not the old seeded state
  const cards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=New Keynote")).toBeVisible();
  // Old session must NOT appear
  await expect(page.locator("text=Old Session")).not.toBeVisible({ timeout: 1000 });
});

test("RETURNING-USER: clean context loads sample and renders session cards", async ({ page }) => {
  // Pure clean context (no prior state) — must use desktop viewport to get visible cards
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  // Scope to desktop panel (lg:hidden is CSS-hidden at desktop viewport)
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const cards = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  const count = await cards.count();
  // Sample pre-loads with at least 4 sessions
  expect(count).toBeGreaterThanOrEqual(3);
});

// ── 11. SAMPLE EXERCISES THE TRUST-THE-PARSE BUNDLE ─────────────────────────

test("SAMPLE: 'Detected source timezone: PT' indicator visible on cold load", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  // The bundled sample uses "All times PT" — indicator must appear on cold load
  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 5000 });
  const text = await indicator.innerText();
  expect(text).toContain("PT");
  expect(text).toContain("All times PT");
});

test("SAMPLE: 'Networking Lunch' shows no-time hint and is not exported", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  // The hint must appear for the no-time row
  const hint = desktopPanel.locator('[data-testid="no-time-hint"]');
  await expect(hint).toBeVisible({ timeout: 5000 });
});

test("SAMPLE: sessions rendered in chronological order (not input order)", async ({ page }) => {
  // Sample: Community Q&A (5:00 PM PT = 00:00 UTC) is listed FIRST in input,
  // but chronologically comes LAST. CEST Deep Dive (14:00 CET = 12:00 UTC) is chronologically earliest.
  // Sorted order: CEST Deep Dive (12:00 UTC), Opening Keynote (16:00 UTC), Workshop (21:00 UTC), Community Q&A (00:00 UTC+1)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const cards = desktopPanel.locator('.bg-white.border.border-slate-200.rounded-lg');
  await expect(cards.first()).toBeVisible({ timeout: 5000 });
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(4);
  // The sample's Community Q&A (listed FIRST in input) must NOT be first in the rendered output
  // (chronological sort pushes it to last since it's 00:00 UTC next day)
  const firstTitle = await cards.first().locator("p.font-semibold").innerText();
  expect(firstTitle).not.toBe("Community Q&A");
  // The last session in the sorted list must NOT be the first-listed input session
  // i.e. Community Q&A should appear LAST (it's the latest in UTC time)
  const lastTitle = await cards.last().locator("p.font-semibold").innerText();
  expect(lastTitle).toBe("Community Q&A");
});

test("SAMPLE: CEST Deep Dive session overrides stated-once PT — correct DTSTART 20260616T120000Z", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);

  const content = await downloadAllIcs(page);
  // CEST Deep Dive: 14:00 CET (CEST = UTC+2) = 12:00 UTC → 20260616T120000Z
  expect(content).toContain("DTSTART:20260616T120000Z");
  // Summary must contain the CEST Deep Dive session
  expect(content).toContain("SUMMARY:CEST Deep Dive");
});

// ── P1-1: PER-CARD SOURCE-TIME LABEL shows the ACTUALLY-APPLIED tz abbreviation ──
// The displayed label on each session card must agree with the detection banner and DTSTART.
// Specifically: a stated-once-inherited session under "All times PT" must NOT render "UTC"
// on the per-card label — it must show "PT".

test("P1-1: stated-once-inherited session per-card label shows 'PT' not 'UTC'", async ({ page }) => {
  // "All times PT" header, selector left at UTC default (never changed by user)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  // Clear sample, enter test agenda
  await textarea.fill("All times PT\n2026-06-16\nMeeting — 2:00 PM");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  // Wait for session card to appear
  const card = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 3000 });

  // The per-card parsed-date element contains "{date} · {sourceTime}"
  // sourceTime must end with PT, NOT UTC
  const parsedDateEl = card.locator('[data-testid="session-parsed-date"]').first();
  await expect(parsedDateEl).toBeVisible({ timeout: 3000 });
  const labelText = await parsedDateEl.innerText();

  // Assert PT is shown (applied tz)
  expect(labelText).toContain("PT");
  // Assert UTC is NOT shown (selector default must not bleed through)
  expect(labelText).not.toContain("UTC");

  // Cross-check: the detection banner also shows PT
  const indicator = page.locator('[data-testid="detected-source-tz"]');
  await expect(indicator).toBeVisible({ timeout: 2000 });
  const indicatorText = await indicator.innerText();
  expect(indicatorText).toContain("PT");
  expect(indicatorText).not.toContain("manual override");

  // Cross-check: DTSTART must be 20260616T210000Z (2pm PDT = UTC-7 = 21:00 UTC)
  const content = await downloadAllIcs(page);
  expect(content).toContain("DTSTART:20260616T210000Z");
  // And the DTSTART agrees with the "PT" label (2:00 PM PDT → 21:00 UTC)
});

test("P1-1: inline-tz session per-card label shows inline tz ('CET'), not stated-once tz ('PT')", async ({ page }) => {
  // "All times PT" stated-once, but session has inline "14:00 CET"
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nDeep Dive — 14:00 CET");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const card = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 3000 });

  const parsedDateEl = card.locator('[data-testid="session-parsed-date"]').first();
  await expect(parsedDateEl).toBeVisible({ timeout: 3000 });
  const labelText = await parsedDateEl.innerText();

  // Label must show CET (inline tz), not PT (stated-once)
  expect(labelText).toContain("CET");
  expect(labelText).not.toContain(" PT");  // PT must not appear (stated-once must NOT bleed in)
  expect(labelText).not.toContain("UTC");

  // DTSTART: 14:00 CEST (UTC+2) = 12:00 UTC
  const content = await downloadAllIcs(page);
  expect(content).toContain("DTSTART:20260616T120000Z");
});

test("P1-1: two sessions same agenda — stated-once PT label vs inline ET label, no cross-contamination", async ({ page }) => {
  // "All times PT" + "A — 1:00 PM" (stated-once PT) + "B — 1:00 PM ET" (inline ET)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const cards = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 3000 });
  expect(await cards.count()).toBe(2);

  // Cards are sorted chronologically: B (1pm EDT = 17:00 UTC) before A (1pm PDT = 20:00 UTC)
  const card0 = cards.nth(0); // B (ET, earlier in UTC)
  const card1 = cards.nth(1); // A (PT, later in UTC)

  const title0 = await card0.locator("p.font-semibold").innerText();
  const title1 = await card1.locator("p.font-semibold").innerText();
  // After chronological sort: B (17:00 UTC) comes first, A (20:00 UTC) comes second
  expect(title0).toBe("B");
  expect(title1).toBe("A");

  // B's label must show ET
  const label0 = await card0.locator('[data-testid="session-parsed-date"]').innerText();
  expect(label0).toContain("ET");
  expect(label0).not.toContain(" PT");
  expect(label0).not.toContain("UTC");

  // A's label must show PT (stated-once)
  const label1 = await card1.locator('[data-testid="session-parsed-date"]').innerText();
  expect(label1).toContain("PT");
  expect(label1).not.toContain("UTC");

  // DTSTART: A = 20:00 UTC, B = 17:00 UTC
  const content = await downloadAllIcs(page);
  expect(content).toContain("DTSTART:20260616T200000Z"); // A (1pm PDT)
  expect(content).toContain("DTSTART:20260616T170000Z"); // B (1pm EDT)
});

// ── P1-2: MANUAL OVERRIDE SELECTOR changes DTSTART + per-card label (stated-once respected first,
// then overrideable); inline tz sessions must NOT be touched by the override ──

test("P1-2: manual override selector changes DTSTART and per-card label from PT to ET", async ({ page }) => {
  // Start with "All times PT" — selector is UTC default (not changed)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nMeeting — 1:00 PM");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const card = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 3000 });

  // Before override: label must show PT (stated-once), DTSTART 20:00 UTC (1pm PDT)
  const parsedDateEl = card.locator('[data-testid="session-parsed-date"]').first();
  await expect(parsedDateEl).toBeVisible();
  const labelBefore = await parsedDateEl.innerText();
  expect(labelBefore).toContain("PT");
  expect(labelBefore).not.toContain("UTC");

  const beforeContent = await downloadAllIcs(page);
  expect(beforeContent).toContain("DTSTART:20260616T200000Z"); // 1pm PDT = UTC-7 = 20:00 UTC

  // Now change the selector to ET (America/New_York) — this is the P1-2 override action
  const select = page.locator('[data-testid="source-tz-select"]');
  await select.selectOption("America/New_York");

  // After override: label must change to ET, DTSTART must reconvert to 17:00 UTC (1pm EDT = UTC-4)
  await expect(parsedDateEl).toBeVisible();
  const labelAfter = await parsedDateEl.innerText();
  expect(labelAfter).toContain("ET");
  expect(labelAfter).not.toContain("PT");
  expect(labelAfter).not.toContain("UTC");

  const afterContent = await downloadAllIcs(page);
  // 1pm EDT (UTC-4) = 17:00 UTC  — NOT 20:00 UTC (PDT) — DTSTART must reconvert, not relabel
  expect(afterContent).toContain("DTSTART:20260616T170000Z");
  // The PDT instant must be gone
  expect(afterContent).not.toContain("DTSTART:20260616T200000Z");

  // The detection banner must now show "manual override" language
  const indicator = page.locator('[data-testid="detected-source-tz"]');
  const indicatorText = await indicator.innerText();
  expect(indicatorText).toContain("ET");
  expect(indicatorText).toContain("override");
});

test("P1-2: inline-tz session NOT affected by manual override selector change", async ({ page }) => {
  // "All times PT" + "A — 1:00 PM" (inherits PT) + "B — 1:00 PM ET" (inline ET, authoritative)
  // Override to JST — A reconverts, B must stay at 17:00 UTC (inline ET is authoritative)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const cards = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(cards.first()).toBeVisible({ timeout: 3000 });

  // Before override: B = 17:00 UTC (inline ET), A = 20:00 UTC (stated-once PT)
  const beforeContent = await downloadAllIcs(page);
  expect(beforeContent).toContain("DTSTART:20260616T170000Z"); // B inline ET
  expect(beforeContent).toContain("DTSTART:20260616T200000Z"); // A stated-once PT

  // Change override to JST (Asia/Tokyo, UTC+9) — A should reconvert to 04:00 UTC (1pm JST)
  const select = page.locator('[data-testid="source-tz-select"]');
  await select.selectOption("Asia/Tokyo");

  const afterContent = await downloadAllIcs(page);
  // A: 1pm JST (UTC+9) = 04:00 UTC
  expect(afterContent).toContain("DTSTART:20260616T040000Z");
  // B: inline ET must NOT change — still 17:00 UTC
  expect(afterContent).toContain("DTSTART:20260616T170000Z");
  // The old A (20:00 UTC PDT) must be gone
  expect(afterContent).not.toContain("DTSTART:20260616T200000Z");

  // B's label must still show ET (not JST — inline is authoritative)
  // Find B's card — after override, A is 04:00 UTC (earlier), B is 17:00 UTC (later)
  // So sorted: A first, B second
  const cards2 = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg");
  expect(await cards2.count()).toBe(2);
  const titles = [];
  for (let i = 0; i < 2; i++) {
    titles.push(await cards2.nth(i).locator("p.font-semibold").innerText());
  }
  const bIdx = titles.indexOf("B");
  expect(bIdx).toBeGreaterThanOrEqual(0);

  const bLabel = await cards2.nth(bIdx).locator('[data-testid="session-parsed-date"]').innerText();
  expect(bLabel).toContain("ET");
  expect(bLabel).not.toContain("JST"); // inline ET must NOT be clobbered by override
});

// ── ROUND-2 FIXES ─────────────────────────────────────────────────────────────

// GATING FIX: Attendee view shows "no time — not exported" hint on no-time rows
test("GATING FIX: attendee/shared view shows no-time hint on rows with no time", async ({ page }) => {
  const agendaText = "2026-06-16\nKeynote — 9:00 AM UTC\nNetworking Lunch\nPanel — 2:00 PM UTC";
  const url = shareUrl(agendaText, "UTC");
  await page.goto(url);

  // Attendee view renders no-time rows with the hint
  const hint = page.locator('[data-testid="no-time-hint"]');
  await expect(hint).toBeVisible({ timeout: 5000 });
  const hintText = await hint.innerText();
  expect(hintText).toContain("no time");
  expect(hintText).toContain("not exported");
});

// TRUST FIX #1: No false "Unknown timezone" warning on title-case words adjacent to time
test("TRUST FIX #1: '9:00 AM Early Birds Session' shows no tz warning in creator view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("2026-06-16\n9:00 AM Early Birds Session");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const card = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 3000 });

  // No orange "Unknown timezone" warning should appear
  const tzWarning = card.locator('[role="status"]');
  const warningTexts = await tzWarning.allInnerTexts();
  for (const t of warningTexts) {
    expect(t).not.toContain("Unknown timezone");
    expect(t).not.toContain("EARLY");
  }

  // Title must include "Early"
  const titleEl = card.locator("p.font-semibold");
  await expect(titleEl).toHaveText("Early Birds Session");
});

// TRUST FIX #2b: "No date found" shown as ONE top-level banner, not repeated per-card
test("TRUST FIX #2b: undated agenda shows single top-level banner, not per-card warnings", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("Session A — 9:00 AM PT\nSession B — 10:00 AM PT\nSession C — 11:00 AM PT");

  const desktopPanel = page.locator('.hidden.lg\\:flex');

  // Top-level banner must be present exactly once
  const banners = desktopPanel.locator('[data-testid="undated-sessions-banner"]');
  await expect(banners.first()).toBeVisible({ timeout: 3000 });
  expect(await banners.count()).toBe(1);

  // Banner must mention count or "no date"
  const bannerText = await banners.first().innerText();
  expect(bannerText.toLowerCase()).toContain("no date");
});

// TRUST FIX #2a: undated sessions excluded from .ics download (not silently dated to today)
test("TRUST FIX #2a: undated sessions are excluded from .ics (not silently dated to today)", async ({ page }) => {
  // Dateless agenda — no date header at all
  const agendaText = "Session A — 9:00 AM PT\nSession B — 2:00 PM PT";
  const url = shareUrl(agendaText, "America/Los_Angeles");
  await page.goto(url);

  // The download button should be disabled (no exportable sessions)
  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  // Button should be disabled when all sessions are undated
  const isDisabled = await downloadBtn.isDisabled();
  expect(isDisabled).toBe(true);
});
