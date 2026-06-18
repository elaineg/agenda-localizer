# Agenda Localizer
Purpose: for a devrel/community/webinar-ops person announcing a multi-session program to a global audience — paste a messy multi-session schedule, get a shareable URL that renders the whole agenda in each viewer's local timezone with per-session add-to-calendar links, no account, all state in the URL.
Problem: A devrel / community / webinar-ops person at a software company runs a recurring multi-session program for a globally distributed audience (launch week with 6 talks across AMER/EMEA/APAC; weekly community office-hours; a virtual-summit track). When they announce the schedule (Discord, launch blog, Slack, email), every line reads "Session 3 — 16:00 UTC" and a chunk of the audience does the timezone math wrong and shows up late or not at all. Recurrence: weekly per series for the active organizer.
Beats alternative: Single-meeting tz tools (Whenest, MeetingTimePro, TZSchedule, timeanddate) handle ONE moment / overlap finder only — a 10-session agenda needs 10 separate links (re-confirmed via fetch). Heavy platforms (Luma, Sched, Sessionize) DO localize multi-session agendas but only inside structured events requiring registration/account setup, which they're structurally disinclined to drop. The surviving wedge: paste real messy schedule text → one shareable auto-localized URL with per-session add-to-calendar links, zero setup, no account, all state in the URL.

Core flows:
1. Paste & localize (creator): paste a free-text multi-session agenda and pick the source timezone. The parser turns it into structured sessions and renders each one in MY local browser timezone (source time also shown), flagging any unparseable line inline without breaking the rest. Editing the text or changing the source timezone re-parses live. A "Copy share link" button encodes the entire agenda + source timezone in the URL (hash), with no backend call. A prominent one-click "Download all sessions (.ics)" action downloads a SINGLE multi-VEVENT .ics file containing every valid session (each VEVENT's DTSTART/DTEND reuses that session's computed UTC start/end), excluding skipped/unparsed lines; the filename is derived from the agenda title (fallback "agenda.ics"). The combined action is .ics-download only (no bulk Google-Calendar URL — that template is single-event-only); per-session links are unchanged.
2. Shared localized view (attendee — THE differentiator): opening a shared link renders the whole pasted agenda auto-localized to the viewer's own browser timezone (with the original source time shown beside each session), and each session has both an "Add to Google Calendar" link and a "Download .ics" link generated entirely client-side. The shared view ALSO offers the same prominent one-click "Download all sessions (.ics)" action (same multi-VEVENT file, UTC-correct for any viewer) so an attendee can subscribe the whole event in one click instead of N. A subtle, non-defacing "Make your own → Agenda Localizer" footer rides the shared view.
3. Load sample agenda (instant demo): one click fills the editor with a known multi-session, multi-timezone agenda so a first-time visitor sees the full parse-and-localize flow in seconds.

Parser formats IN scope (each must parse correctly):
- 24-hour with timezone abbreviation: `16:00 UTC`, `09:30 PT`.
- 12-hour with AM/PM and timezone: `9:00 AM PT`, `5:00 PM ET`.
- Time range with en-dash or hyphen, AM/PM applied to the range: `9:00–9:45 AM PT`, `9:00-9:45 AM PT` (end time inherits the trailing AM/PM and timezone).
- A session label/title preceding or following the time, separated by an em-dash, en-dash, hyphen, or colon: `Session 3 — 16:00 UTC`, `Keynote: 9:00 AM PT`, `9:00 AM PT — Keynote`.
- A standalone date header line (e.g. `Tuesday, June 16`, `Mon June 23`, or `2026-06-16`) that applies to all following sessions until the next date header.
- A timeless line that contains an embedded date (e.g. `Global Webinar Series — 2026-07-15`) is treated as a date header and applies that date to following sessions.
- An inline date on a session line (e.g. `Sprint Planning — Mon June 23, 9:00 AM PT` or `Review — 2026-06-22 11:00 AM ET`) overrides the current date header for that session. The date is stripped from the session title (never leaked into the VEVENT SUMMARY).
- When a session has no resolvable date (no date header above it, no inline date), it shows a visible inline warning ("No date found — add a date header line") in the creator preview. Sessions without a date are still exported to the .ics (using today's date) but the warning makes the situation visible and non-silent.
- Common timezone tokens mapped to IANA zones: UTC, GMT, PT/PST/PDT, ET/EST/EDT, CT/CST/CDT, MT/MST/MDT, BST, CET/CEST, IST, JST, AEST. When a line omits a timezone, the picked source timezone applies.
- One session per non-empty line; blank lines and lines that are only a date header are not treated as sessions.

Parser formats OUT of scope (declared, not required): per-line dual-timezone displays like `12:00 ET / 17:00 BST` parse using the FIRST timezone only; natural-language relative dates ("next Tuesday"), durations without a start time, recurring-event rules (RRULE), week-day-only headers without a date, and non-English month/day names.

Success checks:
- Loading the page and clicking "Load sample agenda" fills the editor and renders at least 3 parsed sessions, each showing a localized time (no "unparsed" flags on the sample).
- Pasting `Session 3 — 16:00 UTC` with source timezone UTC, then viewing in a browser set to America/New_York (UTC-4 in June), shows that session at 12:00 PM (with `16:00 UTC` shown as the source time).
- Pasting `9:00–9:45 AM PT` parses a session starting 9:00 AM and ending 9:45 AM in America/Los_Angeles (both endpoints AM, tz PT), not 9:00 AM–9:45 PM.
- Pasting a line `just some words with no time` flags that single line as unparsed inline while other valid lines still render localized times.
- Opening the URL produced by "Copy share link" in a fresh tab (or incognito) reproduces the identical agenda and source timezone with zero network calls for state (verifiable in the Network tab), localized to that tab's browser timezone.
- Loading a hardcoded known share URL (the one this spec's sample produces) renders the exact same set of sessions and localized times deterministically — the agenda comes entirely from the URL, not a server.
- Each rendered session on the shared view exposes an "Add to Google Calendar" link (an `https://calendar.google.com/calendar/render?action=TEMPLATE...` URL whose `dates=` parameter matches the session's UTC start/end) and a working "Download .ics" link (a `data:text/calendar` or blob download whose `DTSTART` matches the session's UTC start).
- The shared view shows a "Make your own → Agenda Localizer" footer link that returns to the empty editor.
- A prominent "Download all sessions (.ics)" action is visible above the fold (no scrolling) on BOTH the creator preview and the shared attendee view. Clicking it on a 3-valid-session agenda downloads a SINGLE .ics file whose content contains exactly 3 `VEVENT` blocks, each `DTSTART` matching that session's UTC start (the same value its per-session "Download .ics" produces).
- Unparsed/needs-a-time lines are EXCLUDED from the combined .ics: an agenda with 3 valid sessions + 1 unparsed line still yields exactly 3 VEVENTs in the combined file. Note/header/date-header lines also produce no VEVENT.
- When there are 0 valid sessions, the combined "Download all sessions (.ics)" action is absent or disabled (it never downloads an empty/0-VEVENT file). All existing per-session "Add to Google Calendar" and "Download .ics" links remain present and unchanged.
- Date correctness: pasting `2026-07-15\nKeynote — 16:00 UTC` produces a combined .ics whose DTSTART begins with `20260715`, not today's date. Pasting `Sprint Planning — Mon June 23, 9:00 AM PT` produces a DTSTART beginning `20260623` and a SUMMARY of `Sprint Planning` (no date leak).
- Sessions with no date context (no date header, no inline date) display an inline "No date found" warning in the creator preview so the misparse is never silent.
- The combined .ics imports as multiple events: its content begins with `BEGIN:VCALENDAR` and ends with `END:VCALENDAR`, contains one `BEGIN:VEVENT`/`END:VEVENT` pair per valid session, and the downloaded filename ends in `.ics` (derived from the agenda title, fallback "agenda.ics").
- Line-accounting guarantee: every non-blank input line is visibly accounted for in the preview — it either renders as a parsed session card, a labeled date-header row (showing a "DATE" micro-label + the original line text), a note (italic), or an amber unparsed warning card. No line silently disappears. A summary below the download button ("N sessions • M date headers") confirms the count.
- Per-card parsed-date label: each session card shows the resolved source date (e.g. "Tue, Jun 16") alongside the source time, so a wrong-day misparse is auditable on screen without opening the .ics file. Sessions with `hasNoDate` show the "No date found" alert instead.

Out of scope:
- No accounts, login, registration, or RSVP.
- No server persistence or database — all agenda state lives in the URL.
- No reminders or notifications.
- No recurring-event expansion (RRULE) or natural-language relative dates.
- No real-time sync: the shared view reflects the URL it was opened with (re-copy to update).
- No dual-timezone-per-line rendering (first timezone wins) and no non-English locale parsing.
- Natural-language relative dates ("next Tuesday"), bare weekday-only headers without a month/day, durations without a start time, recurring-event rules (RRULE), and non-English month/day names remain out of scope.

Production URL: https://agenda-localizer-elainegao.vercel.app
