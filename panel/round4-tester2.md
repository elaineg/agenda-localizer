# Round 4 — Tester 2 (Marcus, frontend eng, 2yr, desktop Chrome+devtools)

Motivation: drop ONE link in my team Discord for a public launch-week livestream so every viewer
sees talks in their own local time; will share it only if the parser + shared view impress me.

## NEW FEATURE — "Download all sessions (.ics)"
DISCOVERABILITY: Yes, instant. Big blue "📅 Download all sessions (.ics)" sits at the TOP of the
preview, above the session list, with subcopy "Imports into Google Calendar, Apple Calendar &
Outlook". Did NOT have to hunt. Present on both creator preview AND attendee share view.
WORKS: one click → `launch-week-2026-day-1.ics` with all 5 VEVENTs, valid VCALENDAR, sane filename
from my agenda title. This is genuinely better than clicking "Download .ics" 5 times.

## CLARITY — Yes
H1 "Your agenda, in everyone's timezone." + sub "Paste your sessions, share one link — each person
sees their own local time." nails it in 5s. A pre-loaded sample makes it self-explanatory.

## VALUE — Yes (for the bulk button), but the parser undercuts it
Today I hand-build a Google Cal event per talk or paste a UTC table in Discord and make people do
mental math. Bulk .ics + per-viewer localization would replace that — IF the parser were trustworthy.

## REGRESSION CHECK — clean
- Per-viewer localization re-renders correctly: forced CDP TZ → London 5:00PM / NY 12:00PM / Tokyo
  1:00AM+1day, banner updates per viewer. (My first attendee shot showed LA in Tokyo — that was a
  Playwright TZ-injection artifact in MY env, verified via CDP override; NOT an app bug.)
- Per-session "Add to Google Calendar" link + single "Download .ics" present on shared view.
- Share URL (state in hash, ~430 chars) loads the full agenda. 0 console errors anywhere.

## DEFECTS
P1 — PARSER IGNORES INLINE TIMEZONES. "09:00 PT", "12:00 ET", "18:00 CET" on different lines ALL
collapse to the SAME absolute instant (all show 5:00PM in London). It only honors the source-TZ
dropdown (UTC) and strips per-line abbreviations. A real launch-week agenda spans zones — this
silently mis-times talks. THIS is exactly the case my Discord post needs; deal-breaker for sharing.
P2 — TITLE MANGLING. "Opening Keynote — 2026-06-22 09:00 PT" → SUMMARY "Opening Keynote 2026 06 22":
the date leaks into the title and em-dash/colon are stripped. Looks unpolished in the card and in
the .ics event name.
P3 — Janky: "9:00 AM (your time)" wraps the "(your time)" tight against the time; fine but the
"+1 day"/"-1 day" pills are good. No CSS jank otherwise; button polish is solid.

ADVOCACY: 5/10. The bulk-download button is well-built and discoverable and I'd love to share this,
but I can't post a launch-week link that mis-times every cross-zone talk (P1) and prints "2026 06 22"
in talk titles (P2). Fix per-line TZ parsing and it's an 8.

```json
{"tester": 2, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 5, "topComplaints": ["Parser ignores per-line timezone abbreviations (PT/ET/CET) — all collapse to one instant", "Date leaks into session title/SUMMARY; punctuation stripped"], "priorConcernsAddressed": "n/a"}
```
