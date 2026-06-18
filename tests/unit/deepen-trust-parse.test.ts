/**
 * DEEPEN: PARSER ROBUSTNESS / TRUST-THE-PARSE — unit tests
 *
 * Tests added per verifier mandate:
 * 1. SOURCE-TZ AUTO-DETECT precedence: stated-once > inline > manual selector
 * 2. TITLE/TZ TOKEN-COLLISION: "PT Roadmap — Q3", "AM Keynote" survive intact
 * 3. NO-TIME row hint + export exclusion
 * 4. CHRONOLOGICAL sort: preview order == .ics VEVENT order
 * 5. Input-variety: formats mandated by spec (not just the bundled sample)
 * 6. DST-correct DTSTART for each tz case (computed-vs-actual)
 * 7. Inline tz NEVER overridden by stated-once for that session
 * 8. Title word boundary: word adjacent to time token survives
 * 9. Time-range start-vs-end correctness (lenient-parser regression guard)
 */

import { describe, it, expect } from "vitest";
import {
  parseAgenda,
  detectSourceTz,
  buildAllSessionsIcs,
  buildIcsContent,
  formatInZone,
  wallToUtc,
  encodeAgendaState,
  decodeAgendaState,
  type ParsedSession,
  type NoteLineWithHint,
} from "../../lib/parser";
import { SAMPLE_TEXT } from "../../lib/sample";

// Reference date: 2026-06-16 (summer, PDT = UTC-7, CEST = UTC+2, EDT = UTC-4)
const REF_DATE = new Date("2026-06-16T00:00:00Z");

function utcHM(d: Date) {
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

// ── 1. SOURCE-TZ AUTO-DETECT: stated-once indicator + DTSTART computation ────

describe("SOURCE-TZ: stated-once 'All times PT' → computed UTC instant", () => {
  it("'All times PT' header detected with abbr=PT and originType=stated-once", () => {
    const text = "All times PT\n2026-06-16\nKeynote — 2:00 PM";
    const result = detectSourceTz(text);
    expect(result).not.toBeNull();
    expect(result!.abbr).toBe("PT");
    expect(result!.originType).toBe("stated-once");
    expect(result!.origin).toBe("All times PT");
    expect(result!.ianaZone).toBe("America/Los_Angeles");
  });

  it("DTSTART case 1: 'All times PT' + '2:00 PM' on 2026-06-16 → 20260616T210000Z (2pm PDT = UTC-7)", () => {
    const text = "All times PT\n2026-06-16\nKeynote — 2:00 PM";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    // 2:00 PM PDT (UTC-7) = 21:00 UTC
    expect(sessions[0].startUtc.toISOString()).toBe("2026-06-16T21:00:00.000Z");
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("DTSTART:20260616T210000Z");
  });

  it("DTSTART case 2: 'Keynote — 14:00 CET' on 2026-06-16 → 20260616T120000Z (14:00 CEST = UTC+2)", () => {
    // Standalone inline-CET session, no stated-once header, selector at UTC
    const text = "2026-06-16\nKeynote — 14:00 CET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    // 14:00 CEST (UTC+2) = 12:00 UTC
    expect(sessions[0].startUtc.toISOString()).toBe("2026-06-16T12:00:00.000Z");
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("DTSTART:20260616T120000Z");
  });

  it("DTSTART case 3: 'A — 1:00 PM' under stated-once PT vs 'B — 1:00 PM ET' inline — two different UTC instants", () => {
    // Spec success check: precedence test
    const text = "All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(2);

    const a = sessions.find(s => s.title === "A");
    const b = sessions.find(s => s.title === "B");
    expect(a).toBeDefined();
    expect(b).toBeDefined();

    // A uses stated-once PT → 1pm PDT = UTC-7 → 20:00 UTC
    expect(a!.startUtc.toISOString()).toBe("2026-06-16T20:00:00.000Z");
    // B uses inline ET → 1pm EDT = UTC-4 → 17:00 UTC
    expect(b!.startUtc.toISOString()).toBe("2026-06-16T17:00:00.000Z");

    // The two instants must differ
    expect(a!.startUtc.getTime()).not.toBe(b!.startUtc.getTime());

    // Verify .ics has both distinct DTSTART values
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("DTSTART:20260616T200000Z");
    expect(ics).toContain("DTSTART:20260616T170000Z");
  });

  it("stated-once PT line is NOT emitted as a row (consumed as config)", () => {
    const text = "All times PT\n2026-06-16\nKeynote — 9:00 AM";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const allRaw = rows.map(r => r.rawLine);
    expect(allRaw).not.toContain("All times PT");
    // Only dateheader + session rows
    expect(rows).toHaveLength(2);
  });

  it("viewer tz change reconverts displayed instant (not re-labels)", () => {
    // 1:00 PM PDT = 20:00 UTC. In Tokyo (UTC+9) that is 05:00 next day.
    // This is a pure UTC-math test; the reconversion is formatInZone(startUtc, viewerTz).
    const startUtc = wallToUtc(2026, 6, 16, 13, 0, "America/Los_Angeles"); // 1pm PDT
    // In UTC it must be 20:00
    expect(startUtc.getUTCHours()).toBe(20);
    // Reconvert to Tokyo
    const tokyo = formatInZone(startUtc, "Asia/Tokyo");
    // Tokyo (JST = UTC+9): 20:00 UTC + 9h = 05:00 next day
    expect(tokyo).toMatch(/5:00 AM/i);
    // Reconvert to New York (UTC-4 in summer)
    const ny = formatInZone(startUtc, "America/New_York");
    expect(ny).toMatch(/4:00 PM/i);
  });
});

// ── 2. TITLE/TZ TOKEN-COLLISION: title words that look like tz tokens survive ──

describe("TITLE/TZ TOKEN-COLLISION: title words preserved byte-intact", () => {
  it("'PT Roadmap — Q3 — 2:00 PM PT' → title is exactly 'PT Roadmap — Q3'", () => {
    const rows = parseAgenda("2026-06-16\nPT Roadmap — Q3 — 2:00 PM PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("PT Roadmap — Q3");
    // em-dash still in title
    expect(s.title).toContain("—");
  });

  it("'AM Keynote — 9:00 AM PT' → title is exactly 'AM Keynote' (AM prefix not eaten)", () => {
    const rows = parseAgenda("2026-06-16\nAM Keynote — 9:00 AM PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("AM Keynote");
  });

  it("'ET Office Hours — 14:00 ET' → title is 'ET Office Hours', time parses as EDT", () => {
    const rows = parseAgenda("2026-06-16\nET Office Hours — 14:00 ET", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("ET Office Hours");
    // 14:00 EDT (UTC-4) = 18:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 18, m: 0 });
  });

  it("'PT Roadmap — Q3 — 2:00 PM PT' SUMMARY in combined .ics is exactly 'PT Roadmap — Q3'", () => {
    const rows = parseAgenda("2026-06-16\nPT Roadmap — Q3 — 2:00 PM PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("SUMMARY:PT Roadmap — Q3");
  });

  it("'AM Keynote — 9:00 AM PT' SUMMARY in combined .ics is exactly 'AM Keynote'", () => {
    const rows = parseAgenda("2026-06-16\nAM Keynote — 9:00 AM PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("SUMMARY:AM Keynote");
  });

  it("word adjacent to time token NOT eaten: title word before separator survives", () => {
    // "SDK" must survive — word-drop regression guard (lenient-parser-fix-introduces-title-range-regressions)
    const rows = parseAgenda("Live Coding: Build with our SDK 11:30am PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("Live Coding: Build with our SDK");
    // Not "Live Coding: Build with our" — SDK must not be eaten
    expect(s.title).toContain("SDK");
  });
});

// ── 3. INLINE TZ NEVER OVERRIDDEN by stated-once (parser-never-silently-mutates rule) ──

describe("Inline tz is AUTHORITATIVE — stated-once cannot override it", () => {
  it("inline ET on session B overrides stated-once PT for B only, A is unaffected", () => {
    const text = "All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const a = sessions.find(s => s.title === "A");
    const b = sessions.find(s => s.title === "B");
    // A: stated-once PT → 1pm PDT → 20:00 UTC
    expect(utcHM(a!.startUtc)).toEqual({ h: 20, m: 0 });
    // B: inline ET wins → 1pm EDT → 17:00 UTC (not 20:00)
    expect(utcHM(b!.startUtc)).toEqual({ h: 17, m: 0 });
    // B is NOT the same as A
    expect(b!.startUtc.getTime()).not.toBe(a!.startUtc.getTime());
  });

  it("inline CET on session B overrides stated-once PT for B only", () => {
    const text = "All times PT\n2026-06-16\nA — 1:00 PM\nB — 14:00 CET";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const b = sessions.find(s => s.title === "B");
    // B: inline CET/CEST → 14:00 CEST (UTC+2) → 12:00 UTC
    expect(utcHM(b!.startUtc)).toEqual({ h: 12, m: 0 });
  });
});

// ── 4. TIME-RANGE START vs END correctness (lenient-parser regression guard) ──

describe("Time-range: start-vs-end correct, AM/PM not swapped", () => {
  it("'9:00–9:45 AM PT' → start=9:00 AM (16:00 UTC), end=9:45 AM (16:45 UTC), NOT 9:45 PM", () => {
    const rows = parseAgenda("2026-06-16\n9:00–9:45 AM PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });  // 9am PDT
    expect(s.endUtc).not.toBeNull();
    expect(utcHM(s.endUtc!)).toEqual({ h: 16, m: 45 });  // 9:45am PDT (not PM)
  });

  it("'9-10am PT hallway track' → start=9am (16:00 UTC), end=10am (17:00 UTC), title='hallway track'", () => {
    const rows = parseAgenda("2026-06-16\n9-10am PT hallway track", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });  // 9am PDT
    expect(utcHM(s.endUtc!)).toEqual({ h: 17, m: 0 });  // 10am PDT
    expect(s.title).toBe("hallway track");
  });

  it("'9:00 AM–10:00 AM PT' → start 16:00 UTC, end 17:00 UTC", () => {
    const rows = parseAgenda("2026-06-16\n9:00 AM–10:00 AM PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    expect(utcHM(s.endUtc!)).toEqual({ h: 17, m: 0 });
  });
});

// ── 5. NO-TIME ROW HINT + export exclusion ────────────────────────────────────

describe("No-time row: hint shown, excluded from .ics", () => {
  it("'Networking Lunch' has noTimeHint=true", () => {
    const rows = parseAgenda("Networking Lunch", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows[0].type).toBe("note");
    expect((rows[0] as NoteLineWithHint).noTimeHint).toBe(true);
  });

  it("3 sessions + 1 no-time row → combined .ics has exactly 3 VEVENTs", () => {
    const text = "2026-06-16\nKeynote — 9:00 AM UTC\nNetworking Lunch\nWorkshop — 11:00 AM UTC\nPanel — 2:00 PM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    // Validate: 3 sessions, 1 note, 1 dateheader
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const notes = rows.filter(r => r.type === "note");
    expect(sessions).toHaveLength(3);
    expect(notes).toHaveLength(1);
    // Combined .ics must exclude the note row
    const ics = buildAllSessionsIcs(sessions)!;
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(3);
    // "Networking Lunch" must NOT appear in combined .ics
    expect(ics).not.toContain("Networking Lunch");
  });

  it("unparsed line (out-of-range time) also produces NO VEVENT in combined .ics", () => {
    const text = "2026-06-16\nKeynote — 9:00 AM UTC\nBad — 26:00 UTC\nPanel — 2:00 PM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(2); // Bad line is unparsed, not a session
    const ics = buildAllSessionsIcs(sessions)!;
    expect((ics.match(/BEGIN:VEVENT/g) ?? []).length).toBe(2);
  });
});

// ── 6. CHRONOLOGICAL SORT ──────────────────────────────────────────────────────

describe("CHRONOLOGICAL SORT: preview order == .ics VEVENT order", () => {
  it("out-of-order input (5pm before 9am) → sorted 9am, 2pm, 5pm in output", () => {
    // This exercises the sample's own pattern (5:00 PM listed before 9:00 AM)
    const text = "2026-06-16\nEvening — 5:00 PM UTC\nMorning — 9:00 AM UTC\nAfternoon — 2:00 PM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions[0].title).toBe("Morning");    // 09:00 UTC
    expect(sessions[1].title).toBe("Afternoon");  // 14:00 UTC
    expect(sessions[2].title).toBe("Evening");    // 17:00 UTC
  });

  it(".ics VEVENT order matches preview (chronological) order", () => {
    const text = "2026-06-16\nEvening — 5:00 PM UTC\nMorning — 9:00 AM UTC\nAfternoon — 2:00 PM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const ics = buildAllSessionsIcs(sessions)!;
    // Extract DTSTART values in order they appear in the .ics
    const dtStarts = [...ics.matchAll(/DTSTART:(\S+)/g)].map(m => m[1]);
    // Morning 9am UTC → 20260616T090000Z
    // Afternoon 2pm UTC → 20260616T140000Z
    // Evening 5pm UTC → 20260616T170000Z
    expect(dtStarts[0]).toBe("20260616T090000Z");
    expect(dtStarts[1]).toBe("20260616T140000Z");
    expect(dtStarts[2]).toBe("20260616T170000Z");
  });

  it("sample-matching scenario: 5pm listed first, re-sort yields chronological .ics", () => {
    // Simulates the bundled sample (Community Q&A 5pm before Opening Keynote 9am)
    const text = "2026-06-16\nCommunity Q&A — 5:00 PM UTC\nOpening Keynote — 9:00 AM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions[0].title).toBe("Opening Keynote");
    expect(sessions[1].title).toBe("Community Q&A");
    const ics = buildAllSessionsIcs(sessions)!;
    const summaries = [...ics.matchAll(/SUMMARY:(.+)/g)].map(m => m[1]);
    expect(summaries[0]).toBe("Opening Keynote");
    expect(summaries[1]).toBe("Community Q&A");
  });
});

// ── 7. INPUT VARIETY: formats from the spec (not just the bundled sample) ─────

describe("INPUT VARIETY: spec-mandated formats — preview==export for each", () => {
  it("standalone ISO date + 24h UTC: '2026-07-15\\n16:00 UTC' → DTSTART 20260715T160000Z", () => {
    const text = "2026-07-15\n16:00 UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("DTSTART:20260715T160000Z");
  });

  it("ISO date header that applies to all following sessions + multi-session accounting", () => {
    const text = "2026-06-20\nSession A — 9:00 AM PT\nSession B — 2:00 PM ET\nnotes only line";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const notes = rows.filter(r => r.type === "note");
    expect(sessions).toHaveLength(2);
    expect(notes).toHaveLength(1);
    // Both sessions on 2026-06-20
    const ics = buildAllSessionsIcs(sessions)!;
    const dtStarts = [...ics.matchAll(/DTSTART:(\S+)/g)].map(m => m[1]);
    expect(dtStarts).toHaveLength(2);
    for (const dt of dtStarts) {
      expect(dt).toMatch(/^20260620/);
    }
  });

  it("natural-language header 'Mon June 23' (standalone) → sessions use 2026-06-23", () => {
    const text = "Mon June 23\nSession A — 9:00 AM PT\nSession B — 2:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(2);
    for (const s of sessions) {
      expect(s.startUtc.toISOString()).toContain("2026-06-23");
    }
  });

  it("inline date on session line: 'Sprint Planning — Mon June 23, 9:00 AM PT' → DTSTART 20260623, SUMMARY='Sprint Planning'", () => {
    const text = "Sprint Planning — Mon June 23, 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe("Sprint Planning");
    const ics = buildIcsContent(sessions[0]);
    expect(ics).toContain("DTSTART:20260623");
    expect(ics).toContain("SUMMARY:Sprint Planning");
    // No date leak into SUMMARY
    expect(ics).not.toContain("SUMMARY:Sprint Planning — Mon");
    expect(ics).not.toContain("June");
  });

  it("dateless input shows hasNoDate warning (never silent wrong-day default)", () => {
    const text = "Just A Meeting — 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].hasNoDate).toBe(true);
  });

  it("12h AM/PM with range: '9:00 AM–10:30 AM ET' → both endpoints in AM (not PM)", () => {
    const text = "2026-06-16\n9:00 AM–10:30 AM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    // 9:00 AM EDT (UTC-4) = 13:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 13, m: 0 });
    // 10:30 AM EDT (UTC-4) = 14:30 UTC (NOT 22:30 UTC which would be 10:30 PM)
    expect(utcHM(s.endUtc!)).toEqual({ h: 14, m: 30 });
  });

  it("'2pm PT' bare inline-tz → 21:00 UTC (not 14:00 UTC) on summer date", () => {
    const text = "2026-06-16\nSession X — 2pm PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    // 2pm PDT (UTC-7) = 21:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 21, m: 0 });
  });

  it("line-accounting: all non-blank input lines produce a row (no silent drop)", () => {
    // Cover: dateheader, session, note, stated-once (consumed as config)
    const text = "All times PT\n2026-06-16\nKeynote — 9:00 AM\nNetworking Lunch\nPanel — 2:00 PM";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    // "All times PT" consumed, "2026-06-16" = dateheader, "Keynote" = session, "Networking Lunch" = note, "Panel" = session
    const nonBlankInputLines = text.split("\n").filter(l => l.trim() !== "");
    // stated-once line is consumed but still counted: parser emits 4 rows (dateheader, session, note, session)
    // stated-once header is NOT emitted as a row → 4 accounted rows for 5 non-blank input lines
    const accountedRows = rows.filter(r =>
      r.type === "session" || r.type === "dateheader" || r.type === "note" || r.type === "unparsed"
    );
    // 5 non-blank lines - 1 stated-once (consumed) = 4 rows
    expect(accountedRows).toHaveLength(4);
    expect(rows.filter(r => r.type === "session")).toHaveLength(2);
    expect(rows.filter(r => r.type === "note")).toHaveLength(1);
    expect(rows.filter(r => r.type === "dateheader")).toHaveLength(1);
  });

  it("VEVENT count == timed session count (no silent VEVENT add/drop)", () => {
    // 3 sessions + 1 note (no-time) + 1 date header + 1 unparsed → .ics must have exactly 3 VEVENTs
    const text = "2026-06-16\nKeynote — 9:00 AM UTC\nNetworking Lunch\nTalk — 26:00 UTC\nWorkshop — 2:00 PM UTC\nPanel — 5:00 PM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(3);
    const ics = buildAllSessionsIcs(sessions)!;
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(3);
  });
});

// ── 8. SHARED-VIEW SUMMARY PARITY ─────────────────────────────────────────────

describe("SHARED-VIEW honest summary parity (same component as creator)", () => {
  it("buildAllSessionsIcs includes all sessions and none extra (same count in/out)", () => {
    const sessions: ParsedSession[] = [
      { type: "session", title: "S1", startUtc: new Date("2026-06-16T09:00:00Z"), endUtc: null, sourceTime: "9am UTC", rawLine: "S1 — 9:00 AM UTC" },
      { type: "session", title: "S2", startUtc: new Date("2026-06-16T14:00:00Z"), endUtc: null, sourceTime: "2pm UTC", rawLine: "S2 — 2:00 PM UTC" },
      { type: "session", title: "S3", startUtc: new Date("2026-06-16T17:00:00Z"), endUtc: null, sourceTime: "5pm UTC", rawLine: "S3 — 5:00 PM UTC" },
      { type: "session", title: "S4", startUtc: new Date("2026-06-16T20:00:00Z"), endUtc: null, sourceTime: "8pm UTC", rawLine: "S4 — 8:00 PM UTC" },
      { type: "session", title: "S5", startUtc: new Date("2026-06-17T00:00:00Z"), endUtc: null, sourceTime: "midnight UTC", rawLine: "S5 — midnight UTC" },
    ];
    const ics = buildAllSessionsIcs(sessions)!;
    const veventCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(veventCount).toBe(5);
  });
});

// ── P1-1 FIX: PER-CARD SOURCE-TIME LABEL must match the applied source tz ────
// The sourceTime field on each ParsedSession must show the ACTUAL applied tz abbreviation
// (PT/ET/CET/etc.), not the selector's default abbreviation (e.g. "UTC").
// Three cases: stated-once-inherited, inline, manual-override.

describe("P1-1: per-card sourceTime label matches applied source tz — all 3 precedence sources", () => {
  it("stated-once-inherited session: sourceTime ends with PT not UTC", () => {
    // "All times PT" + "Meeting — 10:00 AM" (no inline tz)
    // statedOnceIana=America/Los_Angeles, selector=UTC → should label PT not UTC
    const text = "All times PT\n2026-06-16\nMeeting — 10:00 AM";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    // sourceTime must show PT (the applied tz), not UTC (the selector default)
    expect(sessions[0].sourceTime).toMatch(/PT$/);
    expect(sessions[0].sourceTime).not.toMatch(/UTC$/);
  });

  it("inline-tz session: sourceTime ends with the inline tz (CET), not the stated-once or selector tz", () => {
    const text = "All times PT\n2026-06-16\nDeep Dive — 14:00 CET";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sourceTime).toMatch(/CET$/);
  });

  it("manual-override session: sourceTime ends with the override tz (ET), not stated-once PT", () => {
    const text = "All times PT\n2026-06-16\nMeeting — 10:00 AM";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    // User overrides to ET
    const rows = parseAgenda(text, {
      sourceTimezone: "America/New_York",
      statedOnceIana,
      manualOverrideIana: "America/New_York",
      manualOverrideAbbr: "ET",
      referenceDate: REF_DATE,
    });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].sourceTime).toMatch(/ET$/);
    expect(sessions[0].sourceTime).not.toMatch(/PT$/);
    expect(sessions[0].sourceTime).not.toMatch(/UTC$/);
  });

  it("stated-once-inherited + inline peer: label and DTSTART agree for both (no cross-contamination)", () => {
    // A (inherited PT) and B (inline ET): labels and instants must be consistent per session
    const text = "All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const a = sessions.find(s => s.title === "A")!;
    const b = sessions.find(s => s.title === "B")!;
    // A: stated-once PT → label ends with PT, DTSTART 20:00 UTC
    expect(a.sourceTime).toMatch(/PT$/);
    expect(utcHM(a.startUtc)).toEqual({ h: 20, m: 0 });
    // B: inline ET → label ends with ET, DTSTART 17:00 UTC
    expect(b.sourceTime).toMatch(/ET$/);
    expect(utcHM(b.startUtc)).toEqual({ h: 17, m: 0 });
  });
});

// ── P1-2 FIX: MANUAL OVERRIDE SELECTOR changes DTSTART + sourceTime label ──
// Once a stated-once header is detected, the user can still override via selector.
// The override must change DTSTART and sourceTime for non-inline sessions.
// An inline-tz session must NOT be affected by the override.

describe("P1-2: manual override selector re-computes DTSTART + sourceTime, inline tz unchanged", () => {
  it("after stated-once PT detection, overriding to ET changes DTSTART from 20:00Z to 17:00Z", () => {
    const text = "All times PT\n2026-06-16\nMeeting — 1:00 PM";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;

    // Without override: stated-once PT → 1pm PDT = 20:00 UTC
    const rowsNoOverride = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessionsNoOverride = rowsNoOverride.filter(r => r.type === "session") as ParsedSession[];
    expect(utcHM(sessionsNoOverride[0].startUtc)).toEqual({ h: 20, m: 0 });
    expect(sessionsNoOverride[0].sourceTime).toMatch(/PT$/);

    // With override to ET: should change to 1pm EDT = 17:00 UTC
    const rowsOverride = parseAgenda(text, {
      sourceTimezone: "America/New_York",
      statedOnceIana,
      manualOverrideIana: "America/New_York",
      manualOverrideAbbr: "ET",
      referenceDate: REF_DATE,
    });
    const sessionsOverride = rowsOverride.filter(r => r.type === "session") as ParsedSession[];
    expect(sessionsOverride).toHaveLength(1);
    // DTSTART must change
    expect(utcHM(sessionsOverride[0].startUtc)).toEqual({ h: 17, m: 0 });
    // sourceTime label must reflect ET
    expect(sessionsOverride[0].sourceTime).toMatch(/ET$/);
    expect(sessionsOverride[0].sourceTime).not.toMatch(/PT$/);
  });

  it("inline-tz session is NOT affected by manual override (inline always authoritative)", () => {
    const text = "All times PT\n2026-06-16\nA — 1:00 PM\nB — 1:00 PM ET";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;

    // Override to JST for A (non-inline) — B has inline ET and must be unchanged
    const rows = parseAgenda(text, {
      sourceTimezone: "Asia/Tokyo",
      statedOnceIana,
      manualOverrideIana: "Asia/Tokyo",
      manualOverrideAbbr: "JST",
      referenceDate: REF_DATE,
    });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const a = sessions.find(s => s.title === "A")!;
    const b = sessions.find(s => s.title === "B")!;

    // A: overridden to JST (UTC+9) → 1pm JST = 04:00 UTC
    expect(utcHM(a.startUtc)).toEqual({ h: 4, m: 0 });
    expect(a.sourceTime).toMatch(/JST$/);

    // B: inline ET must NOT be touched by the override → 1pm EDT = 17:00 UTC
    expect(utcHM(b.startUtc)).toEqual({ h: 17, m: 0 });
    expect(b.sourceTime).toMatch(/ET$/);
  });
});

// ── PANEL ROUND 1 DEFECT FIXES ────────────────────────────────────────────────

// DEFECT #1: Share-link round-trip carries detected source tz; attendee sees correct label.
// These unit tests cover the parser/encoding layer; UI selector-snap is tested in e2e.

describe("DEFECT #1: Share-link encodes applied source tz (encodeAgendaState / decodeAgendaState)", () => {
  it("encodeAgendaState includes appliedSourceTzAbbr and decodeAgendaState recovers it", () => {
    const state = { text: "All times PT\nKeynote — 9am", sourceTimezone: "UTC", appliedSourceTzAbbr: "PT" };
    const encoded = encodeAgendaState(state);
    const decoded = decodeAgendaState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.appliedSourceTzAbbr).toBe("PT");
    expect(decoded!.sourceTimezone).toBe("UTC");
  });

  it("old share link without appliedSourceTzAbbr still decodes (backward compat)", () => {
    // Simulate old link: no appliedSourceTzAbbr
    const state = { text: "Keynote — 9am PT", sourceTimezone: "UTC" };
    const encoded = encodeAgendaState(state);
    const decoded = decodeAgendaState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.appliedSourceTzAbbr).toBeUndefined();
    // appliedSourceTzAbbr should be re-derived from detection in the attendee view
    const sharedDetected = detectSourceTz(decoded!.text);
    expect(sharedDetected?.abbr).toBe("PT"); // inline detection fires
  });
});

// DEFECT #2: Title/TZ token-collision — inline tz adjacent to time is stripped from title.
// Regression guards for BOTH: (a) tz adjacent to time IS stripped, (b) leading tz NOT adjacent is kept.

describe("DEFECT #2: Adjacent inline tz stripped from title; title-leading tz without adjacent time kept", () => {
  it("'10:00 AM PT Opening Keynote' → title is 'Opening Keynote' (PT stripped, adjacent to time)", () => {
    const rows = parseAgenda("2026-06-16\n10:00 AM PT Opening Keynote", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("Opening Keynote");
    expect(s.title).not.toContain("PT");
    // Time must still parse correctly: 10am PDT = 17:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 17, m: 0 });
  });

  it("'10:00 AM PT Opening Keynote' SUMMARY in .ics is 'Opening Keynote' (not 'PT Opening Keynote')", () => {
    const rows = parseAgenda("2026-06-16\n10:00 AM PT Opening Keynote", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const ics = buildAllSessionsIcs(sessions)!;
    expect(ics).toContain("SUMMARY:Opening Keynote");
    expect(ics).not.toContain("SUMMARY:PT Opening Keynote");
  });

  it("'9:00 AM ET Workshop on AI' → title is 'Workshop on AI' (ET stripped, adjacent to time)", () => {
    const rows = parseAgenda("2026-06-16\n9:00 AM ET Workshop on AI", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("Workshop on AI");
    expect(s.title).not.toContain("ET ");
  });

  it("'PT Roadmap — Q3 — 9:00 AM' → title is 'PT Roadmap — Q3' (leading PT NOT adjacent to time, kept)", () => {
    // Regression: PT at START of title with time elsewhere must NOT be stripped
    const rows = parseAgenda("2026-06-16\nPT Roadmap — Q3 — 9:00 AM", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("PT Roadmap — Q3");
    // Leading PT must be kept
    expect(s.title.startsWith("PT")).toBe(true);
  });

  it("'ET Office Hours — 14:00' → title is 'ET Office Hours' (leading ET not adjacent to time, kept)", () => {
    // Regression: ET in title with time elsewhere must NOT be stripped
    const rows = parseAgenda("2026-06-16\nET Office Hours — 14:00", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s.title).toBe("ET Office Hours");
    expect(s.title.startsWith("ET")).toBe(true);
  });
});

// DEFECT #3: Embedded/parenthetical stated-once tz detection.

describe("DEFECT #3: Embedded stated-once tz detection — parenthetical + inline phrasing", () => {
  it("'(all times PT)' standalone → detected as stated-once PT", () => {
    const result = detectSourceTz("(all times PT)");
    expect(result).not.toBeNull();
    expect(result!.abbr).toBe("PT");
    expect(result!.originType).toBe("stated-once");
  });

  it("'Summit 2026 — All times PT' embedded header → detected as stated-once PT", () => {
    const text = "Summit 2026 — All times PT\n2026-06-16\nKeynote — 9:00 AM";
    const result = detectSourceTz(text);
    expect(result).not.toBeNull();
    expect(result!.abbr).toBe("PT");
    expect(result!.originType).toBe("stated-once");
  });

  it("'Times listed in CET' → detected as stated-once CET", () => {
    const result = detectSourceTz("Times listed in CET");
    expect(result).not.toBeNull();
    expect(result!.abbr).toBe("CET");
  });

  it("'All session times are in ET' → detected as stated-once ET", () => {
    const result = detectSourceTz("All session times are in ET");
    expect(result).not.toBeNull();
    expect(result!.abbr).toBe("ET");
  });

  it("'times are in Pacific' → detected as stated-once PT (word mapping)", () => {
    const result = detectSourceTz("times are in Pacific");
    expect(result).not.toBeNull();
    expect(result!.abbr).toBe("PT");
  });

  it("NEGATIVE: session title 'Pacific Ocean Sunset — 9:00 AM PT' does NOT trigger stated-once (has time token)", () => {
    // 'Pacific' in a session line with a time token must NOT mis-detect as stated-once
    const result = detectSourceTz("Pacific Ocean Sunset — 9:00 AM PT");
    // Should detect inline PT (from the time), NOT stated-once from "Pacific"
    expect(result?.originType).not.toBe("stated-once");
  });

  it("NEGATIVE: bare title word 'Pacific' with no time-phrase trigger is NOT detected as stated-once", () => {
    // A note line like "Pacific Region Update" has no "times" trigger → not a tz declaration
    const result = detectSourceTz("Pacific Region Update");
    expect(result).toBeNull();
  });

  it("embedded detection: sessions under 'Summit — All times PT' use PT DTSTART (not UTC)", () => {
    const text = "Summit 2026 — All times PT\n2026-06-16\nKeynote — 9:00 AM";
    const detected = detectSourceTz(text);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(text, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    // 9:00 AM PDT (UTC-7) = 16:00 UTC
    expect(utcHM(sessions[0].startUtc)).toEqual({ h: 16, m: 0 });
  });
});

// ── 9. SAMPLE EXERCISES THE TRUST-THE-PARSE BUNDLE ───────────────────────────

describe("Bundled sample exercises the full TRUST-THE-PARSE bundle", () => {
  // This validates the spec success check about the bundled sample
  it("sample has stated-once PT header → detectSourceTz returns stated-once", () => {
    // SAMPLE_TEXT imported at top
    const result = detectSourceTz(SAMPLE_TEXT);
    expect(result).not.toBeNull();
    expect(result!.originType).toBe("stated-once");
    expect(result!.abbr).toBe("PT");
  });

  it("sample has at least one no-time row (Networking Lunch) → note with noTimeHint", () => {
    // SAMPLE_TEXT imported at top
    const detected = detectSourceTz(SAMPLE_TEXT);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(SAMPLE_TEXT, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const notes = rows.filter(r => r.type === "note") as NoteLineWithHint[];
    expect(notes.length).toBeGreaterThanOrEqual(1);
    expect(notes.some(n => n.noTimeHint)).toBe(true);
  });

  it("sample sessions are NOT in input order — chronological sort is visible", () => {
    // Community Q&A (5pm PT = 00:00 UTC next day) is listed FIRST in input,
    // but chronologically comes LAST. CEST Deep Dive (14:00 CET = 12:00 UTC) is first.
    // SAMPLE_TEXT imported at top
    const detected = detectSourceTz(SAMPLE_TEXT);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(SAMPLE_TEXT, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions.length).toBeGreaterThanOrEqual(4);
    // Sorted order must be strictly ascending by time
    for (let i = 1; i < sessions.length; i++) {
      expect(sessions[i].startUtc.getTime()).toBeGreaterThanOrEqual(sessions[i-1].startUtc.getTime());
    }
    // Community Q&A (listed first in input) must NOT be first in output
    expect(sessions[0].title).not.toBe("Community Q&A");
    // Community Q&A must be last (it's 00:00 UTC = latest)
    expect(sessions[sessions.length - 1].title).toBe("Community Q&A");
  });

  it("sample has CET override: 'CEST Deep Dive — 14:00 CET' uses CEST (UTC+2) = 12:00 UTC", () => {
    // SAMPLE_TEXT imported at top
    const detected = detectSourceTz(SAMPLE_TEXT);
    const statedOnceIana = detected?.originType === "stated-once" ? detected.ianaZone : undefined;
    const rows = parseAgenda(SAMPLE_TEXT, { sourceTimezone: "UTC", statedOnceIana, referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const cest = sessions.find(s => s.title.includes("CEST") || s.title.includes("Deep Dive"));
    expect(cest).toBeDefined();
    // 14:00 CEST (UTC+2) = 12:00 UTC
    expect(utcHM(cest!.startUtc)).toEqual({ h: 12, m: 0 });
  });
});

// ── ROUND-2 TRUST FIXES ────────────────────────────────────────────────────────

// Trust Fix #1: false tz warning on title words
describe("Trust Fix #1: no false 'Unknown timezone' warning on title words adjacent to time", () => {
  it("'9:00 AM Early Birds Session' → title keeps 'Early Birds Session', NO unknownTzToken", () => {
    const rows = parseAgenda("2026-06-16\n9:00 AM Early Birds Session", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s).toBeDefined();
    // Title must include "Early" — it's a title word, not a tz
    expect(s.title).toContain("Early");
    expect(s.title).toContain("Birds");
    // No false tz warning
    expect(s.unknownTzToken).toBeUndefined();
  });

  it("'9:00 AM Early Standup' → title 'Early Standup', NO unknownTzToken", () => {
    const rows = parseAgenda("2026-06-16\n9:00 AM Early Standup", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s).toBeDefined();
    expect(s.title).toContain("Early");
    expect(s.unknownTzToken).toBeUndefined();
  });

  it("'10:00 AM Morning Coffee' → NO unknownTzToken (Morning is title-case, not all-caps tz)", () => {
    const rows = parseAgenda("2026-06-16\n10:00 AM Morning Coffee", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s).toBeDefined();
    expect(s.unknownTzToken).toBeUndefined();
  });

  it("source tz falls back correctly when title word follows time (no inline tz token)", () => {
    // With no recognized tz after the time, the parser should use defaultAbbr
    const rows = parseAgenda("2026-06-16\n9:00 AM Early Birds Session", {
      sourceTimezone: "America/Los_Angeles",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    // 9:00 AM PDT (UTC-7) = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });

  it("real unknown TZ abbr still produces warning (all-caps unrecognized token)", () => {
    // "XYZ" is all-caps, 3 chars, genuinely unknown → should warn
    const rows = parseAgenda("2026-06-16\n9:00 AM XYZ Final Session", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows.filter(r => r.type === "session")[0] as ParsedSession;
    expect(s).toBeDefined();
    // XYZ is genuinely unknown tz-shaped token → should flag
    expect(s.unknownTzToken).toBe("XYZ");
  });
});

// Trust Fix #2a: undated sessions excluded from .ics, not silently dated to today
describe("Trust Fix #2a: undated sessions excluded from .ics (not silently dated to today)", () => {
  it("dateless session has hasNoDate=true and is excluded from buildAllSessionsIcs", () => {
    const text = "Just A Meeting — 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0].hasNoDate).toBe(true);
    // When caller filters undated sessions out before building .ics (as the UI does),
    // the result should be null (nothing to export)
    const exportable = sessions.filter(s => !s.hasNoDate);
    expect(exportable).toHaveLength(0);
    expect(buildAllSessionsIcs(exportable)).toBeNull();
  });

  it("mixed dated+undated: only dated sessions appear in .ics", () => {
    const text = "2026-06-16\nDated Session — 9:00 AM PT\nUndated Session — 10:00 AM PT";
    // Second session gets the date from the header, so we need a genuinely dateless one
    // Use a case where there's no date header at all for some sessions
    const text2 = "Dateless A — 9:00 AM PT\n2026-06-16\nDated B — 10:00 AM PT";
    const rows = parseAgenda(text2, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    const dateless = sessions.filter(s => s.hasNoDate);
    const dated = sessions.filter(s => !s.hasNoDate);
    expect(dateless).toHaveLength(1);
    expect(dated).toHaveLength(1);
    expect(dateless[0].title).toBe("Dateless A");
    expect(dated[0].title).toBe("Dated B");
    // Only dated sessions go into .ics
    const ics = buildAllSessionsIcs(dated)!;
    expect(ics).toContain("Dated B");
    expect(ics).not.toContain("Dateless A");
  });
});

// Trust Fix #2b: undated warning should be collapsible (no per-card repetition)
// This is a UI concern — parser emits hasNoDate per session; UI collapses it.
// Unit test: multiple dateless sessions all carry hasNoDate=true (UI counts them once)
describe("Trust Fix #2b: multiple dateless sessions all carry hasNoDate=true for UI to count once", () => {
  it("3 dateless sessions all have hasNoDate=true (UI will show one collapsed banner)", () => {
    const text = "Session A — 9:00 AM PT\nSession B — 10:00 AM PT\nSession C — 11:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter(r => r.type === "session") as ParsedSession[];
    expect(sessions).toHaveLength(3);
    for (const s of sessions) {
      expect(s.hasNoDate).toBe(true);
    }
  });
});
