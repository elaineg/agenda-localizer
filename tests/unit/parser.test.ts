import { describe, it, expect } from "vitest";
import {
  parseAgenda,
  formatInZone,
  ianaFromAbbr,
  buildGoogleCalendarUrl,
  buildIcsContent,
  encodeAgendaState,
  decodeAgendaState,
  type ParsedSession,
  type UnparsedLine,
} from "../../lib/parser";

// Reference date: 2026-06-16 (a Tuesday in summer, PDT active, BST active)
const REF_DATE = new Date("2026-06-16T00:00:00Z");

// Helper to get UTC hours/minutes from a parsed session
function utcHM(d: Date) {
  return { h: d.getUTCHours(), m: d.getUTCMinutes() };
}

describe("ianaFromAbbr", () => {
  it("maps UTC", () => expect(ianaFromAbbr("UTC")).toBe("UTC"));
  it("maps PT to America/Los_Angeles", () => expect(ianaFromAbbr("PT")).toBe("America/Los_Angeles"));
  it("maps PDT to America/Los_Angeles", () => expect(ianaFromAbbr("PDT")).toBe("America/Los_Angeles"));
  it("maps ET to America/New_York", () => expect(ianaFromAbbr("ET")).toBe("America/New_York"));
  it("maps BST to Europe/London", () => expect(ianaFromAbbr("BST")).toBe("Europe/London"));
  it("maps JST to Asia/Tokyo", () => expect(ianaFromAbbr("JST")).toBe("Asia/Tokyo"));
  it("returns null for unknown", () => expect(ianaFromAbbr("XYZ")).toBeNull());
});

describe("Core tz conversion: 16:00 UTC → 09:00 PDT (summer)", () => {
  it("converts 16:00 UTC to 09:00 in America/Los_Angeles on 2026-06-16", () => {
    const rows = parseAgenda("16:00 UTC", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    expect(rows).toHaveLength(1);
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // startUtc should be 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    // Formatted in PDT (UTC-7 in summer)
    const pdt = formatInZone(s.startUtc, "America/Los_Angeles");
    expect(pdt).toMatch(/9:00 AM/i);
  });
});

describe("24-hour with timezone abbreviation", () => {
  it("parses `16:00 UTC`", () => {
    const rows = parseAgenda("16:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    expect(s.sourceTime).toContain("16:00");
    expect(s.sourceTime).toContain("UTC");
  });

  it("parses `09:30 PT` (summer — PDT = UTC-7)", () => {
    const rows = parseAgenda("09:30 PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 30 });
  });
});

describe("12-hour with AM/PM and timezone", () => {
  it("parses `9:00 AM PT`", () => {
    const rows = parseAgenda("9:00 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 }); // 9 AM PDT = 16:00 UTC
  });

  it("parses `5:00 PM ET` (summer — EDT = UTC-4)", () => {
    const rows = parseAgenda("5:00 PM ET", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 21, m: 0 }); // 5 PM EDT = 21:00 UTC
  });

  it("parses `12:00 PM ET` (noon)", () => {
    const rows = parseAgenda("12:00 PM ET", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 }); // noon EDT = 16:00 UTC
  });

  it("parses `12:00 AM ET` (midnight)", () => {
    const rows = parseAgenda("12:00 AM ET", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 4, m: 0 }); // midnight EDT = 04:00 UTC
  });
});

describe("Time range parsing", () => {
  it("parses `9:00–9:45 AM PT` — both endpoints are AM", () => {
    const rows = parseAgenda("9:00–9:45 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 9:00 AM PDT = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    // 9:45 AM PDT = 16:45 UTC
    expect(s.endUtc).not.toBeNull();
    expect(utcHM(s.endUtc!)).toEqual({ h: 16, m: 45 });
  });

  it("parses `9:00-9:45 AM PT` (hyphen variant)", () => {
    const rows = parseAgenda("9:00-9:45 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    expect(utcHM(s.endUtc!)).toEqual({ h: 16, m: 45 });
  });

  it("does NOT parse `9:00–9:45 AM` as 9:00 AM – 9:45 PM", () => {
    const rows = parseAgenda("9:00–9:45 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    // endUtc should be 9:45 AM (16:45 UTC), NOT 9:45 PM
    expect(utcHM(s.endUtc!)).toEqual({ h: 16, m: 45 }); // 9:45 AM PDT = 16:45 UTC
  });

  it("parses `9:00 AM–10:00 AM PT` (both have explicit AM/PM)", () => {
    const rows = parseAgenda("9:00 AM–10:00 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    expect(utcHM(s.endUtc!)).toEqual({ h: 17, m: 0 });
  });
});

describe("Title extraction — separators", () => {
  it("em-dash before time: `Session 3 — 16:00 UTC`", () => {
    const rows = parseAgenda("Session 3 — 16:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toBe("Session 3");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });

  it("colon separator: `Keynote: 9:00 AM PT`", () => {
    const rows = parseAgenda("Keynote: 9:00 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toBe("Keynote");
  });

  it("time before title: `9:00 AM PT — Keynote`", () => {
    const rows = parseAgenda("9:00 AM PT — Keynote", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toBe("Keynote");
  });

  it("en-dash separator", () => {
    const rows = parseAgenda("Workshop – 14:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.title).toBe("Workshop");
  });
});

describe("Date headers", () => {
  it("ISO date header applies to following sessions", () => {
    const text = "2026-06-20\n16:00 UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows[0].type).toBe("dateheader");
    const s = rows[1] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.startUtc.toISOString()).toContain("2026-06-20");
  });

  it("Named date header: `Tuesday, June 16`", () => {
    const text = "Tuesday, June 16\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows[0].type).toBe("dateheader");
  });

  it("blank lines are skipped", () => {
    const text = "16:00 UTC\n\n17:00 UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(2);
  });
});

describe("Default timezone fallback", () => {
  it("line without tz uses source timezone", () => {
    // 16:00 without tz, source = America/New_York (EDT = UTC-4)
    const rows = parseAgenda("16:00", { sourceTimezone: "America/New_York", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 16:00 EDT = 20:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 20, m: 0 });
  });
});

describe("Unparsed lines", () => {
  it("flags `just some words with no time`", () => {
    const rows = parseAgenda("just some words with no time", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    const u = rows[0] as UnparsedLine;
    expect(u.type).toBe("unparsed");
    expect(u.hint).toContain("Couldn't read a time");
  });

  it("keeps valid sessions when one line is unparseable", () => {
    const text = "9:00 AM PT\njust garbage\n5:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(3);
    expect(rows[0].type).toBe("session");
    expect(rows[1].type).toBe("unparsed");
    expect(rows[2].type).toBe("session");
  });
});

describe("Out-of-scope: dual-timezone per line — first tz wins", () => {
  it("parses `12:00 ET / 17:00 BST` using first tz", () => {
    const rows = parseAgenda("12:00 ET / 17:00 BST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 12:00 PM EDT = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });
});

describe("Calendar link helpers", () => {
  const session: ParsedSession = {
    type: "session",
    title: "Test Session",
    startUtc: new Date("2026-06-16T16:00:00Z"),
    endUtc: new Date("2026-06-16T17:00:00Z"),
    sourceTime: "16:00 UTC",
    rawLine: "Test Session — 16:00 UTC",
  };

  it("buildGoogleCalendarUrl has correct action and dates", () => {
    const url = buildGoogleCalendarUrl(session);
    expect(url).toContain("calendar.google.com");
    expect(url).toContain("action=TEMPLATE");
    expect(url).toContain("20260616T160000Z");
    expect(url).toContain("20260616T170000Z");
  });

  it("buildIcsContent has DTSTART and DTEND", () => {
    const ics = buildIcsContent(session);
    expect(ics).toContain("DTSTART:20260616T160000Z");
    expect(ics).toContain("DTEND:20260616T170000Z");
    expect(ics).toContain("SUMMARY:Test Session");
    expect(ics).toContain("BEGIN:VCALENDAR");
  });

  it("endUtc null: defaults to +1 hour", () => {
    const s2: ParsedSession = { ...session, endUtc: null };
    const ics = buildIcsContent(s2);
    expect(ics).toContain("DTEND:20260616T170000Z");
  });
});

describe("URL encoding/decoding", () => {
  it("encodes and decodes round-trip", () => {
    const state = { text: "Session 3 — 16:00 UTC\n9:00 AM PT", sourceTimezone: "UTC" };
    const encoded = encodeAgendaState(state);
    const decoded = decodeAgendaState(encoded);
    expect(decoded).toEqual(state);
  });

  it("handles hash prefix", () => {
    const state = { text: "test", sourceTimezone: "America/New_York" };
    const encoded = encodeAgendaState(state);
    const decoded = decodeAgendaState("#" + encoded);
    expect(decoded).toEqual(state);
  });

  it("returns null for corrupt hash", () => {
    expect(decodeAgendaState("NOTVALID!!!")).toBeNull();
  });
});

describe("Timezone abbreviations", () => {
  it("maps all expected abbrs", () => {
    const expected = ["UTC", "GMT", "PT", "PST", "PDT", "ET", "EST", "EDT",
                      "CT", "CST", "CDT", "MT", "MST", "MDT", "BST", "CET",
                      "CEST", "IST", "JST", "AEST"];
    for (const abbr of expected) {
      expect(ianaFromAbbr(abbr)).not.toBeNull();
    }
  });
});
