"use client";

import Link from "next/link";
import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import {
  parseAgenda,
  formatInZone,
  buildGoogleCalendarUrl,
  buildIcsContent,
  encodeAgendaState,
  decodeAgendaState,
  computeDateCross,
  localDateString,
  type ParsedSession,
  type UnparsedLine,
  type NoteLine,
} from "../lib/parser";
import { SAMPLE_TEXT, SAMPLE_SOURCE_TZ } from "../lib/sample";

// ── H5: Human-readable slug from agenda title ─────────────────────────────
/** Derive a URL slug from the agenda text (first heading or first session title). */
function deriveSlug(agendaText: string): string {
  const lines = agendaText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return "agenda";
  // Take the first non-empty line as the title candidate
  const candidate = lines[0];
  // Strip time tokens, tz abbrs, separators
  const cleaned = candidate
    .replace(/\b\d{1,2}:\d{2}\s*(?:AM|PM)?\b/gi, "")
    .replace(/\b\d{1,2}\s*(?:AM|PM)\b/gi, "")
    .replace(/\b(?:UTC|GMT|PT|PST|PDT|ET|EST|EDT|CT|CST|CDT|MT|MST|MDT|BST|CET|CEST|IST|JST|SGT|HKT|KST|AEST|AEDT|NZST|NZDT|UK)\b/gi, "")
    .replace(/[^a-z0-9\s-]/gi, " ")
    .trim();
  if (!cleaned) return "agenda";
  // Lowercase, replace spaces with dashes, cap at 6 words
  const slug = cleaned
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .join("-");
  return slug || "agenda";
}

/**
 * Build a share URL with a human-readable slug prefix in the hash.
 * Format: #<slug>.<base64payload>
 * The slug is cosmetic — decoding uses only the payload after the last dot separator.
 */
function buildShareUrl(agendaText: string, sourceTimezone: string): string {
  const payload = encodeAgendaState({ text: agendaText, sourceTimezone });
  const slug = deriveSlug(agendaText);
  return `${window.location.origin}${window.location.pathname}#${slug}.${payload}`;
}

// ── Timezone list ──────────────────────────────────────────────────────────
const TZ_OPTIONS: { label: string; value: string }[] = [
  { label: "UTC", value: "UTC" },
  { label: "PT (America/Los_Angeles)", value: "America/Los_Angeles" },
  { label: "ET (America/New_York)", value: "America/New_York" },
  { label: "CT (America/Chicago)", value: "America/Chicago" },
  { label: "MT (America/Denver)", value: "America/Denver" },
  { label: "BST (Europe/London)", value: "Europe/London" },
  { label: "CET/CEST (Europe/Paris)", value: "Europe/Paris" },
  { label: "IST (Asia/Kolkata)", value: "Asia/Kolkata" },
  { label: "JST (Asia/Tokyo)", value: "Asia/Tokyo" },
  { label: "SGT (Asia/Singapore)", value: "Asia/Singapore" },
  { label: "AEST (Australia/Sydney)", value: "Australia/Sydney" },
];

// ── useSyncExternalStore-based URL hash reader ─────────────────────────────
function subscribeToHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
function getHash() {
  return typeof window !== "undefined" ? window.location.hash : "";
}
function getHashServer() {
  return "";
}

// ── Viewer timezone (client-only to avoid hydration mismatch) ─────────────
// Server snapshot is always "UTC"; client snapshot is the real browser timezone.
// useSyncExternalStore keeps them stable so React never hydration-mismatches.
function subscribeToTzChange(/* _cb: () => void */) {
  // Timezone never changes mid-session; no-op subscription is fine.
  return () => {};
}
function getClientTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
function getServerTz() {
  return "UTC";
}
function useViewerTz() {
  return useSyncExternalStore(subscribeToTzChange, getClientTz, getServerTz);
}

// ── CalendarButtons ────────────────────────────────────────────────────────
function CalendarButtons({ session }: { session: ParsedSession }) {
  const gcUrl = buildGoogleCalendarUrl(session);
  const icsContent = buildIcsContent(session);
  const icsDataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  const filename = `${session.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;
  return (
    <div className="flex flex-col gap-1.5 shrink-0 mt-0.5">
      <a
        href={gcUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-md whitespace-nowrap"
      >
        Add to Google Calendar
      </a>
      <a
        href={icsDataUrl}
        download={filename}
        className="text-xs px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md whitespace-nowrap text-center"
      >
        Download .ics
      </a>
    </div>
  );
}

// ── SessionCard ────────────────────────────────────────────────────────────
function SessionCard({
  session,
  viewerTz,
  showCalendar,
}: {
  session: ParsedSession;
  viewerTz: string;
  showCalendar: boolean;
}) {
  const localTime = formatInZone(session.startUtc, viewerTz);
  const localEnd = session.endUtc ? formatInZone(session.endUtc, viewerTz) : null;
  const dateCross = computeDateCross(session, viewerTz);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{session.title}</p>
          <p className="mt-1 text-lg font-bold text-sky-700">
            {localEnd ? `${localTime} – ${localEnd}` : localTime}
            <span className="text-xs font-normal text-slate-500 ml-1">(your time)</span>
            {dateCross && (
              <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                {dateCross}
              </span>
            )}
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {session.sourceTime}
          </p>
          {session.unknownTzToken && (
            <p
              role="status"
              className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-0.5 inline-block"
            >
              {`Unknown timezone '${session.unknownTzToken}' — using source tz`}
            </p>
          )}
        </div>
        {showCalendar && <CalendarButtons session={session} />}
      </div>
    </div>
  );
}

function UnparsedCard({ row }: { row: UnparsedLine }) {
  return (
    <div role="alert" className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
      <span className="text-amber-800 font-medium">{row.rawLine}</span>
      <span className="text-amber-600 ml-2">{"— "}{row.hint}</span>
    </div>
  );
}

function NoteRow({ row }: { row: NoteLine }) {
  return (
    <p className="text-xs text-slate-400 italic px-1 py-0.5">
      {row.rawLine}
    </p>
  );
}

// ── Creator view ───────────────────────────────────────────────────────────
function CreatorView() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [sourceTimezone, setSourceTimezone] = useState(SAMPLE_SOURCE_TZ);
  // H3: Copy share link state — track "idle" | "copied" for unmistakable visual flip
  const [shareCopied, setShareCopied] = useState(false);
  // H4: Copy as table state
  const [tableCopied, setTableCopied] = useState(false);
  const [mobilePreviewExpanded, setMobilePreviewExpanded] = useState(false);
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewerTz = useViewerTz();

  const rows = parseAgenda(text, { sourceTimezone });

  const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
  const unparsed = rows.filter((r): r is UnparsedLine => r.type === "unparsed");
  const sessionCount = sessions.length;
  const unparsedCount = unparsed.length;

  // H3: Copy share link — unmistakable confirmation
  const handleCopy = useCallback(() => {
    const url = buildShareUrl(text, sourceTimezone);

    const doSetCopied = () => {
      setShareCopied(true);
      if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
      shareTimerRef.current = setTimeout(() => {
        setShareCopied(false);
      }, 2000);
    };

    const fallbackCopy = (value: string) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        doSetCopied();
      } catch {
        // silent
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(url).then(doSetCopied).catch(() => fallbackCopy(url));
    } else {
      fallbackCopy(url);
    }
  }, [text, sourceTimezone]);

  // H4: Copy as table (TSV) — no useCallback to avoid React Compiler memoization conflict
  const handleCopyTable = () => {
    const header = ["Session", "Local time", "Local date", "Source time", "Source timezone"].join("\t");
    const bodyRows = sessions.map((s) => {
      const localTime = formatInZone(s.startUtc, viewerTz);
      const localDate = localDateString(s.startUtc, viewerTz);
      const sourceTime = s.sourceTime;
      const sourceTz = sourceTimezone;
      return [s.title, localTime, localDate, sourceTime, sourceTz].join("\t");
    });
    const tsv = [header, ...bodyRows].join("\n");

    const doSetTableCopied = () => {
      setTableCopied(true);
      if (tableTimerRef.current) clearTimeout(tableTimerRef.current);
      tableTimerRef.current = setTimeout(() => {
        setTableCopied(false);
      }, 2000);
    };

    const fallbackCopyTable = (value: string) => {
      try {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        doSetTableCopied();
      } catch {
        // silent
      }
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(tsv).then(doSetTableCopied).catch(() => fallbackCopyTable(tsv));
    } else {
      fallbackCopyTable(tsv);
    }
  };

  // First 2 session cards for mobile preview
  const previewSessions = sessions.slice(0, 2);

  return (
    <main className="flex-1 w-full">
      {/* Hero */}
      <div className="bg-white border-b border-slate-200 px-4 py-6 text-center">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
          Your agenda, in everyone&apos;s timezone.
        </h1>
        <p className="mt-2 text-slate-500 max-w-xl mx-auto">
          Paste your sessions, share one link — each person sees their own local time.
        </p>
      </div>

      {/* Mobile compact preview — shown above the fold on small screens */}
      {sessionCount > 0 && (
        <div className="lg:hidden bg-slate-50 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Preview ({sessionCount} session{sessionCount !== 1 ? "s" : ""})
            </span>
            <button
              onClick={() => setMobilePreviewExpanded((v) => !v)}
              className="text-xs text-sky-600 hover:text-sky-800"
            >
              {mobilePreviewExpanded ? "Collapse" : "See all"}
            </button>
          </div>
          <div
            role="status"
            aria-label="Detected viewer timezone"
            className="text-xs text-slate-500 mb-2"
          >
            Your timezone:{" "}
            <span className="font-medium text-slate-700">{viewerTz}</span>
          </div>
          <div className="flex flex-col gap-2">
            {(mobilePreviewExpanded ? sessions : previewSessions).map((s, i) => (
              <SessionCard
                key={i}
                session={s}
                viewerTz={viewerTz}
                showCalendar={true}
              />
            ))}
            {!mobilePreviewExpanded && sessionCount > 2 && (
              <p className="text-xs text-slate-400 text-center">
                + {sessionCount - 2} more
              </p>
            )}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="agenda-text"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Paste your agenda
            </label>
            <textarea
              id="agenda-text"
              data-testid="agenda-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none lg:rows-14 rows-8"
              placeholder={"Session 3 — 16:00 UTC\n9:00 AM PT — Keynote\n9:00–9:45 AM PT Workshop"}
              aria-label="Agenda text"
            />
          </div>

          <div>
            <label
              htmlFor="source-tz"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Source timezone (times in your agenda are in…)
            </label>
            <select
              id="source-tz"
              data-testid="source-tz-select"
              value={sourceTimezone}
              onChange={(e) => setSourceTimezone(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
            >
              {TZ_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* H3 + H4: Copy buttons cluster */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              {/* H3: Copy share link — unmistakable confirmation */}
              <button
                onClick={handleCopy}
                data-testid="copy-share-link"
                aria-label="Copy share link"
                aria-live="polite"
                className={`flex-1 rounded-lg text-sm font-semibold px-4 py-2.5 transition-colors flex items-center justify-center gap-1.5 ${
                  shareCopied
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-sky-600 hover:bg-sky-700 text-white"
                }`}
              >
                {shareCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    <span>&#10003; Copied!</span>
                  </>
                ) : (
                  <span>Copy share link</span>
                )}
              </button>
              <button
                onClick={() => {
                  setText(SAMPLE_TEXT);
                  setSourceTimezone(SAMPLE_SOURCE_TZ);
                }}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 transition-colors"
              >
                Load sample
              </button>
            </div>

            {/* H3: Inline confirmation line */}
            {shareCopied && (
              <p role="status" className="text-sm text-emerald-700 font-medium">
                Link copied — paste it anywhere
              </p>
            )}

            {/* H4: Copy as table */}
            <div className="flex flex-col gap-1">
              <button
                onClick={handleCopyTable}
                data-testid="copy-as-table"
                aria-label="Copy as table"
                aria-live="polite"
                disabled={sessions.length === 0}
                className={`rounded-lg border text-sm font-medium px-4 py-2 transition-colors flex items-center justify-center gap-1.5 ${
                  tableCopied
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    : "border-slate-300 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40"
                }`}
              >
                {tableCopied ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 shrink-0" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    <span>&#10003; Copied table!</span>
                  </>
                ) : (
                  <span>Copy as table</span>
                )}
              </button>
              {tableCopied && (
                <p role="status" className="text-xs text-emerald-700">
                  Pasted into a sheet? Columns are tab-separated.
                </p>
              )}
            </div>
          </div>

          {/* Privacy line (G5) */}
          <p className="text-xs text-slate-400 leading-relaxed">
            Runs entirely in your browser; nothing is uploaded — your agenda travels inside the link itself.{" "}
            <span className="text-slate-400">The share link contains your full agenda.</span>
          </p>
        </div>

        {/* Right: Localized preview (desktop) */}
        <div className="hidden lg:flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Localized preview</h2>
            <div role="status" className="text-xs text-slate-500">
              {sessionCount > 0 || unparsedCount > 0 ? (
                <>
                  {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                  {unparsedCount > 0 && (
                    <>{" "}·{" "}<span className="text-amber-600">{unparsedCount} line{unparsedCount !== 1 ? "s" : ""} need{unparsedCount === 1 ? "s" : ""} a time</span></>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div
            role="status"
            aria-label="Detected viewer timezone"
            className="text-xs text-slate-500 bg-slate-100 rounded px-3 py-1.5"
          >
            Times shown in your timezone:{" "}
            <span className="font-medium text-slate-700">{viewerTz}</span>
          </div>

          <div className="flex flex-col gap-2">
            {text.trim() === "" ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400 text-sm">
                <p>Paste an agenda on the left to see localized sessions here.</p>
                <p className="mt-1 text-xs">
                  Example: <code className="font-mono">Session 3 — 16:00 UTC</code>
                </p>
              </div>
            ) : rows.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400 text-sm">
                No sessions yet — add times like <code className="font-mono">16:00 UTC</code>
              </div>
            ) : (
              rows.map((row, i) => {
                if (row.type === "dateheader") {
                  return (
                    <p key={i} className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">
                      {row.rawLine}
                    </p>
                  );
                }
                if (row.type === "note") {
                  return <NoteRow key={i} row={row} />;
                }
                if (row.type === "unparsed") {
                  return <UnparsedCard key={i} row={row} />;
                }
                return (
                  <SessionCard
                    key={i}
                    session={row}
                    viewerTz={viewerTz}
                    showCalendar={true}
                  />
                );
              })
            )}
          </div>
        </div>

        {/* Right: Localized preview (mobile — full list below editor) */}
        <div className="lg:hidden flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Full localized preview</h2>
            <div role="status" className="text-xs text-slate-500">
              {sessionCount > 0 || unparsedCount > 0 ? (
                <>
                  {sessionCount} session{sessionCount !== 1 ? "s" : ""}
                  {unparsedCount > 0 && (
                    <>{" "}·{" "}<span className="text-amber-600">{unparsedCount} line{unparsedCount !== 1 ? "s" : ""} need{unparsedCount === 1 ? "s" : ""} a time</span></>
                  )}
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {text.trim() === "" ? (
              <div className="bg-white border border-dashed border-slate-300 rounded-lg p-6 text-center text-slate-400 text-sm">
                <p>Paste an agenda to see localized sessions.</p>
              </div>
            ) : (
              rows.map((row, i) => {
                if (row.type === "dateheader") {
                  return (
                    <p key={i} className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-1">
                      {row.rawLine}
                    </p>
                  );
                }
                if (row.type === "note") {
                  return <NoteRow key={i} row={row} />;
                }
                if (row.type === "unparsed") {
                  return <UnparsedCard key={i} row={row} />;
                }
                return (
                  <SessionCard
                    key={i}
                    session={row}
                    viewerTz={viewerTz}
                    showCalendar={true}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-200 text-center">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-sky-600 transition-colors"
        >
          Make your own → Agenda Localizer
        </Link>
      </footer>
    </main>
  );
}

// ── Shared / attendee view ─────────────────────────────────────────────────
function SharedView({ hash }: { hash: string }) {
  const state = decodeAgendaState(hash);
  const viewerTz = useViewerTz();

  if (!state) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div role="alert" className="max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 mb-3">
            Couldn&apos;t read this agenda link
          </h1>
          <p className="text-slate-500 mb-6">
            The link may be corrupted or incomplete. Ask the organizer for a fresh share link.
          </p>
          <Link
            href="/"
            className="inline-block rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-5 py-2.5 transition-colors"
          >
            Make your own agenda
          </Link>
        </div>
      </main>
    );
  }

  const rows = parseAgenda(state.text, { sourceTimezone: state.sourceTimezone });
  const sessions = rows.filter((r): r is ParsedSession => r.type === "session");

  return (
    <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Agenda</h1>
      <p className="text-sm text-slate-500 mb-1">
        Source timezone:{" "}
        <span className="font-medium text-slate-700">{state.sourceTimezone}</span>
      </p>
      <div
        role="status"
        aria-label="Detected viewer timezone"
        className="text-sm text-slate-500 bg-slate-100 rounded px-3 py-1.5 mb-6 inline-block"
      >
        Times shown in your timezone:{" "}
        <span className="font-medium text-slate-700">{viewerTz}</span>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row, i) => {
          if (row.type === "dateheader") {
            return (
              <p key={i} className="text-xs font-semibold text-slate-500 uppercase tracking-wide pt-2 pb-1">
                {row.rawLine}
              </p>
            );
          }
          if (row.type === "note") {
            return <NoteRow key={i} row={row} />;
          }
          // G2: NEVER render unparsed warning cards in shared view — omit them entirely
          if (row.type === "unparsed") {
            return null;
          }
          return (
            <SessionCard
              key={i}
              session={row}
              viewerTz={viewerTz}
              showCalendar={true}
            />
          );
        })}
      </div>

      {sessions.length === 0 && (
        <div role="alert" className="text-center text-slate-400 py-12">
          No sessions found in this agenda.
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-slate-200 text-center">
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-sky-600 transition-colors"
        >
          Make your own → Agenda Localizer
        </Link>
      </footer>
    </main>
  );
}

// ── Root component ─────────────────────────────────────────────────────────
export function AgendaApp() {
  const hash = useSyncExternalStore(subscribeToHash, getHash, getHashServer);
  const isSharedView = hash.length > 1; // "#" alone = empty, so > 1

  if (isSharedView) {
    return <SharedView hash={hash} />;
  }
  return <CreatorView />;
}
