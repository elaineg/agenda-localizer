# Round 4 — Tester 1: Priya (Senior Backend SWE, keyboard-first, skeptical, network-tab paranoid)

## Clarity — Yes
Within 5 seconds I got it: "Your agenda, in everyone's timezone. Paste your sessions, share one link —
each person sees their own local time." That is exactly my "what time is that for me?" pain. Sample agenda
pre-fills the preview so I see the value before typing. The "Runs entirely in your browser; nothing is
uploaded — your agenda travels inside the link" line is the right reassurance, and I VERIFIED it: network
tab showed ZERO external requests on paste/download/share. That earns my trust more than any marketing copy.

## New feature discoverability — NOT buried
The blue "Download all sessions (.ics)" button sits directly under the timezone banner, above the session
list — I noticed it on cold load without hunting, in both creator and attendee views, and on mobile (375px).
It downloaded ONE file `on-call-contributor-sync-2026-06-22.ics` with all 5 VEVENTs (verified BEGIN:VEVENT
count = 5), correct UID/DTSTART/DTEND/SUMMARY, VERSION:2.0 + METHOD:PUBLISH — clean, importable. Attendee
view download also produced 5 VEVENTs. Button gives real feedback: "Downloaded — 5 sessions added" +
"Imports into Google Calendar, Apple Calendar & Outlook". This is genuinely better than clicking 5 times.

## Value — Yes
Today I hand-build a table in Slack or eyeball timeanddate.com per session for my US/EU/India on-call +
contributor calls. This kills the "what time for me?" thread AND the 5x per-session calendar-add tedium.
TZ math is correct: 15:00 UTC→8:00 AM PT (creator) / 8:30 PM IST (attendee); 18:00 CET→9:00 AM PT;
19:30 IST→7:00 AM PT. Mixed inline tz tokens (UTC/PT/CET/ET/IST) all parsed right. One bulk .ics into
Google Calendar is exactly the flow I want.

## Advocacy — 8/10
I'd recommend it unprompted to anyone running cross-tz syncs. Not a 9 yet for two honest reasons:
(1) Inline date in a TITLE line ("Title — 2026-06-22") is treated as a section header, so events default
to TODAY's date in the .ics; you must put the date on its OWN line for it to anchor (which DOES work —
verified DTSTART:20260622). That convention isn't signposted and I only found it by inspecting the .ics.
(2) No all-day/duration control — everything is a fixed 1h block; my standups are 15min. Minor, but as an
engineer I notice. Client-side + no-signup + correct TZ math is what gets it to 8.

## P0 / P1
- P0: none. Localization correct, per-session links intact (no regression), bulk .ics valid, nothing phones home.
- P1: Inline date in a title line silently falls back to today's date in the .ics (no warning); date must be
  on its own line to anchor. Easy to get wrong, hard to notice until calendar import shows the wrong day.
- P2/nit: All events hard-coded to 1h duration; no per-session duration/all-day option.

```json
{"tester": 1, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 8,
 "topComplaints": ["Inline date in a title line silently defaults events to today in the .ics; date must be on its own line (no warning)", "All events hard-coded to 1h duration, no all-day/duration control"],
 "priorConcernsAddressed": "n/a"}
```
