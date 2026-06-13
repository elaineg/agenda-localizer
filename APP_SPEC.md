# Agenda Localizer
Purpose: for a devrel/community/webinar-ops person announcing a multi-session program to a global audience — paste a messy multi-session schedule, get a shareable URL that renders the whole agenda in each viewer's local timezone with per-session add-to-calendar links, no account, all state in the URL.
Problem: A devrel / community / webinar-ops person at a software company runs a recurring multi-session program for a globally distributed audience (launch week with 6 talks across AMER/EMEA/APAC; weekly community office-hours; a virtual-summit track). When they announce the schedule (Discord, launch blog, Slack, email), every line reads "Session 3 — 16:00 UTC" and a chunk of the audience does the timezone math wrong and shows up late or not at all. Recurrence: weekly per series for the active organizer.
Beats alternative: Single-meeting tz tools (Whenest, MeetingTimePro, TZSchedule, timeanddate) handle ONE moment / overlap finder only — a 10-session agenda needs 10 separate links (re-confirmed via fetch). Heavy platforms (Luma, Sched, Sessionize) DO localize multi-session agendas but only inside structured events requiring registration/account setup, which they're structurally disinclined to drop. The surviving wedge: paste real messy schedule text → one shareable auto-localized URL with per-session add-to-calendar links, zero setup, no account, all state in the URL.

Core flows:
1. Paste & localize (creator): paste a free-text multi-session agenda and pick the source timezone. The parser turns it into structured sessions and renders each one in MY local browser timezone (source time also shown), flagging any unparseable line inline without breaking the rest. Editing the text or changing the source timezone re-parses live. A "Copy share link" button encodes the entire agenda + source timezone in the URL (hash), with no backend call.
2. Shared localized view (attendee — THE differentiator): opening a shared link renders the whole pasted agenda auto-localized to the viewer's own browser timezone (with the original source time shown beside each session), and each session has both an "Add to Google Calendar" link and a "Download .ics" link generated entirely client-side. A subtle, non-defacing "Make your own → Agenda Localizer" footer rides the shared view.
3. Load sample agenda (instant demo): one click fills the editor with a known multi-session, multi-timezone agenda so a first-time visitor sees the full parse-and-localize flow in seconds.

Parser formats IN scope (each must parse correctly):
- 24-hour with timezone abbreviation: `16:00 UTC`, `09:30 PT`.
- 12-hour with AM/PM and timezone: `9:00 AM PT`, `5:00 PM ET`.
- Time range with en-dash or hyphen, AM/PM applied to the range: `9:00–9:45 AM PT`, `9:00-9:45 AM PT` (end time inherits the trailing AM/PM and timezone).
- A session label/title preceding or following the time, separated by an em-dash, en-dash, hyphen, or colon: `Session 3 — 16:00 UTC`, `Keynote: 9:00 AM PT`, `9:00 AM PT — Keynote`.
- A standalone date header line (e.g. `Tuesday, June 16` or `2026-06-16`) that applies to all following sessions until the next date header. Sessions before any date header default to the next occurrence of that time.
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

Out of scope:
- No accounts, login, registration, or RSVP.
- No server persistence or database — all agenda state lives in the URL.
- No reminders or notifications.
- No recurring-event expansion (RRULE) or natural-language relative dates.
- No real-time sync: the shared view reflects the URL it was opened with (re-copy to update).
- No dual-timezone-per-line rendering (first timezone wins) and no non-English locale parsing.

Production URL: <filled in by deployer>
