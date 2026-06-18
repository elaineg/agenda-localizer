# Panel SYNTHESIS — Round 4 (run 20260617-205623-daily)

App: agenda-localizer (local prod build, http://localhost:3022)
Feature under test: one-click "Download all sessions (.ics)" combined add-to-calendar button
on creator preview AND shared attendee view (desktop + mobile). Downloads ONE .ics with every
parsed session as a VEVENT. Per-session links retained.

## Per-tester results

| # | Persona | Role | Audience | Clarity (5s) | New feature discovered cold? | Value of bulk download | Advocacy |
|---|---------|------|----------|--------------|------------------------------|------------------------|----------|
| 1 | Priya | Senior backend eng | IN | Yes | YES (under tz banner, all views) | Valued; network tab clean | 8 |
| 2 | Marcus | Frontend eng | IN | Yes | YES (big blue button, top) | Valued, beats per-session | 5 |
| 3 | Wen | Marketing data analyst | IN | Yes | YES (blue bar atop preview) | Valued but won't trust w/ wrong date | 4 |
| 4 | Tomás | Ops analyst | IN | Yes | YES (top, "imports into GCal/Apple/Outlook") | Valued; capped by thin payload | 8 |
| 5 | Dana | Demand-gen marketer | IN | Yes | YES (above first session, mobile too) | High — would screenshot to team | 9 |
| 6 | Jules | Community marketer | IN | Yes | YES (desktop + mobile) | Valued for weekly schedule | 7 |
| 7 | Aisha | Product designer | IN | Yes | YES (full-width, top; feels crafted) | Valued; craft is considered | 8 |
| 8 | Rob | Freelance brand designer | borderline (carried) | Yes | YES (first/biggest element) | Could push past "do it by hand" if dates right | 5 |
| 9 | Elena | Eng manager | IN | Yes (mobile) | YES (~3s on mobile) | Valued for sprint ceremonies | 5 |
| 10 | Sam | Product manager | IN | Yes | YES (above fold, mobile) | High — his kind of artifact | 6 |

In-audience personas: 1,2,3,4,5,6,7,9,10 (9). Carried/borderline non-fit: 8 (Rob, low-frequency).
In-audience advocating at 9+: 1 (Dana). 

## Headline finding on the new feature

DISCOVERABILITY: UNAMBIGUOUS PASS. All 10 testers found "Download all sessions (.ics)" COLD
without hunting — it renders full-width as the FIRST/biggest element at the top of the localized
preview, under the timezone banner, above every session card, on creator + attendee + mobile
views. The "added-feature-buried" concern is fully resolved. Craft is good (Aisha: "considered,
not bolted-on"; complements rather than competes with the quiet per-session row links). The
attendee-view subtitle "Imports into Google Calendar, Apple Calendar & Outlook" pre-answered the
"will this work in my calendar?" question for multiple testers.

VALUE: The bulk one-click action is broadly valued over per-session clicking by every in-audience
persona. NO REGRESSION: localization (incl. +1-day badges), per-session Google-Calendar/.ics
links, and hash-state share URL all verified intact across testers; zero console errors. The
combined .ics is structurally valid (correct VEVENT count, correct TZ→UTC time-of-day math,
byte-identical creator vs attendee download — verified by Wen/Tomás/Dana).

So why did advocacy CRATER vs round 3's 9/10? A single shared defect, not the feature's design.

## P0 — DATE PARSING corrupts the export (named by 6 testers: Wen, Rob, Elena, Sam, + Priya/Jules/Marcus as P1)

The combined .ics (AND per-session links) silently stamps the WRONG calendar DAY. When the
agenda uses anything other than a standalone ISO date line (`2026-06-23`):
- a separate ISO header date is parsed but NOT applied to events (Wen: header 2026-07-15 → events default to ~today, off by a month);
- natural-language dates ("Mon June 23", "June 20", "2026-06-22 11:00 AM ET" inline) are NOT parsed — every DTSTART defaults to TODAY/tomorrow (e.g. 20260618);
- the unparsed date string then LEAKS into the event SUMMARY/title (e.g. "Sprint Planning Mon June 23,").

Times-of-day and timezone conversions are correct; it is the DAY that is wrong. Because the
on-screen preview looks fine, the broken export is completely SILENT — the user shares/imports a
calendar that lands on the wrong date. This is the exact "tool silently mangles data" trigger that
churns the data-hygiene and low-frequency skeptics (Wen 4, Rob 5, Elena 5, Sam 6, Marcus 5). The
"messy agenda" promise is not honored in the .ics.

## P1

- No date INPUT field and NO warning telling the user what date the export will use, so the misparse is undetectable (Sam, Rob, Elena). Session cards show no date.
- VEVENTs lack DESCRIPTION/LOCATION and use a hardcoded 60-min duration — no room for the meeting/Teams link, and wrong block length for 90-min keynotes (Tomás, Dana). Caps the time-save.
- Helper caption "Imports into Google Calendar, Apple Calendar & Outlook" appears in the attendee view but is MISSING in the editor/creator view (Aisha) — inconsistent.

## P2 / backlog (NOT to chase this round)

- Title punctuation normalized in .ics SUMMARY (hyphens/commas stripped: "Privacy-First"→"Privacy First").
- "Copy as table" Source-timezone column reports UTC for every row despite explicit inline tz (label lie; times still correct) — Wen.
- Combined .ics filename is date-only, not the track/agenda name (Aisha).
- Session titles truncate on 375px mobile cards (Jules).
- A title-only first line with no time/date is silently dropped on paste (Aisha, Marcus).

## ROUND VERDICT: FIX

Audience-weighted bar NOT met: only 1 of 9 in-audience personas advocates at 9+. This is NOT a
structural ceiling (so not a PARK) and NOT a flaw in the new feature's DESIGN — discoverability,
placement, craft, and the core bulk-download concept all PASS. The advocacy collapse traces to a
SINGLE crisp, fixable P0: the date-parsing/anchoring bug that makes the combined .ics import on the
wrong day for natural-language / header dates. Multiple in-audience testers explicitly stated they'd
jump to 9 once dates are correct (Sam: "9 if the date bug were fixed"; Wen/Rob/Elena gated solely on
it). Recommend ONE builder fix loop: (1) parse natural-language + header dates and APPLY them to
every VEVENT DTSTART; (2) stop leaking the date string into the SUMMARY; (3) add a visible date
indicator/warning so a misparse is never silent. P1 payload (DESCRIPTION/LOCATION/duration) and the
editor-view caption are worth folding in. Re-run a panel round after the fix.
