import { describe, it, expect } from "vitest";
import {
  parseAgenda,
  formatInZone,
  ianaFromAbbr,
  buildGoogleCalendarUrl,
  buildIcsContent,
  encodeAgendaState,
  decodeAgendaState,
  computeDateCross,
  localDateString,
  type ParsedSession,
  type UnparsedLine,
  type NoteLine,
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
  it("maps SGT to Asia/Singapore (G3)", () => expect(ianaFromAbbr("SGT")).toBe("Asia/Singapore"));
  it("maps HKT to Asia/Hong_Kong (G3)", () => expect(ianaFromAbbr("HKT")).toBe("Asia/Hong_Kong"));
  it("maps KST to Asia/Seoul (G3)", () => expect(ianaFromAbbr("KST")).toBe("Asia/Seoul"));
  it("maps AEST to Australia/Sydney", () => expect(ianaFromAbbr("AEST")).toBe("Australia/Sydney"));
  it("maps NZST to Pacific/Auckland (G3)", () => expect(ianaFromAbbr("NZST")).toBe("Pacific/Auckland"));
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

describe("PST/PDT literal conversion (G3)", () => {
  it("parses `9:00 AM PST` as UTC+8 in winter (PST = UTC-8)", () => {
    // Use a winter reference date to get PST (not PDT)
    const winterRef = new Date("2026-01-15T00:00:00Z");
    const rows = parseAgenda("9:00 AM PST", { sourceTimezone: "UTC", referenceDate: winterRef });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 9:00 AM PST (UTC-8) = 17:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 17, m: 0 });
  });

  it("parses `9:00 AM PDT` as UTC+7 in summer (PDT = UTC-7)", () => {
    const rows = parseAgenda("9:00 AM PDT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 9:00 AM PDT (UTC-7) = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });
});

describe("Date-cross badge (G3)", () => {
  it("shows +1 day when late-evening UTC session lands next day in Tokyo (JST = UTC+9)", () => {
    // 22:00 UTC on 2026-06-16 = 07:00 JST on 2026-06-17 → +1 day
    const rows = parseAgenda("22:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    const cross = computeDateCross(s, "Asia/Tokyo");
    expect(cross).toBe("+1 day");
  });

  it("no badge when session is same day in viewer tz", () => {
    // 16:00 UTC = 09:00 PDT same day
    const rows = parseAgenda("16:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    const cross = computeDateCross(s, "America/Los_Angeles");
    expect(cross).toBeUndefined();
  });

  it("shows -1 day when early UTC crosses back a day westward (extreme case)", () => {
    // 01:00 UTC on 2026-06-16 = 18:00 PDT on 2026-06-15 → -1 day
    const rows = parseAgenda("01:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    const cross = computeDateCross(s, "America/Los_Angeles");
    expect(cross).toBe("-1 day");
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

describe("Bare-hour am/pm parsing (G1)", () => {
  it("parses `8pm` as 20:00 UTC (source UTC)", () => {
    const rows = parseAgenda("8pm", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 20, m: 0 });
  });

  it("parses `6pm` as 18:00 UTC (source UTC)", () => {
    const rows = parseAgenda("Standup 6pm", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 18, m: 0 });
  });

  it("parses `7 PM` as 19:00 UTC (source UTC)", () => {
    const rows = parseAgenda("7 PM", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 19, m: 0 });
  });

  it("parses `9am` as 09:00 UTC (source UTC)", () => {
    const rows = parseAgenda("9am", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 9, m: 0 });
  });

  it("parses `11 p.m.` as 23:00 UTC (source UTC)", () => {
    const rows = parseAgenda("11 p.m.", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 23, m: 0 });
  });

  it("parses `4 PM ET` — bare hour with timezone", () => {
    const rows = parseAgenda("4 PM ET", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 4 PM EDT (UTC-4) = 20:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 20, m: 0 });
  });

  it("parses `Keynote 9am PT` — bare hour with title and tz", () => {
    const rows = parseAgenda("Keynote 9am PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 9 AM PDT (UTC-7) = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });
});

describe("Word times: noon and midnight (G1)", () => {
  it("parses `noon` as 12:00 UTC (source UTC)", () => {
    const rows = parseAgenda("noon", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 12, m: 0 });
  });

  it("parses `midnight` as 00:00 UTC (source UTC)", () => {
    const rows = parseAgenda("midnight", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(utcHM(s.startUtc)).toEqual({ h: 0, m: 0 });
  });

  it("parses `noon CET` correctly (CET = UTC+1)", () => {
    const winterRef = new Date("2026-01-15T00:00:00Z");
    const rows = parseAgenda("noon CET", { sourceTimezone: "UTC", referenceDate: winterRef });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // noon CET (UTC+1) = 11:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 11, m: 0 });
  });

  it("parses `Lunch Break noon` as a session", () => {
    const rows = parseAgenda("Lunch Break noon", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
  });
});

describe("Note lines — timeless lines are notes, NOT errors (G1)", () => {
  it("`Day 1 — Summit` is a note, not an error", () => {
    const rows = parseAgenda("Day 1 — Summit", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("note");
  });

  it("`lunch` is a note", () => {
    const rows = parseAgenda("lunch", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("note");
  });

  it("`TBD` is a note", () => {
    const rows = parseAgenda("TBD", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("note");
  });

  it("`just some words with no time` is a note (not error)", () => {
    const rows = parseAgenda("just some words with no time", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("note");
  });

  it("section header with words only is a note", () => {
    const rows = parseAgenda("Opening Ceremony", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("note");
  });
});

describe("Malformed time lines — clearly intended a time but out of range (G1)", () => {
  it("`Talk — 26:00 UTC` is unparsed (hour 26 out of range)", () => {
    const rows = parseAgenda("Talk — 26:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("`99:99 UTC` is unparsed", () => {
    const rows = parseAgenda("99:99 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("`24:00 UTC` is unparsed (24 is not valid in 0–23 range)", () => {
    const rows = parseAgenda("24:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("`Session 4 — 99:99` is unparsed (attempted malformed time)", () => {
    const rows = parseAgenda("Session 4 — 99:99", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });
});

describe("Mixed note + session + malformed lines (G1)", () => {
  it("keeps notes and sessions in original order", () => {
    const text = "Day 1 — Summit\n9:00 AM PT\nlunch\n5:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(4);
    expect(rows[0].type).toBe("note");
    expect(rows[1].type).toBe("session");
    expect(rows[2].type).toBe("note");
    expect(rows[3].type).toBe("session");
  });

  it("keeps valid sessions when a malformed time line is present", () => {
    const text = "9:00 AM PT\nTalk — 26:00 UTC\n5:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(3);
    expect(rows[0].type).toBe("session");
    expect(rows[1].type).toBe("unparsed");
    expect(rows[2].type).toBe("session");
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

describe("Title extraction — separators (G7)", () => {
  it("em-dash before time: `Session 3 — 16:00 UTC`", () => {
    const rows = parseAgenda("Session 3 — 16:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toBe("Session 3");
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
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

  it("internal colons are KEPT (G7): `Workshop: Building with AI — 17:30 UTC`", () => {
    const rows = parseAgenda("Workshop: Building with AI — 17:30 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toContain("Workshop");
    expect(s.title).toContain("Building with AI");
    // Must contain the colon
    expect(s.title).toContain(":");
  });

  it("trailing tz token stripped from title: bare SGT after title (G7)", () => {
    // "Kickoff SGT" — when SGT is recognized as a tz, title should not contain SGT
    const rows = parseAgenda("Kickoff 9:00 SGT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).not.toContain("SGT");
  });

  it("trailing @ is stripped from title (G7)", () => {
    const rows = parseAgenda("Standup @ 9:00 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).not.toMatch(/@\s*$/);
  });
});

describe("Title extraction: colon separator still works", () => {
  it("colon separator: `Keynote: 9:00 AM PT` — title is Keynote", () => {
    const rows = parseAgenda("Keynote: 9:00 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toBe("Keynote");
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

describe("Out-of-scope: dual-timezone per line — first tz wins", () => {
  it("parses `12:00 ET / 17:00 BST` using first tz", () => {
    const rows = parseAgenda("12:00 ET / 17:00 BST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 12:00 PM EDT = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });

  it("strips dual-tz remainder from title: `Talk — 12:00 ET / 17:00 BST`", () => {
    const rows = parseAgenda("Talk — 12:00 ET / 17:00 BST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toBe("Talk");
  });
});

describe("Out-of-range time values — must flag as unparsed, never crash", () => {
  it("flags `Talk — 26:00 UTC` as unparsed (hour 26 out of range)", () => {
    const rows = parseAgenda("Talk — 26:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("flags `Talk — 25:99 UTC` as unparsed (hour 25, minute 99 both out of range)", () => {
    const rows = parseAgenda("Talk — 25:99 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("flags `99:99 UTC` as unparsed", () => {
    const rows = parseAgenda("99:99 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("flags `24:00 UTC` as unparsed (24 is not valid in 0–23 range)", () => {
    const rows = parseAgenda("24:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("unparsed");
  });

  it("parses valid boundary `23:59 UTC` correctly", () => {
    const rows = parseAgenda("23:59 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("session");
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 23, m: 59 });
  });

  it("parses valid boundary `00:00 UTC` correctly", () => {
    const rows = parseAgenda("00:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("session");
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 0, m: 0 });
  });

  it("keeps other valid sessions when an out-of-range line is present", () => {
    const text = "9:00 AM PT\nTalk — 26:00 UTC\n5:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows).toHaveLength(3);
    expect(rows[0].type).toBe("session");
    expect(rows[1].type).toBe("unparsed");
    expect(rows[2].type).toBe("session");
  });
});

describe("G2: shared view — unparsed lines are omitted, not shown as warnings", () => {
  it("malformed line produces unparsed row in parser (creator can see)", () => {
    const rows = parseAgenda("Talk — 26:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows[0].type).toBe("unparsed");
  });

  it("shared view should omit unparsed rows (test via parser: notes/sessions only)", () => {
    const text = "9:00 AM PT\nTalk — 26:00 UTC\n5:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    // Filter as shared view would: exclude unparsed
    const sharedRows = rows.filter((r) => r.type !== "unparsed");
    expect(sharedRows).toHaveLength(2);
    expect(sharedRows.every((r) => r.type !== "unparsed")).toBe(true);
  });
});

describe("G3: SGT and other business timezones", () => {
  it("parses `9:00 AM SGT` correctly (SGT = UTC+8)", () => {
    const rows = parseAgenda("9:00 AM SGT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 9:00 AM SGT (UTC+8) = 01:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 1, m: 0 });
  });

  it("parses `14:00 KST` (KST = UTC+9)", () => {
    const rows = parseAgenda("14:00 KST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 14:00 KST (UTC+9) = 05:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 5, m: 0 });
  });
});

describe("localDateString helper", () => {
  it("returns correct date in Tokyo for 22:00 UTC on 2026-06-16", () => {
    const utc = new Date("2026-06-16T22:00:00Z");
    const d = localDateString(utc, "Asia/Tokyo");
    expect(d).toBe("2026-06-17");
  });

  it("returns same date in NY for 16:00 UTC on 2026-06-16", () => {
    const utc = new Date("2026-06-16T16:00:00Z");
    const d = localDateString(utc, "America/New_York");
    expect(d).toBe("2026-06-16");
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
  it("maps all expected abbrs including new G3 additions", () => {
    const expected = ["UTC", "GMT", "PT", "PST", "PDT", "ET", "EST", "EDT",
                      "CT", "CST", "CDT", "MT", "MST", "MDT", "BST", "CET",
                      "CEST", "IST", "JST", "SGT", "HKT", "KST", "AEST", "NZST"];
    for (const abbr of expected) {
      expect(ianaFromAbbr(abbr)).not.toBeNull();
    }
  });
});
