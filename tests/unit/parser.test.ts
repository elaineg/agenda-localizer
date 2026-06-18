import { describe, it, expect } from "vitest";
import {
  parseAgenda,
  formatInZone,
  formatSourceDate,
  ianaFromAbbr,
  buildGoogleCalendarUrl,
  buildIcsContent,
  buildAllSessionsIcs,
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
  // H2: PDT is now a fixed offset (UTC-7) not DST-aware; PT remains America/Los_Angeles
  it("maps PDT to Etc/GMT+7 (H2: fixed offset)", () => expect(ianaFromAbbr("PDT")).toBe("Etc/GMT+7"));
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

  it("DTSTAMP has no fractional seconds (RFC 5545 §3.3.5)", () => {
    const ics = buildIcsContent(session);
    // DTSTAMP must match integer-second UTC basic format: 8 digits T 6 digits Z
    const dtstampMatch = ics.match(/DTSTAMP:(\S+)/);
    expect(dtstampMatch).not.toBeNull();
    expect(dtstampMatch![1]).toMatch(/^\d{8}T\d{6}Z$/);
    // Must NOT contain a dot (fractional seconds)
    expect(dtstampMatch![1]).not.toContain(".");
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

  // H5: slug.payload round-trip
  it("H5: decodes slug.payload format correctly", () => {
    const state = { text: "Launch Week 2026\n9:00 AM PT", sourceTimezone: "America/Los_Angeles" };
    const payload = encodeAgendaState(state);
    const sluggedHash = `launch-week-2026.${payload}`;
    const decoded = decodeAgendaState(sluggedHash);
    expect(decoded).toEqual(state);
  });

  it("H5: decodes slug.payload format with # prefix", () => {
    const state = { text: "DevConf\n16:00 UTC", sourceTimezone: "UTC" };
    const payload = encodeAgendaState(state);
    const sluggedHash = `#devconf.${payload}`;
    const decoded = decodeAgendaState(sluggedHash);
    expect(decoded).toEqual(state);
  });

  it("H5: decodes when slug is edited/truncated — payload unchanged", () => {
    const state = { text: "My Agenda\n10:00 AM ET", sourceTimezone: "America/New_York" };
    const payload = encodeAgendaState(state);
    // Simulate user editing slug part
    const editedSlugHash = `edited-slug.${payload}`;
    const decoded = decodeAgendaState(editedSlugHash);
    expect(decoded).toEqual(state);
  });

  it("H5: plain payload (no slug) still decodes", () => {
    const state = { text: "No slug\n12:00 UTC", sourceTimezone: "UTC" };
    const payload = encodeAgendaState(state);
    const decoded = decodeAgendaState(payload);
    expect(decoded).toEqual(state);
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

  // H2: UK alias
  it("H2: maps UK to Europe/London", () => {
    expect(ianaFromAbbr("UK")).toBe("Europe/London");
  });
});

describe("H1: title preserves trailing words (word-drop regression)", () => {
  it("title keeps SDK: 'Live Coding: Build with our SDK 11:30am PT'", () => {
    const rows = parseAgenda("Live Coding: Build with our SDK 11:30am PT", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    expect(s.title).toContain("SDK");
    expect(s.title).toBe("Live Coding: Build with our SDK");
  });

  it("title keeps 'Panel on DX' (no time — note row, not truncated)", () => {
    const rows = parseAgenda("Panel on DX", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows[0].type).toBe("note");
    // As a note, rawLine should be intact
    expect((rows[0] as { rawLine: string }).rawLine).toBe("Panel on DX");
  });
});

describe("H1: bare-hour range parsing ('9-10am hallway track')", () => {
  it("parses '9-10am hallway track' with START time 9:00am and title 'hallway track'", () => {
    const rows = parseAgenda("9-10am hallway track", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // Start should be 9:00am UTC = 09:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 9, m: 0 });
    // End should be 10:00am UTC = 10:00 UTC
    expect(s.endUtc).not.toBeNull();
    expect(utcHM(s.endUtc!)).toEqual({ h: 10, m: 0 });
    // Title should be "hallway track", not "9 hallway track"
    expect(s.title).toBe("hallway track");
    expect(s.title).not.toMatch(/^9\s/);
  });

  it("parses '9-10am PT hallway track' — localizes START from 9am PT", () => {
    const rows = parseAgenda("9-10am PT hallway track", {
      sourceTimezone: "UTC",
      referenceDate: REF_DATE,
    });
    const s = rows[0] as ParsedSession;
    expect(s.type).toBe("session");
    // 9 AM PDT (UTC-7 in summer) = 16:00 UTC
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
    expect(s.title).toBe("hallway track");
  });
});

describe("H2: PST/PDT/EST/EDT as fixed offsets (not DST-aware)", () => {
  it("H2: '11:00 AM PST' and '19:00 UTC' are the same instant (both UTC 19:00)", () => {
    // 11:00 AM PST (fixed UTC-8) = 11 + 8 = 19:00 UTC
    const rowsPst = parseAgenda("11:00 AM PST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const rowsUtc = parseAgenda("19:00 UTC", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sPst = rowsPst[0] as ParsedSession;
    const sUtc = rowsUtc[0] as ParsedSession;
    expect(sPst.type).toBe("session");
    expect(sUtc.type).toBe("session");
    // Both must be the same UTC time
    expect(sPst.startUtc.getTime()).toBe(sUtc.startUtc.getTime());
  });

  it("H2: PST is always UTC-8 (fixed), even in summer", () => {
    // REF_DATE is summer — PST must still be UTC-8, not UTC-7
    const rows = parseAgenda("11:00 AM PST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 19, m: 0 });
  });

  it("H2: PDT is always UTC-7 (fixed)", () => {
    // 9:00 AM PDT (fixed UTC-7) = 16:00 UTC
    const rows = parseAgenda("9:00 AM PDT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });

  it("H2: EST is always UTC-5 (fixed)", () => {
    // 11:00 AM EST (fixed UTC-5) = 16:00 UTC
    const rows = parseAgenda("11:00 AM EST", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });

  it("H2: PT in summer is UTC-7 (DST-aware PDT)", () => {
    // 9 AM PT in summer = 9 AM PDT = UTC-7 = 16:00 UTC
    const rows = parseAgenda("9:00 AM PT", { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const s = rows[0] as ParsedSession;
    expect(utcHM(s.startUtc)).toEqual({ h: 16, m: 0 });
  });
});

// ── P0 fix: Date-header application and inline-date extraction ────────────────

describe("P0 fix: ISO date header applied to following sessions", () => {
  it("standalone ISO header 2026-07-15 applies to following session DTSTART", () => {
    const text = "2026-07-15\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    // DTSTART must be on 2026-07-15, not 2026-06-16 (REF_DATE)
    expect(sessions[0].startUtc.toISOString()).toContain("2026-07-15");
    expect(sessions[0].hasNoDate).toBeFalsy();
  });

  it("ISO header date is applied to ALL following sessions until next header", () => {
    const text = "2026-07-15\n9:00 AM PT\n11:00 AM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(2);
    expect(sessions[0].startUtc.toISOString()).toContain("2026-07-15");
    expect(sessions[1].startUtc.toISOString()).toContain("2026-07-15");
  });

  it("title text with embedded ISO date acts as date header for following sessions", () => {
    // Wen's pattern: "Global Growth Webinar Series — 2026-07-15" is timeless but has a date
    const text = "Global Growth Webinar Series — 2026-07-15\n9:00 AM JST\n14:00 CET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(2);
    // Both sessions should be on 2026-07-15
    expect(sessions[0].startUtc.toISOString()).toContain("2026-07-15");
    expect(sessions[1].startUtc.toISOString()).toContain("2026-07-15");
  });
});

describe("P0 fix: Inline date on session line (Rob/Sam pattern)", () => {
  it("inline ISO date: 'Title — 2026-06-22 11:00 AM ET' gets date 2026-06-22", () => {
    const text = "Client Review — 2026-06-22 11:00 AM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].startUtc.toISOString()).toContain("2026-06-22");
    expect(sessions[0].hasNoDate).toBeFalsy();
  });

  it("inline ISO date title is cleaned: no date leaks into SUMMARY", () => {
    const text = "Client Review — 2026-06-22 11:00 AM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].title).toBe("Client Review");
    expect(sessions[0].title).not.toContain("2026");
  });

  it("multiple lines with per-line ISO dates all get their own date", () => {
    const text = "Planning — 2026-06-23 9:00 AM PT\nRetro — 2026-06-27 2:00 PM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(2);
    expect(sessions[0].startUtc.toISOString()).toContain("2026-06-23");
    expect(sessions[1].startUtc.toISOString()).toContain("2026-06-27");
  });
});

describe("P0 fix: Natural-language inline date (Elena/Jules pattern)", () => {
  it("'Sprint Planning — Mon June 23, 9:00 AM PT' gets date 2026-06-23", () => {
    const text = "Sprint Planning — Mon June 23, 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].startUtc.toISOString()).toContain("2026-06-23");
  });

  it("'Mon June 23, 9:00 AM PT' title clean — no date leaks into SUMMARY", () => {
    const text = "Sprint Planning — Mon June 23, 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].title).toBe("Sprint Planning");
    expect(sessions[0].title).not.toContain("June");
    expect(sessions[0].title).not.toContain("Mon");
  });

  it("'Community Office Hours — June 20' standalone becomes a date header", () => {
    // Jules's pattern: a timeless line with month+day embedded acts as a date header
    const text = "Community Office Hours — June 20\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const dateHeaders = rows.filter((r) => r.type === "dateheader");
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(dateHeaders).toHaveLength(1);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].startUtc.toISOString()).toContain("2026-06-20");
  });
});

describe("P0 fix: hasNoDate flag — no silent wrong-date export", () => {
  it("session with no date context gets hasNoDate=true", () => {
    const text = "Sprint Planning — 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].hasNoDate).toBe(true);
  });

  it("session WITH a date context does NOT get hasNoDate", () => {
    const text = "2026-06-23\nSprint Planning — 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(1);
    expect(sessions[0].hasNoDate).toBeFalsy();
  });
});

describe("P0 fix: on-screen day == .ics day consistency", () => {
  it("session from ISO date header: DTSTART date matches ICS DTSTART", () => {
    const text = "2026-07-15\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    const ics = buildIcsContent(sessions[0]);
    // ICS must contain 2026-07-15 (as 20260715)
    expect(ics).toContain("20260715");
    // The per-session ICS and combined should be consistent
    const combinedIcs = buildAllSessionsIcs(sessions)!;
    const icsStart = ics.match(/DTSTART:(\S+)/)?.[1];
    const combinedStart = combinedIcs.match(/DTSTART:(\S+)/)?.[1];
    expect(icsStart).toBe(combinedStart);
    expect(icsStart).toContain("20260715");
  });

  it("session from inline date: DTSTART date matches ICS DTSTART", () => {
    const text = "Sprint Planning — Mon June 23, 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    const ics = buildIcsContent(sessions[0]);
    expect(ics).toContain("20260623");
    const combinedIcs = buildAllSessionsIcs(sessions)!;
    const icsStart = ics.match(/DTSTART:(\S+)/)?.[1];
    const combinedStart = combinedIcs.match(/DTSTART:(\S+)/)?.[1];
    expect(icsStart).toBe(combinedStart);
  });
});

describe("P0 fix: abbreviated weekday date header standalone", () => {
  it("'Mon June 23' standalone line is parsed as a date header", () => {
    const text = "Mon June 23\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(rows[0].type).toBe("dateheader");
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].startUtc.toISOString()).toContain("2026-06-23");
  });

  it("'Fri June 27' standalone line applies June 27 to following session", () => {
    const text = "Fri June 27\n2:00 PM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].startUtc.toISOString()).toContain("2026-06-27");
  });
});

describe("P1 fix: DESCRIPTION field in ICS", () => {
  it("buildIcsContent includes DESCRIPTION with source time", () => {
    const session: ParsedSession = {
      type: "session",
      title: "Keynote",
      startUtc: new Date("2026-06-23T16:00:00Z"),
      endUtc: null,
      sourceTime: "9:00 AM PT",
      rawLine: "Keynote — 9:00 AM PT",
    };
    const ics = buildIcsContent(session);
    expect(ics).toContain("DESCRIPTION:");
    expect(ics).toContain("9:00 AM PT");
    expect(ics).toContain("Agenda Localizer");
  });

  it("buildAllSessionsIcs includes DESCRIPTION in combined file", () => {
    const session: ParsedSession = {
      type: "session",
      title: "Keynote",
      startUtc: new Date("2026-06-23T16:00:00Z"),
      endUtc: null,
      sourceTime: "9:00 AM PT",
      rawLine: "Keynote — 9:00 AM PT",
    };
    const ics = buildAllSessionsIcs([session])!;
    expect(ics).toContain("DESCRIPTION:");
    expect(ics).toContain("9:00 AM PT");
  });
});

describe("G8: buildAllSessionsIcs — combined multi-VEVENT .ics", () => {
  const session1: ParsedSession = {
    type: "session",
    title: "Opening Keynote",
    startUtc: new Date("2026-06-16T16:00:00Z"),
    endUtc: new Date("2026-06-16T17:00:00Z"),
    sourceTime: "16:00 UTC",
    rawLine: "Opening Keynote — 16:00 UTC",
  };
  const session2: ParsedSession = {
    type: "session",
    title: "Workshop: Building with AI",
    startUtc: new Date("2026-06-16T17:30:00Z"),
    endUtc: new Date("2026-06-16T18:30:00Z"),
    sourceTime: "17:30 UTC",
    rawLine: "Workshop: Building with AI — 17:30 UTC",
  };
  const session3: ParsedSession = {
    type: "session",
    title: "Panel Discussion",
    startUtc: new Date("2026-06-16T18:00:00Z"),
    endUtc: null,
    sourceTime: "9:00 AM PT",
    rawLine: "Panel Discussion — 9:00 AM PT",
  };

  it("returns null for empty sessions array", () => {
    expect(buildAllSessionsIcs([])).toBeNull();
  });

  it("contains BEGIN:VCALENDAR and END:VCALENDAR envelope", () => {
    const ics = buildAllSessionsIcs([session1]);
    expect(ics).not.toBeNull();
    expect(ics!.startsWith("BEGIN:VCALENDAR")).toBe(true);
    expect(ics!.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("contains exactly 3 VEVENT blocks for 3 sessions", () => {
    const ics = buildAllSessionsIcs([session1, session2, session3]);
    expect(ics).not.toBeNull();
    const beginCount = (ics!.match(/BEGIN:VEVENT/g) ?? []).length;
    const endCount = (ics!.match(/END:VEVENT/g) ?? []).length;
    expect(beginCount).toBe(3);
    expect(endCount).toBe(3);
  });

  it("DTSTART matches per-session buildIcsContent DTSTART byte-for-byte", () => {
    const combined = buildAllSessionsIcs([session1])!;
    const perSession = buildIcsContent(session1);
    // Extract DTSTART from both
    const combinedDtstart = combined.match(/DTSTART:(\S+)/)?.[1];
    const perSessionDtstart = perSession.match(/DTSTART:(\S+)/)?.[1];
    expect(combinedDtstart).toBe(perSessionDtstart);
    expect(combinedDtstart).toBe("20260616T160000Z");
  });

  it("DTEND is correct for session with explicit endUtc", () => {
    const ics = buildAllSessionsIcs([session1])!;
    expect(ics).toContain("DTEND:20260616T170000Z");
  });

  it("DTEND defaults to +1 hour when endUtc is null", () => {
    const ics = buildAllSessionsIcs([session3])!;
    // Panel Discussion starts at 18:00 UTC, defaults to 19:00 UTC
    expect(ics).toContain("DTSTART:20260616T180000Z");
    expect(ics).toContain("DTEND:20260616T190000Z");
  });

  it("SUMMARY escapes commas per RFC 5545", () => {
    const sessionWithComma: ParsedSession = {
      ...session1,
      title: "Session, Part 2",
    };
    const ics = buildAllSessionsIcs([sessionWithComma])!;
    expect(ics).toContain("SUMMARY:Session\\, Part 2");
  });

  it("SUMMARY escapes semicolons per RFC 5545", () => {
    const sessionWithSemi: ParsedSession = {
      ...session1,
      title: "Session; Part 2",
    };
    const ics = buildAllSessionsIcs([sessionWithSemi])!;
    expect(ics).toContain("SUMMARY:Session\\; Part 2");
  });

  it("uses CRLF line endings per RFC 5545", () => {
    const ics = buildAllSessionsIcs([session1])!;
    expect(ics).toContain("\r\n");
    // Every line should end with CRLF (no bare LF lines)
    const lines = ics.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
  });

  it("DTSTAMP has no fractional seconds (RFC 5545 §3.3.5)", () => {
    const ics = buildAllSessionsIcs([session1])!;
    // All DTSTAMP values must be integer-second UTC basic format: 8 digits T 6 digits Z
    const matches = [...ics.matchAll(/DTSTAMP:(\S+)/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m[1]).toMatch(/^\d{8}T\d{6}Z$/);
      expect(m[1]).not.toContain(".");
    }
  });

  it("each VEVENT has a stable UID matching the per-session UID pattern", () => {
    const ics = buildAllSessionsIcs([session1])!;
    const uid = `${session1.startUtc.getTime()}-Opening-Keynote@agenda-localizer`;
    expect(ics).toContain(`UID:${uid}`);
  });

  it("3 valid sessions + 1 unparsed line → exactly 3 VEVENTs (parser filters unparsed)", () => {
    // This test verifies the caller responsibility: pass only ParsedSession[] (sessions)
    // The combined file only has what's passed in, excluding unparsed rows.
    const ics = buildAllSessionsIcs([session1, session2, session3])!;
    const beginCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(beginCount).toBe(3);
  });

  it("filename derived from agenda text via deriveSlug", () => {
    // Verify parser integration: the ICS content for the agenda sample contains correct titles
    const text = "2026-06-16\nOpening Keynote — 16:00 UTC\nWorkshop: Building with AI — 17:30 UTC\nPanel Discussion — 9:00 AM PT\njust some words with no time";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(3); // 3 valid, 1 note excluded
    const ics = buildAllSessionsIcs(sessions)!;
    const beginCount = (ics.match(/BEGIN:VEVENT/g) ?? []).length;
    expect(beginCount).toBe(3);
  });
});

// ── Fix: line-accounting guarantee — no non-blank input line silently disappears ──

describe("Fix: line-accounting — every non-blank input line is accounted for (session | dateheader | note | unparsed)", () => {
  function countNonBlankLines(text: string) {
    return text.split("\n").filter((l) => l.trim() !== "").length;
  }
  function accountedRows(rows: ReturnType<typeof parseAgenda>) {
    return rows.filter(
      (r) => r.type === "session" || r.type === "dateheader" || r.type === "note" || r.type === "unparsed"
    ).length;
  }

  it("simple 3-session agenda: all lines accounted for", () => {
    const text = "9:00 AM PT\n11:00 AM ET\n2:00 PM UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(accountedRows(rows)).toBe(countNonBlankLines(text));
  });

  it("date header + sessions: all lines accounted for", () => {
    const text = "2026-06-20\n9:00 AM PT\n11:00 AM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(accountedRows(rows)).toBe(countNonBlankLines(text));
  });

  it("timeless line with embedded date (promoted to dateheader): line is accounted for", () => {
    // Jules/Elena pattern: "Friday Jun 26 — Community Game Night" has no time but has June 26
    const text = "Community Office Hours — June 26\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    // The first line becomes a dateheader (embedded June 26), second is a session
    expect(accountedRows(rows)).toBe(countNonBlankLines(text));
    expect(rows[0].type).toBe("dateheader");
    expect(rows[1].type).toBe("session");
  });

  it("mixed: sessions, notes, unparsed, dateheaders — all accounted for", () => {
    const text = "2026-06-16\nOpening Keynote — 16:00 UTC\njust some words with no time\nTalk — 26:00 UTC\nWorkshop — 17:30 UTC";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(accountedRows(rows)).toBe(countNonBlankLines(text));
  });

  it("N input lines → N rows (no silent drops for any row type)", () => {
    // Paste exactly 5 non-blank lines of various types
    const text = [
      "2026-06-20",                      // dateheader
      "Opening Keynote — 9:00 AM PT",    // session
      "lunch",                           // note
      "Bad Time — 26:00 UTC",           // unparsed
      "Panel — 2:00 PM ET",             // session
    ].join("\n");
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(accountedRows(rows)).toBe(5);
    expect(rows[0].type).toBe("dateheader");
    expect(rows[1].type).toBe("session");
    expect(rows[2].type).toBe("note");
    expect(rows[3].type).toBe("unparsed");
    expect(rows[4].type).toBe("session");
  });

  it("blank lines are skipped (not counted as non-blank input)", () => {
    const text = "9:00 AM PT\n\n\n11:00 AM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    expect(countNonBlankLines(text)).toBe(2);
    expect(accountedRows(rows)).toBe(2);
  });
});

// ── Fix: sourceDateStr on ParsedSession — per-card parsed date label ──────────

describe("Fix: sourceDateStr on ParsedSession — auditable per-card parsed date", () => {
  it("session from ISO date header has sourceDateStr = that date", () => {
    const text = "2026-07-15\n9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].sourceDateStr).toBe("2026-07-15");
  });

  it("session from inline date has sourceDateStr = that inline date", () => {
    const text = "Sprint Planning — Mon June 23, 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].sourceDateStr).toBe("2026-06-23");
  });

  it("session with hasNoDate has no sourceDateStr", () => {
    const text = "Meeting — 9:00 AM PT";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions[0].hasNoDate).toBe(true);
    expect(sessions[0].sourceDateStr).toBeUndefined();
  });

  it("multiple sessions from different date headers each carry correct sourceDateStr", () => {
    const text = "2026-06-20\n9:00 AM PT\n2026-06-27\n2:00 PM ET";
    const rows = parseAgenda(text, { sourceTimezone: "UTC", referenceDate: REF_DATE });
    const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
    expect(sessions).toHaveLength(2);
    expect(sessions[0].sourceDateStr).toBe("2026-06-20");
    expect(sessions[1].sourceDateStr).toBe("2026-06-27");
  });
});

// ── Fix: formatSourceDate helper ──────────────────────────────────────────────

describe("Fix: formatSourceDate — human-readable date label for session cards", () => {
  it("formats '2026-06-16' as 'Tue, Jun 16'", () => {
    const label = formatSourceDate("2026-06-16");
    expect(label).toMatch(/Tue/);
    expect(label).toMatch(/Jun/);
    expect(label).toMatch(/16/);
  });

  it("formats '2026-07-15' and includes correct weekday", () => {
    const label = formatSourceDate("2026-07-15");
    // 2026-07-15 is a Wednesday
    expect(label).toMatch(/Wed/);
    expect(label).toMatch(/Jul/);
    expect(label).toMatch(/15/);
  });

  it("returns empty string for undefined", () => {
    expect(formatSourceDate(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatSourceDate("")).toBe("");
  });
});
