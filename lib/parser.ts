/**
 * Agenda Localizer — Pure parser module.
 * Converts free-text multi-session agenda into structured sessions.
 * All state is serializable; no DOM or React dependencies.
 */

export interface ParsedSession {
  type: "session";
  title: string;
  startUtc: Date;
  endUtc: Date | null;
  sourceTime: string; // e.g. "16:00 UTC" — display string
  rawLine: string;
  /** True if localized time lands on a different calendar day than the source date */
  dateCross?: "+1 day" | "-1 day";
  /** If the per-line tz token was not recognized, this holds the unknown token string */
  unknownTzToken?: string;
  /**
   * True when no date could be resolved for this session (no date header, no inline date).
   * The DTSTART day is the parser's reference date (today) — warn the user.
   */
  hasNoDate?: boolean;
  /**
   * The resolved source date string (YYYY-MM-DD) for this session, for per-card display.
   * Undefined only when hasNoDate is true.
   */
  sourceDateStr?: string;
}

export interface UnparsedLine {
  type: "unparsed";
  rawLine: string;
  hint: string;
}

/** A line with no detectable time — section headers, notes, "lunch", "TBD", etc. */
export interface NoteLine {
  type: "note";
  rawLine: string;
}

export interface DateHeader {
  type: "dateheader";
  rawLine: string;
  date: string; // YYYY-MM-DD
}

export type AgendaRow = ParsedSession | UnparsedLine | NoteLine | DateHeader;

// ── Timezone abbreviation → IANA offset map ──────────────────────────────────
// H2: Literal standard abbreviations (PST, EST, etc.) map to FIXED-offset zones
// so "11:00 AM PST" and "19:00 UTC" are the same instant regardless of season.
// DST-aware aliases (PT, ET, CT, MT) continue to use DST-aware IANA zones.
const TZ_ABBR_TO_IANA: Record<string, string> = {
  UTC: "UTC",
  GMT: "UTC",
  // Pacific — DST-aware vs. fixed offset
  PT: "America/Los_Angeles",     // DST-aware: PDT in summer, PST in winter
  PST: "Etc/GMT+8",              // fixed UTC-8 always
  PDT: "Etc/GMT+7",              // fixed UTC-7 always
  // Eastern — DST-aware vs. fixed offset
  ET: "America/New_York",        // DST-aware
  EST: "Etc/GMT+5",              // fixed UTC-5 always
  EDT: "Etc/GMT+4",              // fixed UTC-4 always
  // Central — DST-aware vs. fixed offset
  CT: "America/Chicago",         // DST-aware
  CST: "Etc/GMT+6",              // fixed UTC-6 always
  CDT: "Etc/GMT+5",              // fixed UTC-5 always
  // Mountain — DST-aware vs. fixed offset
  MT: "America/Denver",          // DST-aware
  MST: "Etc/GMT+7",              // fixed UTC-7 always
  MDT: "Etc/GMT+6",              // fixed UTC-6 always
  // UK / British — alias "UK" to Europe/London (DST-aware BST/GMT)
  UK: "Europe/London",
  BST: "Europe/London",
  GMT_LONDON: "Europe/London",   // internal alias
  // Central European
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  // India
  IST: "Asia/Kolkata",
  // Japan
  JST: "Asia/Tokyo",
  // Singapore
  SGT: "Asia/Singapore",
  // Hong Kong
  HKT: "Asia/Hong_Kong",
  // Korea
  KST: "Asia/Seoul",
  // Australia Eastern
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
  // New Zealand
  NZST: "Pacific/Auckland",
  NZDT: "Pacific/Auckland",
  // China Standard Time
  CST_CN: "Asia/Shanghai", // internal alias; CST abbr already used by Central
};

// All recognizable tz abbreviations (for regex) — exclude internal aliases
const INTERNAL_ALIASES = new Set(["CST_CN", "GMT_LONDON"]);
const ALL_TZ_ABBRS = Object.keys(TZ_ABBR_TO_IANA)
  .filter((k) => !INTERNAL_ALIASES.has(k))
  .join("|");

export const SUPPORTED_TZ_ABBRS = Object.keys(TZ_ABBR_TO_IANA);

export function ianaFromAbbr(abbr: string): string | null {
  return TZ_ABBR_TO_IANA[abbr.toUpperCase()] ?? null;
}

/**
 * Convert a wall-clock time in the given IANA timezone to a UTC Date.
 * Uses the Intl API for DST-correct conversion.
 */
export function wallToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  ianaZone: string
): Date {
  // Build a reference date string and find the UTC offset at that moment
  // We use the trick: format a known UTC time into the target zone and compare
  // Iterative approach: first guess, then adjust for DST edge
  const isoGuess = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;

  if (ianaZone === "UTC") {
    return new Date(isoGuess + "Z");
  }

  // Get offset by formatting a UTC time and comparing to local wall time
  // Strategy: guess UTC = wall, then correct
  const guessUtc = new Date(isoGuess + "Z");
  const offset = getUtcOffset(guessUtc, ianaZone); // offset in minutes (positive = ahead of UTC)
  const adjustedUtc = new Date(guessUtc.getTime() - offset * 60000);
  // Verify and re-adjust once (handles edge cases near DST transitions)
  const offset2 = getUtcOffset(adjustedUtc, ianaZone);
  const finalUtc = new Date(guessUtc.getTime() - offset2 * 60000);
  return finalUtc;
}

/**
 * Returns the UTC offset in minutes for a given IANA zone at a specific UTC moment.
 * Positive = zone is ahead of UTC (e.g., IST +330).
 */
function getUtcOffset(utcDate: Date, ianaZone: string): number {
  // Format the UTC date in the target timezone
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(utcDate);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);

  const lYear = get("year");
  const lMonth = get("month");
  const lDay = get("day");
  let lHour = get("hour");
  const lMinute = get("minute");
  // hour12:false can return 24 for midnight
  if (lHour === 24) lHour = 0;

  const localWall = Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute);
  const utcMs = Date.UTC(
    utcDate.getUTCFullYear(),
    utcDate.getUTCMonth(),
    utcDate.getUTCDate(),
    utcDate.getUTCHours(),
    utcDate.getUTCMinutes()
  );
  return (localWall - utcMs) / 60000;
}

/**
 * Format a UTC date into a wall-clock time in the viewer's timezone.
 */
export function formatInZone(
  utcDate: Date,
  ianaZone: string,
  opts?: { includeDate?: boolean }
): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ianaZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...(opts?.includeDate
      ? { weekday: "short", month: "short", day: "numeric" }
      : {}),
  });
  return fmt.format(utcDate);
}

/**
 * Format a YYYY-MM-DD source date string as a short human label, e.g. "Tue, Jun 16".
 * Returns empty string if the input is falsy or unparseable.
 */
export function formatSourceDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00Z");
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Get the calendar date (YYYY-MM-DD) of a UTC timestamp in a given IANA zone.
 */
export function localDateString(utcDate: Date, ianaZone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: ianaZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(utcDate); // en-CA → YYYY-MM-DD
}

// ── Date header detection ──────────────────────────────────────────────────

// Standalone ISO date line: "2026-06-16"
const ISO_DATE_STANDALONE_RE = /^\s*(\d{4}-\d{2}-\d{2})\s*$/;
// ISO date embedded anywhere in a line: "... 2026-06-22 ..."
const ISO_DATE_EMBEDDED_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

// Full weekday + month + day (standalone header): "Tuesday, June 16" or "Mon June 23"
// Abbreviated (Mon/Tue/…) OR full (Monday/Tuesday/…) optional weekday, then "Month DD[, YYYY]"
const NAMED_DATE_STANDALONE_RE =
  /^\s*(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?,?\s+)?([A-Z][a-z]+ \d{1,2}(?:,? \d{4})?)\s*$/i;

// Abbreviated weekday + month + day embedded in a line (e.g. "Mon June 23" anywhere)
// Full-weekday embedded (e.g. "Tuesday June 16")
const NAMED_DATE_EMBEDDED_RE =
  /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\.?,?\s+([A-Z][a-z]+ \d{1,2}(?:,? \d{4})?)/i;
// Month + day only, embedded (e.g. "June 20")
const MONTH_DAY_EMBEDDED_RE =
  /\b(January|February|March|April|May|June|July|August|September|October|November|December) (\d{1,2})(?:,? (\d{4}))?\b/i;

/** Parse a "Month DD[, YYYY]" string to YYYY-MM-DD. Returns null if invalid. */
function parseMonthDay(monthDay: string, yearHint = 2026): string | null {
  const d = new Date(monthDay + (monthDay.match(/\d{4}/) ? "" : `, ${yearHint}`));
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Try to parse a standalone date header line (entire line is just a date).
 * Returns YYYY-MM-DD or null.
 */
function tryParseDateHeader(line: string): string | null {
  // Standalone ISO date
  const isoMatch = ISO_DATE_STANDALONE_RE.exec(line);
  if (isoMatch) return isoMatch[1];

  // Standalone named date (full or abbreviated weekday + "Month DD[, YYYY]")
  const namedMatch = NAMED_DATE_STANDALONE_RE.exec(line);
  if (namedMatch) {
    return parseMonthDay(namedMatch[1]);
  }
  return null;
}

/**
 * Try to extract an inline date from a session line (line has BOTH a date and a time).
 * Returns YYYY-MM-DD or null.
 * Priority: ISO date > weekday+month+day > month+day.
 */
function tryExtractInlineDate(line: string): string | null {
  // ISO date embedded: "Title — 2026-06-22 11:00 AM ET"
  const isoEmbed = ISO_DATE_EMBEDDED_RE.exec(line);
  if (isoEmbed) return isoEmbed[1];

  // Weekday + month + day embedded: "Sprint Planning — Mon June 23, 9:00 AM PT"
  const namedEmbed = NAMED_DATE_EMBEDDED_RE.exec(line);
  if (namedEmbed) {
    return parseMonthDay(namedEmbed[1]);
  }

  // Month + day only embedded: "Review — June 20, 9:00 AM PT"
  const monthDayEmbed = MONTH_DAY_EMBEDDED_RE.exec(line);
  if (monthDayEmbed) {
    const [, month, day, year] = monthDayEmbed;
    return parseMonthDay(`${month} ${day}${year ? `, ${year}` : ""}`);
  }

  return null;
}

// ── Time parsing ──────────────────────────────────────────────────────────

// Matches a known timezone abbreviation token
const TZ_ABBR_RE = new RegExp(
  `\\b(${ALL_TZ_ABBRS})\\b`,
  "i"
);


// 24-hour: 16:00 or 9:30
const TIME_24H_RE = /\b(\d{1,2}):(\d{2})\b(?!\s*(?:AM|PM))/i;

// 12-hour: 9:00 AM or 5:00 PM
const TIME_12H_RE = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i;

// Bare-hour 12h: "8pm", "7 PM", "9am", "11 p.m.", "4 PM"
// Optionally followed by a tz token
const BARE_HOUR_RE = /\b(\d{1,2})\s*([ap]\.?m\.?)\b/i;

// Word times: "noon" or "midnight"
const WORD_TIME_RE = /\b(noon|midnight)\b/i;

// Time range with en-dash or hyphen
// Handles: 9:00–9:45 AM PT, 9:00-9:45 AM PT, 9:00 AM–10:00 AM PT
const TIME_RANGE_RE =
  /\b(\d{1,2}:\d{2})(?:\s*(AM|PM))?\s*[–\-]\s*(\d{1,2}:\d{2})\s*(AM|PM)?\s*(UTC|GMT|PDT|PST|PT|EDT|EST|ET|CDT|CST|CT|MDT|MST|MT|BST|CEST|CET|IST|JST|SGT|HKT|KST|AEDT|AEST|NZST|NZDT|UK)\b/i;

// H1: Bare-hour range: "9-10am", "9-10am PT", "9 - 10am ET"
// Both numbers are bare hours; AM/PM applies to both from the end token
const BARE_HOUR_RANGE_RE =
  /\b(\d{1,2})\s*[–\-]\s*(\d{1,2})\s*([ap]\.?m\.?)\b(?:\s*(UTC|GMT|PDT|PST|PT|EDT|EST|ET|CDT|CST|CT|MDT|MST|MT|BST|CEST|CET|IST|JST|SGT|HKT|KST|AEDT|AEST|NZST|NZDT|UK))?/i;

interface TimeToken {
  hour: number;
  minute: number;
  ampm?: "AM" | "PM";
}

function parseHM(str: string): { hour: number; minute: number } {
  const [h, m] = str.split(":").map(Number);
  return { hour: h, minute: m };
}

function applyAmPm(t: TimeToken): number {
  let h = t.hour;
  const ap = t.ampm?.toUpperCase();
  if (ap === "AM") {
    if (h === 12) h = 0;
  } else if (ap === "PM") {
    if (h !== 12) h += 12;
  }
  return h;
}

interface TimeParseResult {
  startHour: number;
  startMinute: number;
  endHour: number | null;
  endMinute: number | null;
  tzAbbr: string;
  sourceDisplay: string;
  unknownTzToken?: string; // if the tz token in the line wasn't recognized
}

/** Validate hour and minute are in range. Returns true if valid. */
function isValidHourMinute(hour: number, minute: number, is12h: boolean): boolean {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return false;
  if (minute < 0 || minute > 59) return false;
  if (is12h) {
    // 12-hour: hour must be 1–12
    return hour >= 1 && hour <= 12;
  } else {
    // 24-hour: hour must be 0–23
    return hour >= 0 && hour <= 23;
  }
}

/**
 * Detect if a line clearly intends a time but is malformed.
 * Returns true if the line contains a number that looks like it's trying to be a time
 * (e.g. "26:00 UTC", "99:99 PDT", "Session 4 — 99:99").
 * Does NOT flag plain text lines with no numeric time intent.
 */
function lineHasmalformedTimeIntent(line: string): boolean {
  // Must have a colon-separated number that looks like an attempted time HH:MM
  // and optionally a tz abbr or AM/PM — indicating time intent
  // Pattern: digits:digits where either the hour or minute is out of range
  const attemptedTime = /\b(\d{1,3}):(\d{1,3})\b/;
  const m = attemptedTime.exec(line);
  if (!m) return false;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  // If they're both in normal 24h range it would have been parsed; reaching here means
  // the match exists but was rejected by the parser — treat as malformed
  return h > 23 || min > 59;
}

function tryParseTime(
  line: string,
  defaultTzAbbr: string
): TimeParseResult | null {
  // Try range first
  const rangeMatch = TIME_RANGE_RE.exec(line);
  if (rangeMatch) {
    const startStr = rangeMatch[1];
    const startAp = rangeMatch[2]?.toUpperCase() as "AM" | "PM" | undefined;
    const endStr = rangeMatch[3];
    const endAp = rangeMatch[4]?.toUpperCase() as "AM" | "PM" | undefined;
    const tzAbbr = rangeMatch[5].toUpperCase();

    const start = parseHM(startStr);
    const end = parseHM(endStr);

    const is12h = !!(startAp ?? endAp);
    // Validate ranges — out-of-range hours/minutes return null (flagged as unparsed)
    if (!isValidHourMinute(start.hour, start.minute, is12h)) return null;
    if (!isValidHourMinute(end.hour, end.minute, is12h)) return null;

    // The trailing AM/PM after the end time applies to both if not individually specified
    // e.g., "9:00–9:45 AM PT" → both 9:00 AM and 9:45 AM
    const effectiveEndAp = endAp ?? startAp;
    const effectiveStartAp = startAp ?? endAp; // if start has no AM/PM, inherit from end

    const startToken: TimeToken = {
      hour: start.hour,
      minute: start.minute,
      ampm: effectiveStartAp,
    };
    const endToken: TimeToken = {
      hour: end.hour,
      minute: end.minute,
      ampm: effectiveEndAp,
    };

    const sh = applyAmPm(startToken);
    const eh = applyAmPm(endToken);

    // Build source display
    const startDisp = startAp
      ? `${startStr} ${startAp}`
      : effectiveStartAp
        ? `${startStr} ${effectiveStartAp}`
        : startStr;
    const endDisp = endAp
      ? `${endStr} ${endAp}`
      : effectiveEndAp
        ? `${endStr} ${effectiveEndAp}`
        : endStr;
    const sourceDisplay = `${startDisp}–${endDisp} ${tzAbbr}`;

    // Check if tz is recognized
    const unknownTzToken = ianaFromAbbr(tzAbbr) ? undefined : tzAbbr;

    return {
      startHour: sh,
      startMinute: start.minute,
      endHour: eh,
      endMinute: end.minute,
      tzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  // H1: Try bare-hour range (e.g. "9-10am", "9-10am PT", "9 - 10 AM ET")
  // Must be tried before BARE_HOUR_RE so "9-10am" isn't consumed as just "10am"
  const bareRangeMatch = BARE_HOUR_RANGE_RE.exec(line);
  if (bareRangeMatch) {
    const startHourRaw = parseInt(bareRangeMatch[1], 10);
    const endHourRaw = parseInt(bareRangeMatch[2], 10);
    const rawAmPm = bareRangeMatch[3].toLowerCase().replace(/\./g, "");
    const ampm: "AM" | "PM" = rawAmPm.startsWith("p") ? "PM" : "AM";
    // Both bare hours must be valid 12h hours
    if (!isValidHourMinute(startHourRaw, 0, true)) return null;
    if (!isValidHourMinute(endHourRaw, 0, true)) return null;
    const tzRawToken = bareRangeMatch[4]?.toUpperCase();
    const tzMatch = tzRawToken ? tzRawToken : null;
    const tzAbbr = (tzMatch ?? defaultTzAbbr).toUpperCase();
    const unknownTzToken = tzMatch && !ianaFromAbbr(tzMatch) ? tzMatch : undefined;
    const sh = applyAmPm({ hour: startHourRaw, minute: 0, ampm });
    const eh = applyAmPm({ hour: endHourRaw, minute: 0, ampm });
    const startDisp = `${startHourRaw}:00 ${ampm}`;
    const endDisp = `${endHourRaw}:00 ${ampm}`;
    const sourceDisplay = `${startDisp}–${endDisp} ${tzAbbr}`;
    return {
      startHour: sh,
      startMinute: 0,
      endHour: eh,
      endMinute: 0,
      tzAbbr: tzMatch ?? defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  // Try 12-hour single time
  const h12Match = TIME_12H_RE.exec(line);
  if (h12Match) {
    const { hour, minute } = parseHM(`${h12Match[1]}:${h12Match[2]}`);
    // Validate: 12-hour hour must be 1–12
    if (!isValidHourMinute(hour, minute, true)) return null;
    const ampm = h12Match[3].toUpperCase() as "AM" | "PM";
    // TOKEN-COLLISION FIX: only look for tz token ADJACENT to the time match
    const adjacentTz = extractAdjacentTzToken(line, h12Match[0], h12Match.index);
    const rawTzToken = adjacentTz ? undefined : extractRawTzToken(line, h12Match[0]);
    const tzAbbr = (adjacentTz ? adjacentTz.abbr : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !adjacentTz && rawTzToken ? rawTzToken : undefined;
    const sh = applyAmPm({ hour, minute, ampm });
    const sourceDisplay = `${h12Match[1]}:${h12Match[2]} ${ampm} ${tzAbbr}`;
    return {
      startHour: sh,
      startMinute: minute,
      endHour: null,
      endMinute: null,
      tzAbbr: adjacentTz ? tzAbbr : defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  // Try bare-hour 12h: "8pm", "7 PM", "9am", "11 p.m.", "4 PM ET"
  const bareMatch = BARE_HOUR_RE.exec(line);
  if (bareMatch) {
    const hour = parseInt(bareMatch[1], 10);
    if (!isValidHourMinute(hour, 0, true)) return null;
    const rawAmPm = bareMatch[2].toLowerCase().replace(/\./g, "");
    const ampm: "AM" | "PM" = rawAmPm.startsWith("p") ? "PM" : "AM";
    // TOKEN-COLLISION FIX: only look for tz token ADJACENT to the time match
    const adjacentTz = extractAdjacentTzToken(line, bareMatch[0], bareMatch.index);
    const rawTzToken = adjacentTz ? undefined : extractRawTzToken(line, bareMatch[0]);
    const tzAbbr = (adjacentTz ? adjacentTz.abbr : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !adjacentTz && rawTzToken ? rawTzToken : undefined;
    const sh = applyAmPm({ hour, minute: 0, ampm });
    const sourceDisplay = `${hour}:00 ${ampm} ${adjacentTz ? tzAbbr : defaultTzAbbr}`;
    return {
      startHour: sh,
      startMinute: 0,
      endHour: null,
      endMinute: null,
      tzAbbr: adjacentTz ? tzAbbr : defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  // Try word times: "noon" or "midnight"
  const wordMatch = WORD_TIME_RE.exec(line);
  if (wordMatch) {
    const word = wordMatch[1].toLowerCase();
    const hour = word === "noon" ? 12 : 0;
    // TOKEN-COLLISION FIX: only look for tz token ADJACENT to the time match
    const adjacentTz = extractAdjacentTzToken(line, wordMatch[0], wordMatch.index);
    const rawTzToken = adjacentTz ? undefined : extractRawTzToken(line, wordMatch[0]);
    const tzAbbr = (adjacentTz ? adjacentTz.abbr : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !adjacentTz && rawTzToken ? rawTzToken : undefined;
    const sourceDisplay = `${word} ${adjacentTz ? tzAbbr : defaultTzAbbr}`;
    return {
      startHour: hour,
      startMinute: 0,
      endHour: null,
      endMinute: null,
      tzAbbr: adjacentTz ? tzAbbr : defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  // Try 24-hour single time (ensure no AM/PM follows)
  const h24Match = TIME_24H_RE.exec(line);
  if (h24Match) {
    const hour = parseInt(h24Match[1], 10);
    const minute = parseInt(h24Match[2], 10);
    // Validate: 24-hour hour must be 0–23, minute 0–59
    if (!isValidHourMinute(hour, minute, false)) return null;
    // TOKEN-COLLISION FIX: only look for tz token ADJACENT to the time match
    const adjacentTz = extractAdjacentTzToken(line, h24Match[0], h24Match.index);
    const rawTzToken = adjacentTz ? undefined : extractRawTzToken(line, h24Match[0]);
    const tzAbbr = (adjacentTz ? adjacentTz.abbr : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !adjacentTz && rawTzToken ? rawTzToken : undefined;
    const sourceDisplay = `${h24Match[1]}:${h24Match[2]} ${adjacentTz ? tzAbbr : defaultTzAbbr}`;
    return {
      startHour: hour,
      startMinute: minute,
      endHour: null,
      endMinute: null,
      tzAbbr: adjacentTz ? tzAbbr : defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  return null;
}

/**
 * TOKEN-COLLISION FIX: Extract a tz token that is ADJACENT TO (immediately after) a time match.
 * This ensures "PT" in "PT Roadmap — 2:00 PM" is NOT counted as the tz token for the time,
 * while "PT" in "2:00 PM PT" IS counted.
 *
 * Returns { abbr, iana } if a recognized tz token immediately follows the time match, else null.
 * "Immediately follows" = the first non-whitespace word after the matched time string.
 */
function extractAdjacentTzToken(
  line: string,
  timeMatchStr: string,
  timeMatchIndex: number
): { abbr: string; iana: string } | null {
  const afterIdx = timeMatchIndex + timeMatchStr.length;
  const after = line.slice(afterIdx);
  // The adjacent tz must be the very next word (possibly after whitespace)
  const m = /^\s*([A-Za-z]{2,6})\b/.exec(after);
  if (!m) return null;
  const token = m[1].toUpperCase();
  const iana = ianaFromAbbr(token);
  if (!iana) return null;
  return { abbr: token, iana };
}

/**
 * After matching a time token in a line, look for a trailing ALL-CAPS token
 * that might be an unrecognized timezone (e.g. "XYZ" in "9:00 AM XYZ").
 * Returns the token if found and not recognized, null otherwise.
 */
function extractRawTzToken(line: string, matchedTimeStr: string): string | null {
  // Look at what comes after the time match
  const idx = line.indexOf(matchedTimeStr);
  if (idx < 0) return null;
  const after = line.slice(idx + matchedTimeStr.length).trim();
  // TRUST FIX #1: Only flag tokens that are ALL-UPPERCASE in the source text.
  // Real timezone abbreviations (PT, EST, CET, etc.) are always all-caps.
  // Title-cased words like "Early", "Birds", "Session" are not tz tokens — never warn on them.
  // The regex now requires all-uppercase (no lowercase letters) in the 2-5 char token.
  const m = /^([A-Z]{2,5})\b/.exec(after);
  if (!m) return null;
  const token = m[1]; // Already all-uppercase (regex requires it)
  // Only flag if it's NOT a recognized tz abbr
  if (ianaFromAbbr(token)) return null;
  // Don't flag common English abbreviations that happen to be all-caps
  const COMMON_WORDS = new Set(["AM", "PM", "THE", "AND", "FOR", "WITH", "OPEN", "CALL", "TALK"]);
  if (COMMON_WORDS.has(token)) return null;
  return token;
}

// (RECOGNIZED_TZ_ABBRS_SET is derived from ALL_TZ_ABBRS for the TRAILING_TZ_RE / LEADING_TZ_RE)
// Regex that matches only recognized TZ abbreviations at end of string (for title cleanup)
const TRAILING_TZ_RE = new RegExp(
  `\\s+(${ALL_TZ_ABBRS})\\s*$`,
  "i"
);
// Regex that matches only recognized TZ abbreviations at START of string followed by whitespace/separator
// Used to strip "PT" from "PT — Keynote" when the time was at the beginning of the line
const LEADING_TZ_RE = new RegExp(
  `^(${ALL_TZ_ABBRS})\\s*([–—\\-@:,\\s]|$)`,
  "i"
);

/**
 * Extract session title from a line after stripping the time tokens and inline dates.
 *
 * TOKEN-COLLISION FIX: A tz abbreviation token (PT, ET, AM, CET, etc.) is ONLY stripped
 * when it is adjacent to/immediately following a parsed time token — never when it appears
 * as a standalone word in the title position.
 *
 * Examples:
 *   "PT Roadmap — Q3 — 2:00 PM PT" → "PT Roadmap — Q3" (first PT is title, trailing PT+time are stripped)
 *   "AM Keynote — 9:00 AM PT"       → "AM Keynote"      (AM in title kept; only the time AM+PT stripped)
 *   "ET Office Hours — 14:00 ET"    → "ET Office Hours" (leading ET is title word, not tz)
 *   "10:00 AM PT Opening Keynote"   → "Opening Keynote" (PT consumed adjacent to time, stripped)
 *
 * Strategy: strip time tokens first (which include their adjacent tz when part of the time regex),
 * then only strip a TRAILING tz token (one at the very end of the remaining string) — never
 * replace all occurrences of tz tokens globally.
 *
 * ADJACENT-TZ STRIP (DEFECT #2 FIX): When a time token is removed, also strip any immediately-
 * following recognized tz token that was consumed as the inline source tz. This prevents
 * "10:00 AM PT Opening Keynote" → "PT Opening Keynote" (the glued tz-on-title bug).
 * But "PT Roadmap — 2:00 PM PT" must NOT strip the leading PT — only the adjacent one.
 */

// Regex that strips a time token PLUS its immediately adjacent tz (time + optional whitespace + tz abbr)
// Used for 12h, bare-hour, and 24h single-time cases to strip the consumed tz in one pass.
const TIME_12H_WITH_ADJACENT_TZ_RE = new RegExp(
  `\\b\\d{1,2}:\\d{2}\\s*(?:AM|PM)\\s+(${ALL_TZ_ABBRS})\\b`,
  "i"
);
const BARE_HOUR_WITH_ADJACENT_TZ_RE = new RegExp(
  `\\b\\d{1,2}\\s*(?:[ap]\\.?m\\.?)\\s+(${ALL_TZ_ABBRS})\\b`,
  "i"
);
const TIME_24H_WITH_ADJACENT_TZ_RE = new RegExp(
  `\\b\\d{1,2}:\\d{2}\\s+(${ALL_TZ_ABBRS})\\b(?!\\s*(?:AM|PM))`,
  "i"
);
const WORD_TIME_WITH_ADJACENT_TZ_RE = new RegExp(
  `\\b(?:noon|midnight)\\s+(${ALL_TZ_ABBRS})\\b`,
  "i"
);

function extractTitle(line: string): string {
  // The TIME_RANGE_RE and BARE_HOUR_RANGE_RE already include the trailing tz in their capture,
  // so removing those removes the tz too.
  // Remove bare-hour range first (H1: must be before BARE_HOUR_RE to avoid partial match)
  let cleaned = line.replace(BARE_HOUR_RANGE_RE, "");
  // Remove time range expression (includes trailing tz token in the regex)
  cleaned = cleaned.replace(TIME_RANGE_RE, "");
  // Remove 12h time + adjacent tz (e.g. "10:00 AM PT") in one pass to avoid tz gluing onto title
  // Must be before TIME_12H_RE to catch the tz too.
  cleaned = cleaned.replace(TIME_12H_WITH_ADJACENT_TZ_RE, "");
  // Remove any remaining 12h time without adjacent tz
  cleaned = cleaned.replace(TIME_12H_RE, "");
  // Remove bare-hour time + adjacent tz (e.g. "8pm PT") in one pass
  cleaned = cleaned.replace(BARE_HOUR_WITH_ADJACENT_TZ_RE, "");
  // Remove bare-hour time (e.g. "8pm", "7 PM") — only the time token itself
  cleaned = cleaned.replace(BARE_HOUR_RE, "");
  // Remove word times + adjacent tz (e.g. "noon PT")
  cleaned = cleaned.replace(WORD_TIME_WITH_ADJACENT_TZ_RE, "");
  // Remove word times (noon, midnight)
  cleaned = cleaned.replace(WORD_TIME_RE, "");
  // Remove 24h time + adjacent tz (e.g. "16:00 PT")
  cleaned = cleaned.replace(TIME_24H_WITH_ADJACENT_TZ_RE, "");
  // Remove 24h time
  cleaned = cleaned.replace(TIME_24H_RE, "");
  // TOKEN-COLLISION FIX: Do NOT do a global replace of TZ_ABBR_RE here.
  // Strip tz tokens ONLY at the leading or trailing boundary of the string after time removal.
  // This preserves "PT" in "PT Roadmap", "AM" in "AM Keynote", "ET" in "ET Office Hours"
  // when those words appear in the middle of a title phrase.
  //
  // Cases handled:
  // - "PT — Keynote" (after removing "9:00 AM"): leading PT → strip → "— Keynote" → "Keynote"
  // - "Kickoff SGT" (after removing "9:00"): trailing SGT → strip → "Kickoff"
  // - "PT Roadmap — Q3" (after removing "2:00 PM PT"): no leading/trailing tz → preserved
  //
  // Strip out-of-scope trailing dual-tz remainder: "/ HH:MM ABBR", "/ HH ABBR", or "/ ABBR" patterns
  // Also handles case where tz was already stripped by adjacent-tz removal above ("/ 17:00" without tz,
  // or "/ BST" where the time was already removed). Use a more general pattern: slash + optional time + optional tz.
  cleaned = cleaned.replace(/\s*\/\s*(?:\d{1,2}(?::\d{2})?\s*)?[A-Z]{2,5}\b.*$/i, "");
  // Also strip bare "/ " remnant if no tz/time followed (e.g. "/" with whitespace on both sides)
  cleaned = cleaned.replace(/\s*\/\s*$/, "");
  // Remove ONLY trailing tz abbreviation — but only when the remaining cleaned string
  // would still have non-tz content (i.e., not stripping the entire remaining text).
  // This handles "Kickoff 9:00 SGT" → time removed → "Kickoff SGT" → strip trailing "SGT".
  const withoutTrailingTz = cleaned.replace(TRAILING_TZ_RE, "");
  // Only apply if we didn't strip the entire remaining content
  if (withoutTrailingTz.trim()) {
    cleaned = withoutTrailingTz;
  }
  // Remove ONLY leading tz abbreviation — but only when the tz is followed by a separator,
  // meaning it was stranded after a time-at-start-of-line was removed.
  // "PT — Keynote" → leading PT followed by separator → strip → "— Keynote"
  // "PT Roadmap" → PT followed by a word (no separator) → DO NOT strip (it's a title word)
  const leadingMatch = LEADING_TZ_RE.exec(cleaned.trim());
  if (leadingMatch) {
    const afterMatch = cleaned.trim().slice(leadingMatch[0].length - (leadingMatch[2]?.length ?? 0));
    // The second capture group is the separator — if it's whitespace or separator, strip
    if (leadingMatch[2] && /^[–—\-@:,\s]/.test(leadingMatch[2])) {
      // Only strip if what remains is non-empty and starts with a separator (not a title word)
      const remainder = cleaned.trim().slice(leadingMatch[1].length).trim();
      if (remainder && /^[–—\-@:,]/.test(remainder)) {
        cleaned = remainder;
      }
    }
    void afterMatch; // suppress unused warning
  }
  // Strip inline ISO date (e.g. "2026-06-22" anywhere in line)
  cleaned = cleaned.replace(ISO_DATE_EMBEDDED_RE, "");
  // Strip inline weekday+month+day (e.g. "Mon June 23," or "Tuesday, June 16")
  cleaned = cleaned.replace(NAMED_DATE_EMBEDDED_RE, "");
  // Strip inline month+day (e.g. "June 20")
  cleaned = cleaned.replace(MONTH_DAY_EMBEDDED_RE, "");
  // Remove leading/trailing separators (em-dash, en-dash, hyphen, @, trailing colon, comma)
  // Trailing colon appears when line is "Title: 9:00 AM PT" — strip the trailing ":" after time removal
  // But do NOT strip internal colons (e.g. "Workshop: Building with AI")
  // Apply iteratively until stable to handle multi-layer removal (e.g. "Sprint Planning — ," → "Sprint Planning")
  let prev = "";
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned.replace(/^\s*[–—\-@:,]+\s*/, "").replace(/\s*[–—\-@:,]+\s*$/, "");
    cleaned = cleaned.trim();
  }
  // TOKEN-COLLISION FIX: Do NOT replace interior dashes globally — they may be part of the title.
  // "PT Roadmap — Q3" should keep the em-dash; "Session 3" from "Session 3 — 16:00 UTC" is
  // already correct because the "—" was between title and time which was already removed.
  // Only normalize multiple consecutive whitespace into a single space.
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  return cleaned || "Untitled session";
}

// ── Stated-once timezone header detection ────────────────────────────────────
//
// Detects lines like "All times PT", "all times in ET", "times are CET", "Times: PST"
// Also matches embedded/parenthetical forms:
//   "(all times PT)", "(times in PT)", "Times: PT", "Summit 2026 — All times PT"
//   "All session times are in PT", "times are in Pacific", "... PT" on intro line
// These lines are consumed as configuration (they set the source tz)
// and are NOT rendered as sessions or notes.
//
// Precedence (data-integrity, non-negotiable):
//   1. Explicit inline per-session tz (e.g. "2pm PT") — authoritative for THAT session
//   2. Stated-once header line (e.g. "All times PT") — fallback for sessions lacking inline tz
//   3. Manual source-tz selector — fallback of last resort
//   Inference NEVER overrides an explicit inline value.

// Strict standalone form: the WHOLE line is a tz declaration
const STATED_ONCE_STANDALONE_RE = new RegExp(
  `^(?:all\\s+times?\\s*(?:in\\s+|are\\s+(?:in\\s+)?|:\\s*)?|times?\\s*(?:are\\s+(?:in\\s+)?|in\\s+|:\\s*)?|all\\s+session\\s+times?\\s*(?:in\\s+|are\\s+(?:in\\s+)?|:\\s*)?)(${ALL_TZ_ABBRS}|Pacific|Eastern|Central|Mountain)\\s*$`,
  "i"
);

// Timezone word map: "Pacific" → "PT", etc.
const TZ_WORD_MAP: Record<string, string> = {
  PACIFIC: "PT",
  EASTERN: "ET",
  CENTRAL: "CT",
  MOUNTAIN: "MT",
};

// Embedded declaration: the tz phrase appears INSIDE a line (parenthetical or suffix)
// Conservative: must have the "times" trigger word adjacent to the tz token.
// Forms matched:
//   (all times PT), (all times in PT), (times in PT), (times: PT)
//   "... all times PT", "... all times in PT", "... times are PT"
// We do NOT match bare "Pacific Ocean" or "PT Roadmap" — requires "time" trigger.
const STATED_ONCE_EMBEDDED_RE = new RegExp(
  `(?:^|[\\s(,;—–-])(?:all\\s+)?(?:session\\s+)?times?\\s*(?:are\\s+(?:in\\s+)?|in\\s+|listed\\s+in\\s+|:\\s*)?[(]?\\s*(${ALL_TZ_ABBRS}|Pacific|Eastern|Central|Mountain)\\s*[)]?(?=[\\s,;)—–.!?]|$)`,
  "i"
);

/**
 * Try to detect a stated-once timezone header line.
 * Returns the timezone abbreviation (uppercased) if this line is a stated-once header, else null.
 * Stated-once headers are consumed and NOT rendered as rows.
 *
 * Matches:
 *   - Standalone: entire line is a tz declaration ("All times PT")
 *   - Embedded: declaration phrase appears inside a line
 *     ("Summit 2026 — All times PT", "(all times PT)", "Times: PT")
 */
export function tryParseStatedOnceTz(line: string): string | null {
  const trimmed = line.trim();

  // Try strict standalone first
  const m = STATED_ONCE_STANDALONE_RE.exec(trimmed);
  if (m) {
    const token = m[1].toUpperCase();
    return TZ_WORD_MAP[token] ?? token;
  }

  // Try embedded form — but only if the line has NO time token
  // (avoids mis-detecting "Opening Keynote 9:00 AM PT" as a stated-once header)
  const hasTimeToken = /\b\d{1,2}:\d{2}\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(trimmed);
  if (!hasTimeToken) {
    const em = STATED_ONCE_EMBEDDED_RE.exec(trimmed);
    if (em) {
      const token = em[1].toUpperCase();
      return TZ_WORD_MAP[token] ?? token;
    }
  }

  return null;
}

/**
 * Auto-detect source timezone from the raw agenda text.
 * Scans for a stated-once header (e.g. "All times PT") OR the first inline tz suffix
 * on a time-bearing line (e.g. "2pm PT").
 * Returns { abbr, origin, ianaZone } if detected, else null.
 * PRECEDENCE: stated-once header > first inline per-session tz > null.
 */
export function detectSourceTz(text: string): {
  abbr: string;
  origin: string; // the raw origin string found in the text
  originType: "stated-once" | "inline";
  ianaZone: string;
} | null {
  const lines = text.split("\n");
  let firstInline: { abbr: string; origin: string; ianaZone: string } | null = null;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Check for stated-once header first
    const statedAbbr = tryParseStatedOnceTz(trimmed);
    if (statedAbbr) {
      const iana = ianaFromAbbr(statedAbbr);
      if (iana) {
        return { abbr: statedAbbr, origin: trimmed, originType: "stated-once", ianaZone: iana };
      }
    }

    // Check for inline tz on a time-bearing line
    if (firstInline === null) {
      const tzMatch = TZ_ABBR_RE.exec(trimmed);
      if (tzMatch) {
        // Only count as inline if the tz token is adjacent to a time token
        // (i.e., the line successfully parses a time AND contains a tz abbr right after it)
        const dummyParse = tryParseTime(trimmed, "UTC"); // use UTC as placeholder default
        if (dummyParse && dummyParse.tzAbbr && dummyParse.tzAbbr !== "UTC") {
          const abbr = dummyParse.tzAbbr.toUpperCase();
          const iana = ianaFromAbbr(abbr);
          if (iana) {
            firstInline = { abbr, origin: trimmed, ianaZone: iana };
          }
        }
      }
    }
  }

  if (firstInline) {
    return { ...firstInline, originType: "inline" };
  }
  return null;
}

// ── Main parse function ───────────────────────────────────────────────────

export interface ParseOptions {
  sourceTimezone: string; // IANA zone e.g. "UTC"
  referenceDate?: Date; // for testing; defaults to "today"
  /**
   * If provided, sessions with no inline tz will use this abbr
   * (from the stated-once header). This overrides the sourceTimezone
   * for those sessions specifically.
   * Value is the IANA zone string derived from the stated-once abbr.
   */
  statedOnceIana?: string;
  /**
   * When the user has actively changed the "Override source timezone" selector,
   * this IANA zone takes precedence over statedOnceIana (and sourceTimezone) for
   * sessions that have no inline tz token. Inline per-session tz is always authoritative
   * and cannot be overridden by this.
   *
   * Precedence (from most to least authoritative):
   *   1. Inline per-session tz token
   *   2. manualOverrideIana  ← user explicitly changed the selector
   *   3. statedOnceIana      ← stated-once header ("All times PT")
   *   4. sourceTimezone      ← fallback selector value
   */
  manualOverrideIana?: string;
  /**
   * The abbreviation that corresponds to manualOverrideIana, for display in sourceTime.
   */
  manualOverrideAbbr?: string;
}

/**
 * A note row that carries a "no time — not exported" hint for display in the creator view.
 * Extended from NoteLine so it's visible in the row but excluded from .ics.
 */
export interface NoteLineWithHint extends NoteLine {
  noTimeHint: true;
}

export function parseAgenda(text: string, options: ParseOptions): AgendaRow[] {
  const lines = text.split("\n");
  // We accumulate "session rows" separately so we can sort them chronologically,
  // while keeping all rows (dateheader, note, unparsed) in their original positions
  // for line-accounting purposes.
  // Strategy: collect all rows in input order, then stable-sort the sessions.

  const rows: AgendaRow[] = [];

  let currentDateStr: string | null = null; // YYYY-MM-DD

  const today = options.referenceDate ?? new Date();
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();

  // Find the source timezone abbreviation from the IANA zone
  const sourceIana = options.sourceTimezone;
  // statedOnceIana: when a stated-once header is in the text, sessions with no inline tz
  // use this zone (higher priority than sourceIana for those sessions).
  const statedOnceIana = options.statedOnceIana ?? null;
  // manualOverrideIana: when the user actively changed the selector, wins over statedOnceIana.
  const manualOverrideIana = options.manualOverrideIana ?? null;
  const manualOverrideAbbr = options.manualOverrideAbbr ?? null;

  // Default abbr: find first key that maps to the sourceIana, or use UTC
  const defaultAbbr =
    Object.entries(TZ_ABBR_TO_IANA).find(
      ([, v]) => v === sourceIana
    )?.[0] ?? "UTC";

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip blank lines
    if (!trimmed) continue;

    // Check for stated-once tz header (e.g. "All times PT") — consume as config, not a row
    if (tryParseStatedOnceTz(trimmed)) {
      // These lines are NOT rendered as rows — they're pure configuration signals.
      // The detection result is surfaced in the UI via detectSourceTz().
      continue;
    }

    // Check for date header
    const dateHeaderDate = tryParseDateHeader(trimmed);
    if (dateHeaderDate) {
      currentDateStr = dateHeaderDate;
      rows.push({ type: "dateheader", rawLine: trimmed, date: dateHeaderDate });
      continue;
    }

    // Try to parse a time from the line
    const timeParse = tryParseTime(trimmed, defaultAbbr);

    if (!timeParse) {
      // Distinguish: does this line INTEND a time (malformed) or is it just a note/header?
      if (lineHasmalformedTimeIntent(trimmed)) {
        rows.push({
          type: "unparsed",
          rawLine: trimmed,
          hint: "Couldn't read a time — try `16:00 UTC` or `4 PM ET`",
        });
      } else {
        // Timeless line — but check if it contains an embedded date (a date header with context,
        // like "Global Webinar Series — 2026-07-15"). If so, extract the date and use it.
        const embeddedDate = tryExtractInlineDate(trimmed);
        if (embeddedDate) {
          // Treat as a date header line (updates currentDateStr for following sessions)
          currentDateStr = embeddedDate;
          rows.push({ type: "dateheader", rawLine: trimmed, date: embeddedDate });
        } else {
          // Pure timeless note/header — add "no time — not exported" hint
          rows.push({ type: "note", rawLine: trimmed, noTimeHint: true } as NoteLineWithHint);
        }
      }
      continue;
    }

    // Resolve date: priority = inline date on this line > currentDateStr > today (with hasNoDate flag)
    const inlineDateStr = tryExtractInlineDate(trimmed);
    const resolvedDateStr = inlineDateStr ?? currentDateStr ?? null;
    const hasNoDate = !resolvedDateStr;

    let year = todayYear;
    let month = todayMonth;
    let day = todayDay;

    if (resolvedDateStr) {
      const parts = resolvedDateStr.split("-").map(Number);
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }

    // PRECEDENCE for timezone resolution:
    // 1. Inline tz token on THIS line (most authoritative — explicit per-session)
    // 2. manualOverrideIana — user explicitly changed the selector (beats stated-once)
    // 3. Stated-once header tz (statedOnceIana) — only when no inline tz and no manual override
    // 4. Source tz selector (sourceIana) — fallback of last resort
    //
    // An "inline tz" means the parser found a tz token from the TZ_ABBR_RE match.
    // We detect whether the timeParse's tzAbbr came from the line itself vs the defaultAbbr
    // by comparing: if tzAbbr === defaultAbbr AND the line doesn't actually contain that abbr
    // verbatim, it used the fallback.
    const lineContainsExplicitTz = hasExplicitTzToken(trimmed, timeParse.tzAbbr, defaultAbbr);
    let resolvedIana: string;
    let resolvedAbbr: string; // abbreviation for display in sourceTime
    if (lineContainsExplicitTz) {
      // Explicit inline tz — authoritative for this session
      resolvedIana = ianaFromAbbr(timeParse.tzAbbr) ?? sourceIana;
      resolvedAbbr = timeParse.tzAbbr; // already in the sourceDisplay from tryParseTime
    } else if (manualOverrideIana) {
      // User manually changed the override selector — wins over stated-once
      resolvedIana = manualOverrideIana;
      resolvedAbbr = manualOverrideAbbr ?? (Object.entries(TZ_ABBR_TO_IANA).find(([, v]) => v === manualOverrideIana)?.[0] ?? "");
    } else if (statedOnceIana) {
      // No inline tz — use stated-once header tz
      resolvedIana = statedOnceIana;
      resolvedAbbr = Object.entries(TZ_ABBR_TO_IANA).find(([, v]) => v === statedOnceIana)?.[0] ?? "";
    } else {
      // Fallback to source tz selector
      resolvedIana = ianaFromAbbr(timeParse.tzAbbr) ?? sourceIana;
      resolvedAbbr = timeParse.tzAbbr; // already in sourceDisplay
    }

    // Convert wall time to UTC
    const startUtc = wallToUtc(
      year,
      month,
      day,
      timeParse.startHour,
      timeParse.startMinute,
      resolvedIana
    );

    let endUtc: Date | null = null;
    if (timeParse.endHour !== null && timeParse.endMinute !== null) {
      endUtc = wallToUtc(
        year,
        month,
        day,
        timeParse.endHour,
        timeParse.endMinute,
        resolvedIana
      );
    }

    // Compute date-cross badge: compare source calendar date vs localized calendar date
    // Source date is the year/month/day resolved above
    const sourceDateStr = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dateCross: ParsedSession["dateCross"] = undefined;
    // dateCross is computed per-viewer in the component via computeDateCross().

    const title = extractTitle(trimmed);

    // P1-1 FIX: For non-inline sessions, timeParse.sourceDisplay uses defaultAbbr (e.g. "UTC"),
    // but the session was actually resolved to resolvedIana/resolvedAbbr.
    // Replace the defaultAbbr in the display string with the actual applied tz abbreviation
    // so the per-card label agrees with the detection banner and the DTSTART.
    let sourceTime = timeParse.sourceDisplay;
    if (!lineContainsExplicitTz && resolvedAbbr && resolvedAbbr !== defaultAbbr) {
      // The display string ends with defaultAbbr — replace it with resolvedAbbr
      // Use a suffix replacement to avoid touching time-part numbers
      const trailingAbbrRe = new RegExp(`\\b${defaultAbbr}$`, "i");
      sourceTime = timeParse.sourceDisplay.replace(trailingAbbrRe, resolvedAbbr);
    }

    const session: ParsedSession = {
      type: "session",
      title,
      startUtc,
      endUtc,
      sourceTime,
      rawLine: trimmed,
      dateCross, // will be computed per viewer in the component
      ...(hasNoDate ? { hasNoDate: true } : {}),
      // sourceDateStr is only set when a real date was resolved (not hasNoDate)
      ...(!hasNoDate ? { sourceDateStr } : {}),
    };

    // Attach unknown tz token if present
    if (timeParse.unknownTzToken) {
      session.unknownTzToken = timeParse.unknownTzToken;
    }

    // Also store on hidden field for computeDateCross backward compat
    (session as ParsedSession & { _sourceDateStr?: string })._sourceDateStr = sourceDateStr;

    rows.push(session);
  }

  // Chronological sort: stable-sort sessions within the rows array.
  // Non-session rows keep their positions; sessions are re-ordered chronologically.
  // We extract sessions, sort them, then rebuild the array replacing session slots in order.
  return sortRowsChronologically(rows);
}

/**
 * Check whether a line contains an explicit tz token that drove the parse result,
 * vs the defaultAbbr fallback being used.
 * Returns true when the line has the tzAbbr as a word-boundary match that is
 * NOT the same as the defaultAbbr (or when tzAbbr is the defaultAbbr but the
 * line literally contains that abbreviation adjacent to a time token).
 */
function hasExplicitTzToken(line: string, tzAbbr: string, defaultAbbr: string): boolean {
  if (tzAbbr === defaultAbbr) {
    // The default abbr was used — check if the line actually contains the abbr explicitly
    // (so "9:00 AM PT" with defaultAbbr "PT" still counts as explicit)
    const re = new RegExp(`\\b${tzAbbr}\\b`, "i");
    return re.test(line);
  }
  // tzAbbr differs from defaultAbbr — it was explicitly parsed from the line
  return true;
}

/**
 * Stable-sort the rows chronologically by session startUtc.
 * Non-session rows keep their original relative order among themselves.
 * Sessions are extracted, sorted, and placed back in the slots where sessions were.
 * Preview order == .ics VEVENT order == chronological.
 */
function sortRowsChronologically(rows: AgendaRow[]): AgendaRow[] {
  // Find all session indices
  const sessionIndices: number[] = [];
  const sessions: ParsedSession[] = [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].type === "session") {
      sessionIndices.push(i);
      sessions.push(rows[i] as ParsedSession);
    }
  }

  if (sessions.length === 0) return rows;

  // Stable sort sessions by startUtc
  const sortedSessions = [...sessions].sort(
    (a, b) => a.startUtc.getTime() - b.startUtc.getTime()
  );

  // Rebuild rows: replace session slots with sorted sessions
  const result = [...rows];
  for (let i = 0; i < sessionIndices.length; i++) {
    result[sessionIndices[i]] = sortedSessions[i];
  }
  return result;
}

/**
 * Compute the date-cross badge for a session relative to a viewer's timezone.
 * Compares the session's source calendar date to the localized calendar date.
 */
export function computeDateCross(
  session: ParsedSession,
  viewerTz: string
): "+1 day" | "-1 day" | undefined {
  const sourceDateStr = (session as ParsedSession & { _sourceDateStr?: string })._sourceDateStr;
  if (!sourceDateStr) return undefined;
  const localDateStr = localDateString(session.startUtc, viewerTz);
  if (localDateStr > sourceDateStr) return "+1 day";
  if (localDateStr < sourceDateStr) return "-1 day";
  return undefined;
}

// ── Calendar helpers ───────────────────────────────────────────────────────

function toIcsDate(d: Date): string {
  // Truncate to integer seconds to avoid fractional-second DTSTAMP (RFC 5545 §3.3.5)
  const sec = new Date(Math.floor(d.getTime() / 1000) * 1000);
  return sec
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000Z", "Z");
  // format: 20260616T160000Z
}

function toGCalDate(d: Date): string {
  // Google Calendar wants YYYYMMDDTHHmmssZ
  const sec = new Date(Math.floor(d.getTime() / 1000) * 1000);
  return sec
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000Z", "Z");
}

export function buildGoogleCalendarUrl(session: ParsedSession): string {
  const endDate = session.endUtc ?? new Date(session.startUtc.getTime() + 60 * 60000);
  const dates = `${toGCalDate(session.startUtc)}/${toGCalDate(endDate)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: session.title,
    dates,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Escape special characters in ICS text properties per RFC 5545. */
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

export function buildIcsContent(session: ParsedSession): string {
  const endDate = session.endUtc ?? new Date(session.startUtc.getTime() + 60 * 60000);
  const uid = `${session.startUtc.getTime()}-${session.title.replace(/\s+/g, "-")}@agenda-localizer`;
  const now = toIcsDate(new Date());
  const description = `Source time: ${session.sourceTime} — via Agenda Localizer`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda Localizer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${toIcsDate(session.startUtc)}`,
    `DTEND:${toIcsDate(endDate)}`,
    `SUMMARY:${escapeIcsText(session.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Build a single multi-VEVENT .ics string containing every valid ParsedSession.
 * Reuses the exact same per-session UTC start/end compute (toIcsDate on startUtc/endUtc)
 * so combined times are byte-consistent with the per-session files.
 * Unparsed/note/dateheader rows are excluded — pass only ParsedSession[].
 * Returns null if sessions array is empty (caller should not download).
 */
export function buildAllSessionsIcs(sessions: ParsedSession[]): string | null {
  if (sessions.length === 0) return null;
  const now = toIcsDate(new Date());
  const vevents: string[] = [];
  for (const session of sessions) {
    const endDate = session.endUtc ?? new Date(session.startUtc.getTime() + 60 * 60000);
    // UID must be stable per session — use same derivation as buildIcsContent
    const uid = `${session.startUtc.getTime()}-${session.title.replace(/\s+/g, "-")}@agenda-localizer`;
    const description = `Source time: ${session.sourceTime} — via Agenda Localizer`;
    const vevent = [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${toIcsDate(session.startUtc)}`,
      `DTEND:${toIcsDate(endDate)}`,
      `SUMMARY:${escapeIcsText(session.title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      "END:VEVENT",
    ].join("\r\n");
    vevents.push(vevent);
  }
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agenda Localizer//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...vevents,
    "END:VCALENDAR",
  ].join("\r\n");
}

// ── URL encoding / decoding ────────────────────────────────────────────────

export interface AgendaState {
  text: string;
  sourceTimezone: string;
  /**
   * The APPLIED source timezone abbreviation (e.g. "PT", "CET").
   * Persisted into the share link so the attendee view shows the same source-tz label
   * as the creator saw — even when it was auto-detected and the selector still shows "UTC".
   * Optional for backward-compat with old share links (attendees will re-detect or use sourceTimezone).
   */
  appliedSourceTzAbbr?: string;
}

export function encodeAgendaState(state: AgendaState): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function decodeAgendaState(hash: string): AgendaState | null {
  try {
    const raw = hash.startsWith("#") ? hash.slice(1) : hash;
    // H5: Support slug.payload format — find the last "." separator.
    // The payload is always base64 (no dots); the slug may have hyphens.
    // Strategy: try the full raw string first; if it fails, strip the slug prefix.
    const lastDot = raw.lastIndexOf(".");
    if (lastDot !== -1) {
      // Try everything after the last dot as the payload
      const afterDot = raw.slice(lastDot + 1);
      try {
        const decoded2 = JSON.parse(decodeURIComponent(escape(atob(afterDot))));
        if (
          typeof decoded2.text === "string" &&
          typeof decoded2.sourceTimezone === "string"
        ) {
          return decoded2 as AgendaState;
        }
      } catch {
        // fall through to try the full raw string
      }
    }
    const decoded = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (
      typeof decoded.text === "string" &&
      typeof decoded.sourceTimezone === "string"
    ) {
      return decoded as AgendaState;
    }
    return null;
  } catch {
    return null;
  }
}
