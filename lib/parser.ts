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

const ISO_DATE_RE = /^\s*(\d{4}-\d{2}-\d{2})\s*$/;
const NAMED_DATE_RE =
  /^\s*(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+)?([A-Z][a-z]+ \d{1,2}(?:,? \d{4})?)\s*$/i;

function tryParseDateHeader(line: string): string | null {
  const isoMatch = ISO_DATE_RE.exec(line);
  if (isoMatch) return isoMatch[1];

  const namedMatch = NAMED_DATE_RE.exec(line);
  if (namedMatch) {
    const d = new Date(namedMatch[1] + ", 2026"); // default year
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    // Try with year included
    const d2 = new Date(namedMatch[1]);
    if (!isNaN(d2.getTime())) {
      const y = d2.getFullYear();
      const m = String(d2.getMonth() + 1).padStart(2, "0");
      const day = String(d2.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
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
    const tzMatch = TZ_ABBR_RE.exec(line);
    const rawTzToken = extractRawTzToken(line, h12Match[0]);
    const tzAbbr = (tzMatch ? tzMatch[1] : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !tzMatch && rawTzToken ? rawTzToken : undefined;
    const sh = applyAmPm({ hour, minute, ampm });
    const sourceDisplay = `${h12Match[1]}:${h12Match[2]} ${ampm} ${tzAbbr}`;
    return {
      startHour: sh,
      startMinute: minute,
      endHour: null,
      endMinute: null,
      tzAbbr: tzMatch ? tzAbbr : defaultTzAbbr,
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
    const tzMatch = TZ_ABBR_RE.exec(line);
    const rawTzToken = extractRawTzToken(line, bareMatch[0]);
    const tzAbbr = (tzMatch ? tzMatch[1] : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !tzMatch && rawTzToken ? rawTzToken : undefined;
    const sh = applyAmPm({ hour, minute: 0, ampm });
    const sourceDisplay = `${hour}:00 ${ampm} ${tzMatch ? tzAbbr : defaultTzAbbr}`;
    return {
      startHour: sh,
      startMinute: 0,
      endHour: null,
      endMinute: null,
      tzAbbr: tzMatch ? tzAbbr : defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  // Try word times: "noon" or "midnight"
  const wordMatch = WORD_TIME_RE.exec(line);
  if (wordMatch) {
    const word = wordMatch[1].toLowerCase();
    const hour = word === "noon" ? 12 : 0;
    const tzMatch = TZ_ABBR_RE.exec(line);
    const rawTzToken = extractRawTzToken(line, wordMatch[0]);
    const tzAbbr = (tzMatch ? tzMatch[1] : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !tzMatch && rawTzToken ? rawTzToken : undefined;
    const sourceDisplay = `${word} ${tzMatch ? tzAbbr : defaultTzAbbr}`;
    return {
      startHour: hour,
      startMinute: 0,
      endHour: null,
      endMinute: null,
      tzAbbr: tzMatch ? tzAbbr : defaultTzAbbr,
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
    const tzMatch = TZ_ABBR_RE.exec(line);
    const rawTzToken = extractRawTzToken(line, h24Match[0]);
    const tzAbbr = (tzMatch ? tzMatch[1] : defaultTzAbbr).toUpperCase();
    const unknownTzToken = !tzMatch && rawTzToken ? rawTzToken : undefined;
    const sourceDisplay = `${h24Match[1]}:${h24Match[2]} ${tzMatch ? tzAbbr : defaultTzAbbr}`;
    return {
      startHour: hour,
      startMinute: minute,
      endHour: null,
      endMinute: null,
      tzAbbr: tzMatch ? tzAbbr : defaultTzAbbr,
      sourceDisplay,
      unknownTzToken,
    };
  }

  return null;
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
  // Check for a 2-5 letter word that looks like a tz abbr at start of remainder
  const m = /^([A-Z]{2,5})\b/i.exec(after);
  if (!m) return null;
  const token = m[1].toUpperCase();
  // Only flag if it's NOT a recognized tz abbr
  if (ianaFromAbbr(token)) return null;
  // Don't flag common English words
  const COMMON_WORDS = new Set(["AM", "PM", "THE", "AND", "FOR", "WITH", "OPEN", "CALL", "TALK"]);
  if (COMMON_WORDS.has(token)) return null;
  return token;
}

// (RECOGNIZED_TZ_ABBRS_SET is derived from ALL_TZ_ABBRS for the TRAILING_TZ_RE)
// Regex that matches only recognized TZ abbreviations at end of string (for title cleanup)
const TRAILING_TZ_RE = new RegExp(
  `\\s+(${ALL_TZ_ABBRS})\\s*$`,
  "i"
);

/** Extract session title from a line after stripping the time tokens. */
function extractTitle(line: string): string {
  // Remove bare-hour range first (H1: must be before BARE_HOUR_RE to avoid partial match)
  let cleaned = line.replace(BARE_HOUR_RANGE_RE, "");
  // Remove time range expression
  cleaned = cleaned.replace(TIME_RANGE_RE, "");
  // Remove 12h time
  cleaned = cleaned.replace(TIME_12H_RE, "");
  // Remove bare-hour time (e.g. "8pm", "7 PM") — only the time token itself
  // H1 FIX: BARE_HOUR_RE previously ate the preceding word; stripping the match
  // directly removes only the matched token (e.g. "11:30am" not "SDK 11:30am")
  cleaned = cleaned.replace(BARE_HOUR_RE, "");
  // Remove word times (noon, midnight)
  cleaned = cleaned.replace(WORD_TIME_RE, "");
  // Remove 24h time
  cleaned = cleaned.replace(TIME_24H_RE, "");
  // Remove known tz abbreviation (only recognized abbrs, not arbitrary uppercase words)
  cleaned = cleaned.replace(TZ_ABBR_RE, "");
  // Strip out-of-scope trailing dual-tz remainder: "/ HH:MM ABBR" or "/ HH ABBR" patterns
  cleaned = cleaned.replace(/\s*\/\s*\d{1,2}(?::\d{2})?\s*[A-Z]{2,5}\b.*$/i, "");
  // H1 FIX: Remove ONLY recognized tz abbreviation tokens at the end, not arbitrary words.
  // Old code used /\s+[A-Z]{2,5}\s*$/ which ate trailing words like "SDK".
  // Now only strip if the trailing token is a known timezone abbreviation.
  cleaned = cleaned.replace(TRAILING_TZ_RE, "");
  // Remove leading/trailing separators (em-dash, en-dash, hyphen, @, trailing colon)
  // Trailing colon appears when line is "Title: 9:00 AM PT" — strip the trailing ":" after time removal
  // But do NOT strip internal colons (e.g. "Workshop: Building with AI")
  cleaned = cleaned.replace(/^\s*[–—\-@:]+\s*/, "").replace(/\s*[–—\-@:]+\s*$/, "");
  // Replace dash-type separators in body with a space (preserving internal colons)
  cleaned = cleaned.replace(/\s*[–—\-]+\s*/g, " ").trim();
  return cleaned || "Untitled session";
}

// ── Main parse function ───────────────────────────────────────────────────

export interface ParseOptions {
  sourceTimezone: string; // IANA zone e.g. "UTC"
  referenceDate?: Date; // for testing; defaults to "today"
}

export function parseAgenda(text: string, options: ParseOptions): AgendaRow[] {
  const lines = text.split("\n");
  const rows: AgendaRow[] = [];

  let currentDateStr: string | null = null; // YYYY-MM-DD

  const today = options.referenceDate ?? new Date();
  const todayYear = today.getUTCFullYear();
  const todayMonth = today.getUTCMonth() + 1;
  const todayDay = today.getUTCDate();

  // Find the source timezone abbreviation from the IANA zone
  const sourceIana = options.sourceTimezone;
  // Default abbr: find first key that maps to the sourceIana, or use UTC
  const defaultAbbr =
    Object.entries(TZ_ABBR_TO_IANA).find(
      ([, v]) => v === sourceIana
    )?.[0] ?? "UTC";

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Skip blank lines
    if (!trimmed) continue;

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
        // Timeless line: render as a note/header, NOT an error
        rows.push({ type: "note", rawLine: trimmed });
      }
      continue;
    }

    // Resolve date
    let year = todayYear;
    let month = todayMonth;
    let day = todayDay;

    if (currentDateStr) {
      const parts = currentDateStr.split("-").map(Number);
      year = parts[0];
      month = parts[1];
      day = parts[2];
    }

    // Resolve timezone — if unrecognized, fall back to source tz but flag it
    const resolvedIana = ianaFromAbbr(timeParse.tzAbbr) ?? sourceIana;

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

    const session: ParsedSession = {
      type: "session",
      title,
      startUtc,
      endUtc,
      sourceTime: timeParse.sourceDisplay,
      rawLine: trimmed,
      dateCross, // will be computed per viewer in the component
    };

    // Attach unknown tz token if present
    if (timeParse.unknownTzToken) {
      session.unknownTzToken = timeParse.unknownTzToken;
    }

    // Store source date for cross-day detection (as a hidden field)
    (session as ParsedSession & { _sourceDateStr?: string })._sourceDateStr = sourceDateStr;

    rows.push(session);
  }

  return rows;
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
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "")
    .replace("Z", "Z");
  // format: 20260616T160000Z
}

function toGCalDate(d: Date): string {
  // Google Calendar wants YYYYMMDDTHHmmssZ
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(".000", "");
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

export function buildIcsContent(session: ParsedSession): string {
  const endDate = session.endUtc ?? new Date(session.startUtc.getTime() + 60 * 60000);
  const uid = `${session.startUtc.getTime()}-${session.title.replace(/\s+/g, "-")}@agenda-localizer`;
  const now = toIcsDate(new Date());
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
    `SUMMARY:${session.title}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

// ── URL encoding / decoding ────────────────────────────────────────────────

export interface AgendaState {
  text: string;
  sourceTimezone: string;
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
