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
  type ParsedSession,
  type UnparsedLine,
} from "../lib/parser";
import { SAMPLE_TEXT, SAMPLE_SOURCE_TZ } from "../lib/sample";

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

// ── Viewer timezone (read once, stable) ────────────────────────────────────
function getViewerTz() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

// ── SessionCard ────────────────────────────────────────────────────────────
function SessionCard({
  session,
  viewerTz,
  isSharedView,
}: {
  session: ParsedSession;
  viewerTz: string;
  isSharedView: boolean;
}) {
  const localTime = formatInZone(session.startUtc, viewerTz);
  const localEnd = session.endUtc ? formatInZone(session.endUtc, viewerTz) : null;
  const gcUrl = buildGoogleCalendarUrl(session);
  const icsContent = buildIcsContent(session);
  const icsDataUrl = `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
  const filename = `${session.title.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.ics`;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 truncate">{session.title}</p>
          <p className="mt-1 text-lg font-bold text-sky-700">
            {localEnd ? `${localTime} – ${localEnd}` : localTime}
            <span className="text-xs font-normal text-slate-500 ml-1">(your time)</span>
          </p>
          <p className="text-sm text-slate-500 mt-0.5">
            {session.sourceTime}
          </p>
        </div>
        {isSharedView && (
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
        )}
      </div>
    </div>
  );
}

function UnparsedCard({ row }: { row: UnparsedLine }) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
      <span className="text-amber-800 font-medium">{row.rawLine}</span>
      <span className="text-amber-600 ml-2">— {row.hint}</span>
    </div>
  );
}

// ── Creator view ───────────────────────────────────────────────────────────
function CreatorView() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [sourceTimezone, setSourceTimezone] = useState(SAMPLE_SOURCE_TZ);
  const [copyLabel, setCopyLabel] = useState("Copy share link");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewerTz = getViewerTz();

  const rows = parseAgenda(text, { sourceTimezone });

  const sessions = rows.filter((r): r is ParsedSession => r.type === "session");
  const unparsed = rows.filter((r): r is UnparsedLine => r.type === "unparsed");
  const sessionCount = sessions.length;
  const unparsedCount = unparsed.length;

  const handleCopy = useCallback(() => {
    const hash = encodeAgendaState({ text, sourceTimezone });
    const url = `${window.location.origin}${window.location.pathname}#${hash}`;

    const doSetCopied = () => {
      setCopyLabel("✓ Copied!");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopyLabel("Copy share link");
      }, 2000);
    };

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      navigator.clipboard.writeText(url).then(doSetCopied).catch(() => {
        // fallback
        try {
          const ta = document.createElement("textarea");
          ta.value = url;
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
      });
    } else {
      try {
        const ta = document.createElement("textarea");
        ta.value = url;
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
    }
  }, [text, sourceTimezone]);

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
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono text-slate-800 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400 resize-none"
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

          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              aria-label="Copy share link"
              aria-live="polite"
              className="flex-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold px-4 py-2.5 transition-colors"
            >
              {copyLabel}
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
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col gap-3">
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
                if (row.type === "unparsed") {
                  return <UnparsedCard key={i} row={row} />;
                }
                return (
                  <SessionCard
                    key={i}
                    session={row}
                    viewerTz={viewerTz}
                    isSharedView={false}
                  />
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Shared / attendee view ─────────────────────────────────────────────────
function SharedView({ hash }: { hash: string }) {
  const state = decodeAgendaState(hash);
  const viewerTz = getViewerTz();

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
          if (row.type === "unparsed") {
            return <UnparsedCard key={i} row={row} />;
          }
          return (
            <SessionCard
              key={i}
              session={row}
              viewerTz={viewerTz}
              isSharedView={true}
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
          Made with → Agenda Localizer
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
