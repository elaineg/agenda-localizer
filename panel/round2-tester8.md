# Round 2 — Tester 8 (Elena, Eng Manager, 8 reports)

In-audience: YES. Round 1 advocacy: 6. Device judged: mobile (375px) primary + desktop cold.

## Round-1 blockers — re-checked first
(a) Header "Source timezone: UTC" contradicting PT rows — **FIXED.** As a NY attendee on
    mobile the header now reads literally "Source timezone: PT" + "Times shown in your
    timezone: America/New_York". No "UTC" string anywhere in the viewer-facing UI. On the
    creator side it shows "Detected source timezone: PT — from 'Summit 2026 — All times PT'".
(b) Mobile never surfaced "Detected: PT" — **FIXED.** The detected banner shows on both the
    creator's 375px composer and travels into the attendee share view as "Source timezone: PT".

## What I pasted (embedded header, PT-prefixed time, PT-titled session, no-time row, out of order)
- "Summit 2026 — All times PT" (embedded) → detected PT, snapped override to PT. Correct.
- "10:00 AM PT Opening Keynote" → title rendered "Opening Keynote" (PT stripped). Correct.
- "PT Roadmap — Q3" → title kept "PT Roadmap — Q3" (PT preserved). Correct.
- "Networking Lunch" (no time) → "no time — not exported", greyed, excluded from .ics. Honest.
- 9:00 AM Standup pasted LAST → sorted to the top of the day. Out-of-order handled.

## All tz indicators agree?
YES. Creator header, detected banner, every row's "9:00 AM PT" anchor, and attendee header
all say PT. As a NY viewer 9:00 AM PT correctly showed 12:00 PM (your time). No UTC lie.

## Share link + combined .ics
Share link encodes the agenda + sourceTimezone + applied "PT" abbr — opened cold on a 375px
phone in a different timezone and was instantly legible inside 5 seconds. "Download all
sessions (.ics)" worked on mobile: 4 VEVENTs, no-time row excluded, DTSTART 16:00Z = 9AM PT.
Correct.

## Answers
1. USE + ADVOCATE: Yes, I'd use it for cross-TZ sprint/ceremony schedules, and yes I'd send
   it to my reports — the attendee link "just shows their own time" with the source TZ stated.
2. Advocacy score: **9/10**
3. The ONE thing stopping a 10: the override dropdown still lists a bare "UTC" entry first in
   the list (it's just a selectable option, not the applied value, so it's not a lie — but on
   a tiny phone composer it's the first thing under "Override source timezone" and made me
   double-take for a second whether UTC was active. Auto-detect already nailed PT, so I never
   needed the dropdown.) Minor; doesn't block recommendation.

clarity: Y
value: Y
header-contradiction fixed: YES
mobile "Detected" indicator fixed: YES

```json
{"tester": 8, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["bare 'UTC' option sits first in override dropdown — momentary double-take on mobile though it's not the applied value"], "priorConcernsAddressed": "all"}
```
