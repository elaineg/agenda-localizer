# Round 2 — Tester 9 (Sam, Product Manager)

In-audience: YES. Mobile-heavy PM who organizes cross-regional roadmap reviews and lives to
share clean, organized artifacts. A localized shareable agenda is exactly my kind of thing.

Round 1 score: 8. My ONE blocker: shared-view header read "Source timezone: UTC" while rows
were correctly PT, and the detected zone wasn't carried into the share link.

## Re-check of my exact round-1 complaint — FIXED
I pasted an agenda with an embedded "Summit 2026 — All times PT" header, created a share link,
and opened it COLD as an attendee in BOTH America/New_York (desktop) and Europe/London (375px
mobile). In every view the header now reads **"Source timezone: PT"** — the UTC lie is GONE.
A regex check for `source timezone: UTC` returned false on the attendee page. The detected PT
is genuinely encoded into the share link (357-char URL, no server) and the attendee saw the
same PT source label with correctly-localized rows:
- 9:00 AM PT -> 12:00 PM NY / 5:00 PM London
- 10:00 AM PT -> 1:00 PM / 6:00 PM
- 11:30 AM PT -> 2:30 PM / 7:30 PM
- 2:00 PM PT -> 5:00 PM / 10:00 PM
Share-link source-tz persistence: **FIXED.** Verified end-to-end as an attendee.

## Fresh pass on everything
- Title parsing: "10:00 AM PT Opening Keynote" -> title "Opening Keynote" (PT prefix stripped).
  "PT Roadmap — Q3" KEEPS the leading PT. Both correct. (fix #2 works)
- Out-of-order input (9:00, 10:00, 11:30, 2:00 pasted scrambled) sorted into time order. Good.
- No-time row "Networking Lunch" shown as a non-exported label; combined .ics has 4 VEVENTs
  (lunch correctly excluded). Filename derived from header. Imports look Calendar-ready.
- Combined .ics download works on mobile too.

## Remaining friction (NOT blockers, but the noise that holds the score)
1. False warning: "9:00 AM Early Standup" produced **"Unknown timezone 'EARLY' — using source
   tz"** — it mistook the word "Early" in the title for a timezone token. On a clean artifact
   I want to forward to stakeholders, a wrong yellow warning makes ME look sloppy, which is the
   opposite of what I use this tool for.
2. Every card carries an orange "No date found — add a date header line" banner when I didn't
   include a date. Four orange boxes on a 4-session agenda is a wall of alarm for a non-issue.
   It should be one quiet hint at the top, not repeated per row.

## Answers
1. Use + advocate? YES, I'd use it and I'd share the link — the core artifact is clean and the
   per-attendee localization is genuinely impressive. I'd hesitate to forward the CURRENT
   noisy version to a VP without first removing the false EARLY warning.
2. Advocacy: **9/10**. The UTC lie that capped me at 8 is fixed and I verified it as an
   attendee in two timezones. Held off a 10 only by the false "EARLY" tz warning + the
   repeated orange no-date banners that make a shareable artifact look error-strewn.
3. The ONE thing: the **false "Unknown timezone 'EARLY'" warning** (title-word misread as a
   tz). It's the only thing that would make me look disorganized in front of stakeholders —
   the exact thing I use this tool to avoid.

Clarity: Y — "Paste your sessions, share one link — each person sees their own local time"
nails it in one line.
Value: Y — today I manually build a TZ conversion table in Sheets or paste "(9am PT / 12pm ET
/ 5pm GMT)" by hand into Notion. One link that auto-localizes per attendee beats that easily.

```json
{"tester": 9, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9,
 "topComplaints": ["False 'Unknown timezone EARLY' warning — title word misread as a tz", "No-date warning repeated as an orange box on every card; should be one quiet hint"],
 "priorConcernsAddressed": "all"}
```
