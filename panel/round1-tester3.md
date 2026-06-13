---
tester: 3
name: Wen
clarity: Yes
value: Marginal
advocacy: 6
---

# Wen — Marketing data analyst, coordinates a recurring global webinar series

## Clarity — Yes
The H1 "Your agenda, in everyone's timezone." plus the subhead "Paste your sessions, share
one link — each person sees their own local time" told me the job in ~5s. The two-pane
layout (paste left, "Localized preview" right) with "Times shown in your timezone:
America/Los_Angeles" is exactly the legibility I want. I'd tell a peer: "paste your session
list, pick the source TZ, send the link; each attendee opens it in their own time."

## Value — Marginal
Today I hand-build a Google Sheet with a UTC column and TZ formulas, or eyeball
worldtimebuddy. This is faster to *share* (one link, per-viewer localization, per-session
"Add to Google Calendar / Download .ics" — that part is genuinely nice). BUT it does not
beat my sheet on the thing I actually pay the sheet for: **trustworthy, auditable
conversions and CSV out.** No CSV/table export anywhere — I can paste text in but can't get
structured data back out. Dealbreaker-adjacent for my workflow.

## What I verified by hand (I distrust invisible transforms)
- 14:00 UTC → LA 7:00 AM ✓, → Tokyo 11:00 PM ✓. 15:30 CET → LA 7:30 AM ✓. Core UTC math is right.
- Share link is a base64 JSON fragment carrying raw text + source TZ; conversion is
  client-side (no server mangling — I like that), and it decodes to exactly what I typed. Good.

## Bugs / frictions (concrete)
1. **Silent date rollover.** "Closing — 23:59 UTC" shows a Tokyo viewer "8:59 AM" sitting
   under the "2026-03-10" header — but it's actually **March 11**. No "+1 day" badge. This
   is the precise silent mangle I came to catch. Same risk on any cross-midnight session.
2. **"11:00 AM PST" off by an hour.** On 2026-03-10 (LA is on PDT/UTC-7) a literal PST
   (UTC-8) at 11:00 AM should render 12:00 PM in LA; app shows 11:00 AM. It treats inline
   "PST" as the viewer's wall zone instead of the fixed -8 offset. Subtle and wrong.
3. **Bare "12:00" silently assumed noon + source TZ.** No AM/PM, no flag for ambiguity.
4. **No CSV/table export.** Per-session .ics only; no bulk CSV out for a data person.
5. Good: "25:00 UTC" and timeless lines ARE flagged ("Couldn't read a time…"), and the
   "1 line needs a time" counter is honest about what didn't parse. That earns trust.

## Advocacy — 6
The flagging of unparsed lines and visible source+local times build real trust, and sharing
is slick. But I caught a silent +1-day shift and a PST off-by-one on my FIRST serious test —
exactly the failure mode my whole job is to prevent. I can't recommend a time tool to peers
when I can't trust the edge dates, and I can't get my data back out as CSV. Fix the
rollover and I'm at 8.

**Single change to raise advocacy most:** show a "+1 day" / date badge on any session whose
local time crosses to a different calendar day than the agenda header (and fix literal
PST/PDT offset handling). Date-silent conversions are the one thing that kills trust.

```json
{"tester": 3, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 6, "topComplaints": ["Silent date rollover: 23:59 UTC shows as 8:59 AM under the same date header for a Tokyo viewer with no +1-day badge", "Literal 'PST' at 11:00 AM renders 11:00 AM (not 12:00 PM) for a DST-period LA viewer — fixed offset not honored", "No CSV/table export for a data analyst who wants data back out"], "priorConcernsAddressed": "n/a"}
```
