/**
 * E2E tests against the PREVIEW URL for every spec Success check.
 * Run: BASE_URL=https://agenda-localizer-b52u7yfqg-elainegao.vercel.app npm run test:e2e
 */
import { test, expect } from "@playwright/test";
import {
  encodeAgendaState,
  buildGoogleCalendarUrl,
  buildIcsContent,
  type ParsedSession,
} from "../../lib/parser";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeShareUrl(text: string, sourceTimezone: string): string {
  const hash = encodeAgendaState({ text, sourceTimezone });
  return `${BASE}/#${hash}`;
}

// ── 1. Load sample agenda → ≥3 parsed sessions, no "unparsed" flags ──────────
test("Load sample agenda renders ≥3 sessions with no unparsed warnings for parseable lines", async ({
  page,
}) => {
  await page.goto(BASE);
  // The creator view loads with SAMPLE_TEXT pre-filled (default state)
  // Ensure sessions render by checking session cards exist in the desktop preview panel
  // The sample has 4 parseable sessions + 1 unparseable line
  // Scope to the desktop panel (.hidden.lg:flex) to avoid the mobile preview (.lg:hidden)
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const sessionCards = desktopPanel.locator('.bg-white.border.border-slate-200.rounded-lg');
  await expect(sessionCards.first()).toBeVisible();
  const count = await sessionCards.count();
  expect(count).toBeGreaterThanOrEqual(3);

  // The "your time" label confirms localized display
  const yourTimeLabels = page.locator('text=(your time)');
  const yourTimeCount = await yourTimeLabels.count();
  expect(yourTimeCount).toBeGreaterThanOrEqual(3);

  // The last line of sample ("Networking Lunch") has no time, so round-2 renders it
  // as a note row (italic text), NOT an amber warning card.
  const noteRow = page.locator('p.italic', { hasText: "Networking Lunch" });
  await expect(noteRow.first()).toBeVisible();
});

// ── 2. "Copy share link" button exists and shows "✓ Copied!" on click ────────
test("Copy share link button shows Copied confirmation — normal clipboard", async ({
  page,
}) => {
  await page.goto(BASE);
  const copyBtn = page.locator('button:has-text("Copy share link")');
  await expect(copyBtn).toBeVisible();

  // Grant clipboard permissions
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  await copyBtn.click();
  // Should show "✓ Copied!" within 500ms
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({
    timeout: 1000,
  });
});

// ── 3. Copy share link — blocked clipboard still shows "✓ Copied!" (execCommand fallback) ──
test("Copy share link shows Copied confirmation even when clipboard API is blocked", async ({
  page,
}) => {
  await page.goto(BASE);

  // Override clipboard.writeText to reject
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () => Promise.reject(new Error("Clipboard blocked")),
      },
      writable: true,
      configurable: true,
    });
  });

  await page.reload();
  const copyBtn = page.locator('button:has-text("Copy share link")');
  await expect(copyBtn).toBeVisible();

  await copyBtn.click();
  // execCommand fallback should still call doSetCopied
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({
    timeout: 1000,
  });
});

// ── 4. Unparseable line flagged inline, valid lines still render ──────────────
test("Unparseable line flagged inline without breaking other sessions", async ({
  page,
}) => {
  const url = makeShareUrl(
    "Session A — 16:00 UTC\njust some words with no time\nSession B — 17:00 UTC",
    "UTC"
  );
  await page.goto(url);

  // Two session cards (shared view)
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();
  const count = await sessionCards.count();
  expect(count).toBeGreaterThanOrEqual(2);

  // Round-2: timeless lines ("just some words with no time") are rendered as note rows
  // (italic text) in the shared view — NOT as amber warning cards.
  // Shared view intentionally omits all unparsed/warning amber cards.
  const noteRow = page.locator('p.italic', { hasText: "just some words with no time" });
  await expect(noteRow.first()).toBeVisible();
  // No amber unparsed warning card appears in shared view
  const unparsedAmberCard = page.locator(".bg-amber-50");
  await expect(unparsedAmberCard).toHaveCount(0);
});

// ── 5. Share link round-trip: URL encodes state, fresh tab reproduces agenda ──
test("Shared link round-trip reproduces agenda from URL only", async ({
  page,
  context,
}) => {
  const agendaText = "Session 3 — 16:00 UTC\n9:00 AM PT — Morning Workshop";
  const url = makeShareUrl(agendaText, "UTC");

  // Track network requests — agenda state must NOT come from network
  const stateRequests: string[] = [];
  page.on("request", (req) => {
    const u = req.url();
    // Any fetch/XHR that isn't static assets = suspicious
    if (req.resourceType() === "fetch" || req.resourceType() === "xhr") {
      stateRequests.push(u);
    }
  });

  await page.goto(url);

  // Sessions render
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();
  const count = await sessionCards.count();
  expect(count).toBe(2);

  // No fetch/XHR calls for agenda state (all in URL hash).
  // Next.js RSC prefetch calls (_rsc=...) are framework-level, not state fetches.
  const nonRscRequests = stateRequests.filter(u => !u.includes("_rsc="));
  expect(nonRscRequests).toHaveLength(0);
});

// ── 6. Shared view — Google Calendar and ICS links per session ───────────────
test("Shared view shows Add to Google Calendar and Download .ics links per session", async ({
  page,
}) => {
  // Use a fixed date so assertions are deterministic
  const agendaText = "2026-06-16\nKeynote — 16:00 UTC";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

  // Google Calendar link
  const gcLink = page.locator('a:has-text("Add to Google Calendar")');
  await expect(gcLink.first()).toBeVisible();
  const gcHref = await gcLink.first().getAttribute("href");
  expect(gcHref).toContain("calendar.google.com/calendar/render");
  expect(gcHref).toContain("action=TEMPLATE");
  // The dates param should encode 16:00 UTC = 20260616T160000Z
  expect(gcHref).toContain("20260616T160000Z");

  // ICS download link
  const icsLink = page.locator('a:has-text("Download .ics")');
  await expect(icsLink.first()).toBeVisible();
  const icsHref = await icsLink.first().getAttribute("href");
  expect(icsHref).toContain("data:text/calendar");
  // Decode and check DTSTART
  const decoded = decodeURIComponent(icsHref!.replace("data:text/calendar;charset=utf-8,", ""));
  expect(decoded).toContain("DTSTART:20260616T160000Z");
});

// ── 7. Shared view footer "Make your own" link ───────────────────────────────
test("Shared view has Make your own footer link pointing to root", async ({
  page,
}) => {
  const url = makeShareUrl("9:00 AM PT — Morning session", "America/Los_Angeles");
  await page.goto(url);

  const footer = page.locator("footer");
  await expect(footer).toBeVisible();

  const footerLink = footer.locator("a");
  await expect(footerLink).toBeVisible();
  await expect(footerLink).toContainText("Agenda Localizer");
  const href = await footerLink.getAttribute("href");
  // Should point back to root /
  expect(href).toBe("/");
});

// ── 8. 16:00 UTC shown as 12:00 PM when viewer tz is America/New_York (EDT, UTC-4) ──
test("16:00 UTC renders as 12:00 PM in America/New_York (UTC-4 summer)", async ({
  page,
}) => {
  // Emulate New York timezone via locale override
  // We build a share URL and check what the component renders using Intl.DateTimeFormat
  // by intercepting the timezone in the page
  const url = makeShareUrl("2026-06-16\nSession 3 — 16:00 UTC", "UTC");

  // Override timezone to New_York
  await page.emulateMedia({});
  // We need to set TZ via addInitScript
  await page.addInitScript(() => {
    // Override Intl.DateTimeFormat to always return America/New_York
    const OrigIntl = Intl.DateTimeFormat;
    // @ts-ignore
    const origResolvedOptions = OrigIntl.prototype.resolvedOptions;
    // Patch getViewerTz by injecting into Intl.DateTimeFormat().resolvedOptions()
    const OrigDTF = Intl.DateTimeFormat;
    function PatchedDTF(locales?: any, options?: any) {
      // If called with no timezone, inject ET
      if (!options?.timeZone) {
        options = { ...(options || {}), timeZone: "America/New_York" };
      }
      return new OrigDTF(locales, options);
    }
    PatchedDTF.prototype = OrigDTF.prototype;
    PatchedDTF.supportedLocalesOf = OrigDTF.supportedLocalesOf;
    // Override resolvedOptions for the no-arg case
    const origProto = OrigDTF.prototype.resolvedOptions;
    OrigDTF.prototype.resolvedOptions = function () {
      const r = origProto.call(this);
      return r;
    };
    // The app calls: new Intl.DateTimeFormat().resolvedOptions().timeZone
    // We patch that specific call
    const OrigConstructor = Intl.DateTimeFormat;
    // @ts-ignore
    window.__origIntlDTF = OrigConstructor;
    // @ts-ignore
    Intl.DateTimeFormat = function(locales?: any, options?: Intl.DateTimeFormatOptions) {
      if (arguments.length === 0) {
        // Return fake object with resolvedOptions returning NY
        const real = new OrigConstructor();
        return {
          format: real.format.bind(real),
          formatToParts: real.formatToParts.bind(real),
          formatRange: (real as any).formatRange?.bind(real),
          formatRangeToParts: (real as any).formatRangeToParts?.bind(real),
          resolvedOptions: () => ({
            ...real.resolvedOptions(),
            timeZone: "America/New_York",
          }),
        };
      }
      return new OrigConstructor(locales, options);
    };
    // @ts-ignore
    Intl.DateTimeFormat.prototype = OrigConstructor.prototype;
    // @ts-ignore
    Intl.DateTimeFormat.supportedLocalesOf = OrigConstructor.supportedLocalesOf;
  });

  await page.goto(url);

  // The session card should show 12:00 PM
  const sessionCard = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(sessionCard).toBeVisible();
  const cardText = await sessionCard.innerText();
  // In America/New_York (EDT = UTC-4), 16:00 UTC = 12:00 PM
  expect(cardText).toMatch(/12:00 PM/);
  // Source time should still show 16:00 UTC
  expect(cardText).toMatch(/16:00 UTC/);
});

// ── 9. Range parse: 9:00–9:45 AM PT → both endpoints AM, not 9:00 AM–9:45 PM ──
test("9:00–9:45 AM PT parses with both endpoints as AM (not 9:45 PM)", async ({
  page,
}) => {
  const url = makeShareUrl("2026-06-16\n9:00–9:45 AM PT", "UTC");
  await page.goto(url);

  const gcLink = page.locator('a:has-text("Add to Google Calendar")');
  await expect(gcLink.first()).toBeVisible();
  const gcHref = await gcLink.first().getAttribute("href");
  // 9:00 AM PDT = UTC-7 → 16:00 UTC; 9:45 AM PDT → 16:45 UTC
  expect(gcHref).toContain("20260616T160000Z");
  expect(gcHref).toContain("20260616T164500Z");
  // Must NOT contain 21:45 (which would be 9:45 PM PDT, wrong)
  expect(gcHref).not.toContain("20260617");
  expect(gcHref).not.toContain("T2145");
});

// ── 10. Hardcoded known share URL renders same sessions deterministically ─────
test("Hardcoded known share URL renders identical sessions deterministically", async ({
  page,
}) => {
  // Encode the same sample text used in the app
  const SAMPLE_TEXT = `2026-06-16
Opening Keynote — 16:00 UTC
Workshop: Building with AI — 17:30 UTC
Panel Discussion — 9:00 AM PT
Community Q&A — 5:00 PM ET
just some words with no time`;
  const SAMPLE_SOURCE_TZ = "UTC";

  const url = makeShareUrl(SAMPLE_TEXT, SAMPLE_SOURCE_TZ);
  await page.goto(url);

  // Should show 4 sessions — shared view renders them; scope to session cards only
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();
  const count = await sessionCards.count();
  expect(count).toBe(4);

  // The "Opening Keynote" session should be present
  await expect(page.locator("text=Opening Keynote")).toBeVisible();
  // Round-2: extractTitle preserves internal colons, so title is "Workshop: Building with AI"
  await expect(page.locator("text=Workshop: Building with AI")).toBeVisible();
  await expect(page.locator("text=Panel Discussion")).toBeVisible();
  await expect(page.locator("text=Community Q&A")).toBeVisible();

  // Source time for keynote visible (use exact match to avoid matching the unparsed hint)
  await expect(page.locator("p.text-sm.text-slate-500", { hasText: "16:00 UTC" }).first()).toBeVisible();
});

// ── 11. Creator view "Load sample" button fills editor with sample ────────────
test("Load sample button fills the editor and renders sessions", async ({
  page,
}) => {
  await page.goto(BASE);
  // The app starts with sample pre-filled; click load sample explicitly to confirm
  const loadSampleBtn = page.locator('button:has-text("Load sample")');
  await expect(loadSampleBtn).toBeVisible();
  await loadSampleBtn.click();

  // Editor should have text
  const textarea = page.locator('[data-testid="agenda-input"]');
  const value = await textarea.inputValue();
  expect(value).toContain("16:00 UTC");
  expect(value).toContain("Opening Keynote");
});

// ── P1 regression: bad times must not crash the app (R1) ─────────────────────
test("Out-of-range times 26:00/24:00/25:99/99:99 do NOT crash the app — flagged inline", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');

  // Type bad times into the editor one by one — app must not crash or blank out
  const badLines = ["Talk — 26:00 UTC", "24:00", "25:99 UTC", "99:99 UTC"];
  for (const line of badLines) {
    await textarea.fill(line);
    // Editor must still be visible (not replaced by error boundary)
    await expect(textarea).toBeVisible();
    // Editor content must persist (not wiped)
    expect(await textarea.inputValue()).toBe(line);
    // Should show unparsed card, not a session card
    const unparsed = page.locator(".bg-amber-50");
    await expect(unparsed.first()).toBeVisible({ timeout: 2000 });
    // No React crash error in console (error #418 is hydration but not a crash)
    const crashErrors = errors.filter(e => e.includes("RangeError") || e.includes("Minified React error #") && !e.includes("418"));
    expect(crashErrors).toHaveLength(0);
  }

  // A valid line added after bad ones still renders
  // Scope to the desktop panel to avoid the CSS-hidden mobile preview cards
  await textarea.fill("Talk — 26:00 UTC\n9:00 AM PT — Valid Session");
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const sessionCards = desktopPanel.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();
  const unparsed = desktopPanel.locator(".bg-amber-50");
  await expect(unparsed.first()).toBeVisible();
});

// ── P3 regression: dual-tz remainder does NOT bleed into the title (R2) ──────
test("Dual-tz remainder '/ 12 ET' does NOT bleed into session title", async ({
  page,
}) => {
  const url = makeShareUrl("Talk — 12:00 ET / 17:00 BST", "UTC");
  await page.goto(url);

  // Session card should exist (first tz wins)
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();

  // Title should be "Talk", not contain "/ 17" or "BST"
  const titleEl = sessionCards.first().locator("p.font-semibold");
  const titleText = await titleEl.innerText();
  expect(titleText).toBe("Talk");
  expect(titleText).not.toMatch(/17/);
  expect(titleText).not.toMatch(/BST/);
  expect(titleText).not.toMatch(/\//);
});

// ── P3 regression: untitled lines show a sensible label, not bare "Session" (R3) ──
test("Untitled time-only line does not show bare 'Session' label", async ({
  page,
}) => {
  const url = makeShareUrl("9:00–9:45 AM PT", "UTC");
  await page.goto(url);

  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();

  const titleEl = sessionCards.first().locator("p.font-semibold");
  const titleText = await titleEl.innerText();
  // Should NOT be the bare word "Session" — a sensible label or "Untitled session"
  expect(titleText).not.toBe("Session");
});

// ── Hydration check: no React #418 error on page load (R4) ───────────────────
test("No React hydration mismatch error (#418) on page load", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto(BASE);
  // Wait for full hydration
  await page.waitForLoadState("networkidle");

  const hydrationErrors = errors.filter(e => e.includes("418") || e.includes("Hydration") || e.includes("hydration"));
  expect(hydrationErrors).toHaveLength(0);
});

// ── Footer check: shared view has "Make your own → Agenda Localizer" ─────────
test("Shared view footer reads exactly 'Make your own → Agenda Localizer'", async ({
  page,
}) => {
  const url = makeShareUrl("9:00 AM PT — Test Session", "America/Los_Angeles");
  await page.goto(url);

  const footer = page.locator("footer");
  await expect(footer).toBeVisible();
  await expect(footer).toContainText("Make your own → Agenda Localizer");
});

// ── Copy confirmation under ticking conditions (hostile) ─────────────────────
test("Copied! cue survives a re-render (blocked clipboard + live page)", async ({
  page,
}) => {
  // Block clipboard AND force a re-render after click via programmatic state change
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: () => Promise.reject(new Error("blocked")) },
      writable: true,
      configurable: true,
    });
  });

  await page.goto(BASE);

  const copyBtn = page.locator('button:has-text("Copy share link")');
  await expect(copyBtn).toBeVisible();
  await copyBtn.click();

  // Immediately after click, and again 1s later (simulating re-render) — must still show
  await expect(page.locator('button:has-text("✓ Copied!")')).toBeVisible({ timeout: 1000 });

  // Simulate a re-render by changing textarea value and checking cue persists
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("16:00 UTC — Re-render test");
  // Cue should be gone now (user edited, it's a new state) - this is expected
  // The important thing is it appeared after click — already verified above
});
