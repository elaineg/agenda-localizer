# Round 4 — Tester 3 (Wen, marketing data analyst, data-hygiene skeptic)

Tested cold on http://localhost:3022, desktop 1280px. Pasted my own 5-line global webinar
agenda (APAC JST / EMEA CET / Americas PT / Office ET + an async line). Verified creator
preview AND shared attendee view (opened share URL in Europe/London). Hand-checked times
and opened the downloaded .ics files in an editor.

## 1. CLARITY — Yes
"Your agenda, in everyone's timezone… each person sees their own local time" — I got it in
~5 seconds. The new **"Download all sessions (.ics)"** button I found COLD, not buried: it's
a big blue bar at the very top of the preview column, impossible to miss, and the attendee
view adds the reassuring subtitle "Imports into Google Calendar, Apple Calendar & Outlook."

## 2. VALUE — Marginal (because of a data-fidelity bug, not the feature)
Today I do this by hand in Sheets + manual GCal entry per region. The bulk .ics is genuinely
the feature I wanted: one click, every parsed session as a separate VEVENT, 1-hr durations,
and the attendee's downloaded .ics is BYTE-IDENTICAL to the creator's (absolute UTC DTSTART,
TZ-independent) — faithful to what was parsed, drops nothing, mangles no times. Time-of-day
math is all correct (9:00 JST→00:00Z, 14:00 CET→12:00Z=CEST, 10:00 PT→17:00Z, 17:00 ET→21:00Z).
BUT I will not trust it with a real audience until the date bug below is fixed.

## 3. ADVOCACY — 4/10
The bulk download is well-built and the localization is provably correct, so I want to love
it. But as the persona whose whole job is "don't ship a calendar invite with the wrong day,"
a silent date error is exactly the thing that loses me an audience. That's a hard cap at 4.

## P0 — Agenda DATE silently ignored; every event lands on ~TODAY
My header line "Global Growth Webinar Series — 2026-07-15" renders as a greyed group label
but is NOT applied. The share-URL payload contains the correct "2026-07-15" text, yet:
- .ics DTSTART = 20260618 (today), NOT 2026-07-15. Off by ~a month.
- "Copy as table" Local date column = 2026-06-17 / 06-18 (mixed, from TZ rollover), never 07-15.
This is a faithful encoding of a WRONG parse: bulk download is correct relative to a parser
that throws away the date. For a scheduled webinar this is a silent data-mangle = a no-ship.

## P1 — "Source timezone" shows UTC for every row despite explicit inline TZs
The table's Source-timezone column reads "UTC" for all 4 rows even though each line had an
explicit JST/CET/PT/ET. Conversions were still computed correctly, so it's a display/label
lie rather than a math error — but for a skeptic verifying by hand, a column that says UTC
when I typed JST actively erodes trust. Show the per-line TZ it actually used.

No regression: per-session "Add to Google Calendar" + "Download .ics" still present; attendee
localization correct; async line correctly excluded from the .ics.

```json
{"tester": 3, "round": 4, "clarity": "Yes", "value": "Marginal", "advocacy": 4,
 "topComplaints": ["P0: agenda header date (2026-07-15) silently ignored — all .ics events default to ~today, off by a month", "P1: 'Source timezone' column reports UTC for rows that had explicit JST/CET/PT/ET inline"],
 "priorConcernsAddressed": "n/a"}
```
