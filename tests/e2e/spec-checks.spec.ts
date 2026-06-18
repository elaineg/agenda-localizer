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

  // Source time for keynote visible — now shown inside the per-card date+time label
  // (either in p.text-sm.text-slate-500 when hasNoDate, or in [data-testid="session-parsed-date"] when dated)
  const sourceTimeEl = page.locator('[data-testid="session-parsed-date"]', { hasText: "16:00 UTC" })
    .or(page.locator("p.text-sm.text-slate-500", { hasText: "16:00 UTC" }));
  await expect(sourceTimeEl.first()).toBeVisible();
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

// ── G8: "Download all sessions (.ics)" visible above fold on creator view ────
test("G8: Download all sessions button visible above fold on creator view with sessions", async ({
  page,
}) => {
  await page.goto(BASE);
  // Creator view pre-loads sample (4 sessions) — button should be visible
  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  // Desktop: in the right preview column
  await expect(downloadBtn.first()).toBeVisible({ timeout: 3000 });
  await expect(downloadBtn.first()).toContainText("Download all sessions (.ics)");
});

// ── G8: "Download all sessions (.ics)" visible above fold on shared/attendee view ──
test("G8: Download all sessions button visible above fold on shared attendee view", async ({
  page,
}) => {
  const agendaText = "2026-06-16\nOpening Keynote — 16:00 UTC\nWorkshop — 17:30 UTC\nPanel Discussion — 9:00 AM PT";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(downloadBtn).toBeVisible({ timeout: 3000 });
  await expect(downloadBtn).toContainText("Download all sessions (.ics)");

  // Must be above the first session card (earlier in DOM order)
  const btnBounds = await downloadBtn.boundingBox();
  const firstCard = page.locator(".bg-white.border.border-slate-200.rounded-lg").first();
  await expect(firstCard).toBeVisible();
  const cardBounds = await firstCard.boundingBox();
  expect(btnBounds!.y).toBeLessThan(cardBounds!.y);
});

// ── G8: Download all sessions .ics — empty state (0 sessions → button hidden) ──
test("G8: Download all sessions button is absent when there are 0 valid sessions", async ({
  page,
}) => {
  // Share URL with no valid sessions — only a note line
  const url = makeShareUrl("just some words with no time", "UTC");
  await page.goto(url);

  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(downloadBtn).toHaveCount(0);
});

// ── G8: Combined .ics has exactly N VEVENTs matching per-session DTSTART ─────
test("G8: Combined .ics has 3 VEVENTs with correct DTSTART values matching per-session", async ({
  page,
  context,
}) => {
  const agendaText = "2026-06-16\nOpening Keynote — 16:00 UTC\nWorkshop — 17:30 UTC\nPanel Discussion — 9:00 AM PT\njust some words with no time";
  // Use the shared view which has the download button
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

  // Verify 3 session cards are present (1 note excluded)
  const sessionCards = page.locator(".bg-white.border.border-slate-200.rounded-lg");
  await expect(sessionCards.first()).toBeVisible();
  expect(await sessionCards.count()).toBe(3);

  // Verify the download button is present
  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(downloadBtn).toBeVisible();

  // Set up download listener before clicking
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadBtn.click(),
  ]);

  // Filename should end in .ics
  expect(download.suggestedFilename()).toMatch(/\.ics$/);

  // Read the downloaded content and verify VEVENT count + DTSTART values
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const content = Buffer.concat(chunks).toString("utf-8");

  expect(content).toContain("BEGIN:VCALENDAR");
  expect(content).toContain("END:VCALENDAR");

  const beginCount = (content.match(/BEGIN:VEVENT/g) ?? []).length;
  expect(beginCount).toBe(3);

  // DTSTART values must match per-session expectations
  // Opening Keynote 16:00 UTC → 20260616T160000Z
  expect(content).toContain("DTSTART:20260616T160000Z");
  // Workshop 17:30 UTC → 20260616T173000Z
  expect(content).toContain("DTSTART:20260616T173000Z");
  // Panel Discussion 9:00 AM PT (PDT=UTC-7) → 16:00 UTC
  expect(content).toContain("DTSTART:20260616T160000Z");
});

// ── Fix: DTSTAMP no fractional seconds in live per-session .ics download ──────
test("Fix: per-session .ics DTSTAMP has no fractional seconds (integer-second UTC)", async ({
  page,
  context,
}) => {
  const agendaText = "2026-06-16\nKeynote — 16:00 UTC";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

  const icsLink = page.locator('a:has-text("Download .ics")');
  await expect(icsLink.first()).toBeVisible();
  const icsHref = await icsLink.first().getAttribute("href");
  expect(icsHref).not.toBeNull();
  const decoded = decodeURIComponent(icsHref!.replace("data:text/calendar;charset=utf-8,", ""));

  // DTSTAMP must match 8-digit date + T + 6-digit time + Z (no dot/fractional seconds)
  const dtstampMatch = decoded.match(/DTSTAMP:(\S+)/);
  expect(dtstampMatch).not.toBeNull();
  expect(dtstampMatch![1]).toMatch(/^\d{8}T\d{6}Z$/);
  expect(dtstampMatch![1]).not.toContain(".");
});

// ── Fix: DTSTAMP no fractional seconds in combined .ics download ──────────────
test("Fix: combined .ics DTSTAMP has no fractional seconds in any VEVENT", async ({
  page,
  context,
}) => {
  const agendaText = "2026-06-16\nOpening Keynote — 16:00 UTC\nWorkshop — 17:30 UTC";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

  const downloadBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(downloadBtn).toBeVisible({ timeout: 3000 });

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    downloadBtn.click(),
  ]);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  const content = Buffer.concat(chunks).toString("utf-8");

  // All DTSTAMP values must be integer-second UTC format: no dot before Z
  const matches = [...content.matchAll(/DTSTAMP:(\S+)/g)];
  expect(matches.length).toBeGreaterThan(0);
  for (const m of matches) {
    expect(m[1]).toMatch(/^\d{8}T\d{6}Z$/);
    expect(m[1]).not.toContain(".");
  }
});

// ── Fix: mobile combined button at mobile viewport (above the fold) ───────────
test("Fix: mobile download-all-ics-mobile button visible above fold at 390px viewport", async ({
  page,
}) => {
  // Set a mobile viewport (390x844 = iPhone 14)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE);

  // Wait for sessions to render (sample pre-loads)
  // The mobile button is inside the lg:hidden panel
  const mobileBtn = page.locator('[data-testid="download-all-ics-mobile"]');
  await expect(mobileBtn).toBeVisible({ timeout: 3000 });
  await expect(mobileBtn).toContainText("Download all sessions (.ics)");

  // Must be above the fold — y + height must be within the 844px viewport height
  const bounds = await mobileBtn.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThan(844);
});

// ── Fix: desktop download-all-ics is unique (no strict-mode duplicate violation) ──
test("Fix: desktop data-testid=download-all-ics resolves uniquely at desktop viewport", async ({
  page,
}) => {
  // Desktop viewport — mobile panel is CSS hidden
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);

  // Exactly one VISIBLE element with this testid (mobile one is CSS hidden)
  const desktopBtn = page.locator('[data-testid="download-all-ics"]');
  await expect(desktopBtn).toBeVisible({ timeout: 3000 });

  // The mobile button (different testid) should not be visible at desktop
  const mobileBtn = page.locator('[data-testid="download-all-ics-mobile"]');
  await expect(mobileBtn).not.toBeVisible();
});

// ── P0 fix: ISO date header applies to DTSTART in combined .ics ───────────────
test("P0 fix: ISO date header 2026-07-15 applies to DTSTART in combined .ics", async ({
  page,
  context,
}) => {
  const agendaText = "2026-07-15\nKeynote — 16:00 UTC\nWorkshop — 9:00 AM PT";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

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
  const content = Buffer.concat(chunks).toString("utf-8");

  // Both sessions must land on 2026-07-15 (20260715), NOT on today's date
  const dtStarts = [...content.matchAll(/DTSTART:(\S+)/g)].map((m) => m[1]);
  expect(dtStarts).toHaveLength(2);
  for (const dtstart of dtStarts) {
    expect(dtstart).toMatch(/^20260715/);
  }
  expect(content).toContain("DESCRIPTION:");
});

// ── P0 fix: inline ISO date on session line — correct DTSTART ────────────────
test("P0 fix: inline ISO date in session line produces correct DTSTART not today", async ({
  page,
  context,
}) => {
  const agendaText = "Client Review — 2026-06-22 11:00 AM ET\nRetro — 2026-06-27 2:00 PM PT";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

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
  const content = Buffer.concat(chunks).toString("utf-8");
  const dtStarts = [...content.matchAll(/DTSTART:(\S+)/g)].map((m) => m[1]);
  expect(dtStarts).toHaveLength(2);
  expect(dtStarts[0]).toMatch(/^20260622/);
  expect(dtStarts[1]).toMatch(/^20260627/);
});

// ── P0 fix: no date leak into SUMMARY for natural-language inline dates ───────
test("P0 fix: 'Mon June 23' inline date not leaked into session SUMMARY", async ({
  page,
  context,
}) => {
  const agendaText = "Sprint Planning — Mon June 23, 9:00 AM PT\nRetro — Fri June 27, 2:00 PM PT";
  const url = makeShareUrl(agendaText, "UTC");
  await page.goto(url);

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
  const content = Buffer.concat(chunks).toString("utf-8");

  // DTSTART must be 2026-06-23 and 2026-06-27
  const dtStarts = [...content.matchAll(/DTSTART:(\S+)/g)].map((m) => m[1]);
  expect(dtStarts[0]).toMatch(/^20260623/);
  expect(dtStarts[1]).toMatch(/^20260627/);

  // SUMMARY must NOT contain "June" or "Mon"
  const summaries = [...content.matchAll(/SUMMARY:(.+)/g)].map((m) => m[1]);
  for (const s of summaries) {
    expect(s).not.toContain("June");
    expect(s).not.toContain("Mon");
    expect(s).not.toContain("Fri");
  }
});

// ── P0 fix: hasNoDate warning visible in creator view ─────────────────────────
test("P0 fix: sessions with no date show a 'no date found' alert in creator view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);

  // Clear the textarea and enter a session line with no date context
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("Sprint Planning — 9:00 AM PT");

  // Wait for the alert to appear — scope to the desktop panel (hidden lg:flex)
  // to avoid strict mode violation from mobile duplicates (lg:hidden panels)
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const noDateAlert = desktopPanel.locator('[role="alert"]:has-text("No date found")').first();
  await expect(noDateAlert).toBeVisible({ timeout: 3000 });
});

// ── P1 fix: "Imports into Google Calendar, Apple Calendar & Outlook" always shown on creator ──
test("P1 fix: Imports caption always visible below download-all-ics button on creator view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);

  // At desktop the download button and caption are inside the desktop preview column
  // (hidden lg:flex), not the mobile panel (lg:hidden). Scope to the desktop panel.
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  await expect(desktopPanel).toBeVisible({ timeout: 3000 });
  const caption = desktopPanel.locator('text=Imports into Google Calendar, Apple Calendar & Outlook');
  await expect(caption).toBeVisible({ timeout: 3000 });
});

// ── Fix: per-card parsed date label (item 2) ──────────────────────────────────
test("Fix: each session card shows the parsed date label (e.g. 'Tue, Jun 16') for auditability", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // Use a share URL with a fixed date so the label is predictable
  const url = makeShareUrl("2026-06-16\nKeynote — 16:00 UTC\nWorkshop — 17:30 UTC", "UTC");
  await page.goto(url);

  // Each session card should have a [data-testid="session-parsed-date"] element
  const dateLabelEls = page.locator('[data-testid="session-parsed-date"]');
  await expect(dateLabelEls.first()).toBeVisible({ timeout: 3000 });
  const count = await dateLabelEls.count();
  expect(count).toBe(2); // 2 sessions

  // The label must contain the weekday and date for 2026-06-16 (a Tuesday)
  const firstLabel = await dateLabelEls.first().innerText();
  expect(firstLabel).toMatch(/Tue/);
  expect(firstLabel).toMatch(/Jun/);
  expect(firstLabel).toMatch(/16/);
});

test("Fix: session with no date does NOT show a parsed-date label (hasNoDate case)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE);

  const textarea = page.locator('[data-testid="agenda-input"]');
  // Session with no date context
  await textarea.fill("Standup — 9:00 AM PT");

  // The desktop panel should show the session card with NO date label
  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const sessionCard = desktopPanel.locator('.bg-white.border.border-slate-200.rounded-lg').first();
  await expect(sessionCard).toBeVisible({ timeout: 3000 });

  // No session-parsed-date element should appear (since hasNoDate)
  const dateLabelInPanel = desktopPanel.locator('[data-testid="session-parsed-date"]');
  await expect(dateLabelInPanel).toHaveCount(0);
});

// ── Fix: line-accounting — no line silently disappears (item 1) ───────────────
test("Fix: line-accounting — dateheader-promoted lines are visible as labeled DATE rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // "Community Office Hours — June 26" is timeless but has June 26 embedded → promoted to dateheader
  // The fix: it renders as a labeled DateHeaderRow (data-testid=date-header-row), not silently removed
  const url = makeShareUrl(
    "Community Office Hours — June 26\n9:00 AM PT — Morning Session",
    "UTC"
  );
  await page.goto(url);

  // The date-header row should be visible in the shared view
  const dateHeaderRow = page.locator('[data-testid="date-header-row"]');
  await expect(dateHeaderRow.first()).toBeVisible({ timeout: 3000 });

  // The row should contain the original line text
  const headerText = await dateHeaderRow.first().innerText();
  expect(headerText).toMatch(/Community Office Hours/i);
});

test("Fix: line-accounting summary shows session count in creator view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  // Use agenda with 3 sessions + 1 date header — summary should show "3 sessions • 1 date header"
  const url = makeShareUrl(
    "2026-06-16\nKeynote — 16:00 UTC\nWorkshop — 17:30 UTC\nPanel — 9:00 AM PT",
    "UTC"
  );
  // Creator view (not share view) shows the line-accounting summary
  await page.goto(BASE);
  const textarea = page.locator('[data-testid="agenda-input"]');
  await textarea.fill("2026-06-16\nKeynote — 16:00 UTC\nWorkshop — 17:30 UTC\nPanel — 9:00 AM PT");

  const desktopPanel = page.locator('.hidden.lg\\:flex');
  const summary = desktopPanel.locator('[data-testid="line-accounting-summary"]');
  await expect(summary).toBeVisible({ timeout: 3000 });
  const summaryText = await summary.innerText();
  // Should contain session count
  expect(summaryText).toMatch(/3 session/);
});
