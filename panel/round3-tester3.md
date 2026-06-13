---
tester: 3
name: Wen
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: Yes
---

# Wen — Marketing data analyst, recurring global webinar series (round 3)

## Both round-2 blockers — FIXED

**1. Literal "PST" off-by-one — FIXED.** Verified by hand as an LA viewer on 2026-03-10
(LA is on PDT, UTC-7):
- "Morning Sync — 11:00 AM PST" → **12:00 PM (your time)**
- "Ref — 19:00 UTC" → **12:00 PM (your time)**
11:00 AM PST (UTC-8) IS 19:00 UTC — the same instant — and the app now renders them on the
SAME local time. PST is finally honored as fixed UTC-8 instead of collapsing to the named PT
zone. This was the exact silent-mangle my job exists to catch, and it's correct now.

**2. CSV/table export — FIXED (and done the way a data person wants).** "Copy as table"
now exists and writes clean tab-separated data straight to the clipboard:
`Session  Local time  Local date  Source time  Source timezone`
Pastes into Sheets as five tidy columns, no munging. Crucially it keeps a **Source time**
column with the literal ("11:00 AM PST", "23:59 UTC") next to the computed local time — so I
can audit the transform by hand, which is exactly my trust requirement. I can finally get
structured data back OUT.

## Verified by hand
- +1-day badge still works: Tokyo viewer, "Closing — 23:59 UTC" → "8:59 AM **+1 day**";
  "Bare — 12:00" → "9:00 PM" with no badge. Correct.
- No-time line ("Networking Lunch") still shown demoted, not dropped. Good.
- Still client-side-only, agenda-in-the-link. Like it.

## One nit (not a blocker)
The export's "Source timezone" column always reports the dropdown value ("UTC"), even on
the row whose literal is "11:00 AM PST". The per-line literal is preserved in "Source time"
so nothing is lost, but the timezone column is slightly misleading for mixed-suffix agendas.
Minor — I'd just hide my eyes from that one column.

## Value — Yes
Today I hand-build a Sheet with a UTC column + TZ formulas and audit invites against it.
This now does both jobs: one share link with per-viewer local time AND a clean table I can
paste back into my Sheet to verify. It genuinely replaces the manual TZ-formula step.

## Advocacy — 9
Up from 7. Both things that held me back are fixed and verified by hand: PST math is right,
and there's a clean auditable table export. The literal-source column in the export is the
only reason I'm not at 10. I'd bring this up unprompted to anyone running a recurring global
agenda.

```json
{"tester": 3, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Export 'Source timezone' column always shows dropdown value (UTC) even for rows labeled '11:00 AM PST'; literal preserved in 'Source time' so not data loss, just a slightly misleading column"], "priorConcernsAddressed": "all"}
```
