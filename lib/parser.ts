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
}

export interface UnparsedLine {
  type: "unparsed";
  rawLine: string;
  hint: string;
}

export interface DateHeader {
  type: "dateheader";
  rawLine: string;
  date: string; // YYYY-MM-DD
}

export type AgendaRow = ParsedSession | UnparsedLine | DateHeader;

// ── Timezone abbreviation → IANA offset map (standard offsets; PDT/EDT etc handled) ──
const TZ_ABBR_TO_IANA: Record<string, string> = {
  UTC: "UTC",
  GMT: "UTC",
  // Pacific
  PT: "America/Los_Angeles",
  PST: "America/Los_Angeles",
  PDT: "America/Los_Angeles",
  // Eastern
  ET: "America/New_York",
  EST: "America/New_York",
  EDT: "America/New_York",
  // Central
  CT: "America/Chicago",
  CST: "America/Chicago",
  CDT: "America/Chicago",
  // Mountain
  MT: "America/Denver",
  MST: "America/Denver",
  MDT: "America/Denver",
  // British Summer Time
  BST: "Europe/London",
  // Central European
  CET: "Europe/Paris",
  CEST: "Europe/Paris",
  // India
  IST: "Asia/Kolkata",
  // Japan
  JST: "Asia/Tokyo",
  // Australia Eastern
  AEST: "Australia/Sydney",
  AEDT: "Australia/Sydney",
};

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

// Matches timezone abbreviation at end of time expression
const TZ_ABBR_RE =
  /\b(UTC|GMT|PDT|PST|PT|EDT|EST|ET|CDT|CST|CT|MDT|MST|MT|BST|CEST|CET|IST|JST|AEDT|AEST)\b/i;

// 24-hour: 16:00 or 9:30
const TIME_24H_RE = /\b(\d{1,2}):(\d{2})\b(?!\s*(?:AM|PM))/i;

// 12-hour: 9:00 AM or 5:00 PM
const TIME_12H_RE = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i;

// Time range with en-dash or hyphen
// Handles: 9:00–9:45 AM PT, 9:00-9:45 AM PT, 9:00 AM–10:00 AM PT
const TIME_RANGE_RE =
  /\b(\d{1,2}:\d{2})(?:\s*(AM|PM))?\s*[–\-]\s*(\d{1,2}:\d{2})\s*(AM|PM)?\s*(UTC|GMT|PDT|PST|PT|EDT|EST|ET|CDT|CST|CT|MDT|MST|MT|BST|CEST|CET|IST|JST|AEDT|AEST)\b/i;

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

    return {
      startHour: sh,
      startMinute: start.minute,
      endHour: eh,
      endMinute: end.minute,
      tzAbbr,
      sourceDisplay,
    };
  }

  // Try 12-hour single time
  const h12Match = TIME_12H_RE.exec(line);
  if (h12Match) {
    const { hour, minute } = parseHM(`${h12Match[1]}:${h12Match[2]}`);
    const ampm = h12Match[3].toUpperCase() as "AM" | "PM";
    const tzMatch = TZ_ABBR_RE.exec(line);
    const tzAbbr = (tzMatch ? tzMatch[1] : defaultTzAbbr).toUpperCase();
    const sh = applyAmPm({ hour, minute, ampm });
    const sourceDisplay = `${h12Match[1]}:${h12Match[2]} ${ampm} ${tzAbbr}`;
    return {
      startHour: sh,
      startMinute: minute,
      endHour: null,
      endMinute: null,
      tzAbbr,
      sourceDisplay,
    };
  }

  // Try 24-hour single time (ensure no AM/PM follows)
  const h24Match = TIME_24H_RE.exec(line);
  if (h24Match) {
    const hour = parseInt(h24Match[1], 10);
    const minute = parseInt(h24Match[2], 10);
    const tzMatch = TZ_ABBR_RE.exec(line);
    const tzAbbr = (tzMatch ? tzMatch[1] : defaultTzAbbr).toUpperCase();
    const sourceDisplay = `${h24Match[1]}:${h24Match[2]} ${tzAbbr}`;
    return {
      startHour: hour,
      startMinute: minute,
      endHour: null,
      endMinute: null,
      tzAbbr,
      sourceDisplay,
    };
  }

  return null;
}

/** Extract session title from a line after stripping the time tokens. */
function extractTitle(line: string): string {
  // Remove time range expression
  let cleaned = line.replace(TIME_RANGE_RE, "");
  // Remove 12h time
  cleaned = cleaned.replace(TIME_12H_RE, "");
  // Remove 24h time
  cleaned = cleaned.replace(TIME_24H_RE, "");
  // Remove standalone tz abbreviation
  cleaned = cleaned.replace(TZ_ABBR_RE, "");
  // Remove separators (em-dash, en-dash, hyphen, colon) at boundaries
  cleaned = cleaned.replace(/^\s*[–—\-:]+\s*/, "").replace(/\s*[–—\-:]+\s*$/, "");
  cleaned = cleaned.replace(/\s*[–—\-:]+\s*/g, " ").trim();
  return cleaned || "Session";
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
      rows.push({
        type: "unparsed",
        rawLine: trimmed,
        hint: "Couldn't read a time — add a time like `16:00 UTC` or `9:00 AM PT`",
      });
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

    // Resolve timezone
    const iana = ianaFromAbbr(timeParse.tzAbbr) ?? sourceIana;

    // Convert wall time to UTC
    const startUtc = wallToUtc(
      year,
      month,
      day,
      timeParse.startHour,
      timeParse.startMinute,
      iana
    );

    let endUtc: Date | null = null;
    if (timeParse.endHour !== null && timeParse.endMinute !== null) {
      endUtc = wallToUtc(
        year,
        month,
        day,
        timeParse.endHour,
        timeParse.endMinute,
        iana
      );
    }

    const title = extractTitle(trimmed);

    rows.push({
      type: "session",
      title,
      startUtc,
      endUtc,
      sourceTime: timeParse.sourceDisplay,
      rawLine: trimmed,
    });
  }

  return rows;
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
