# Round 2 — Tester 6 (Jules, Content & community marketer) — in-audience: YES

Round 1 advocacy: 9. Regression sentinel re-test.

## Round-1 complaint re-check (the ONE thing I flagged)
**Defect:** override dropdown defaulted to UTC even after correctly detecting PT — the
control contradicted the correct preview.
**Status: FIXED.** I pasted an agenda whose header embeds "Summit 2026 — All times PT". The
"Override source timezone" selector now reads **PT (America/Los_Angeles)** on both desktop
(1280px) and mobile (375px). It snaps to the detected tz; no more UTC lie. Banner says
*"Detected source timezone: PT — from 'Summit 2026 — All times PT'"* and the local header
reads *"Times shown in your timezone: America/Los_Angeles"*. All three agree.
(Bonus: the older "✓ Copied!" label-flip gripe is also fixed — button flips on click.)

## Everything verified fresh this round
Pasted, messy ordering + a no-time row:
```
Summit 2026 — All times PT
PT Roadmap — Q3 — 3:00 PM
10:00 AM PT Opening Keynote
Closing Remarks
9:00 AM PT Early Birds Coffee
```
- Embedded "All times PT" header → auto-detected. PASS
- "10:00 AM PT Opening Keynote" → title **"Opening Keynote"** (PT/time stripped). PASS
- "PT Roadmap — Q3" → kept verbatim as **"PT Roadmap — Q3"** (PT kept as part of name). PASS
- "Closing Remarks" (no time) → **"no time — not exported"**, omitted from .ics. PASS
- Out-of-order input → preview sorted 9AM, 10AM, 3PM. PASS
- Share link: 329 chars, agenda encoded in URL fragment, nothing uploaded.
- Attendee view (forced Europe/Paris): header **"Source timezone: PT"** +
  **"Times shown in your timezone: Europe/Paris"** — source tz traveled, no UTC lie. Times
  re-localized correctly (9AM PT → 6:00 PM Paris; 3PM PT → 12:00 AM +1 day). PASS
- Combined .ics: clean VCALENDAR, 3 VEVENTs (no-time row omitted), source time in
  DESCRIPTION, imports for Google/Apple/Outlook. PASS
- Mobile 375px: no horizontal overflow, preview-first layout, selector snaps to PT. PASS
- 0 console errors across all runs.

## This is literally my job
Weekly Discord office-hours/AMA for a globally distributed community. Today I hand-type
"10 AM PT / 1 PM ET / 6 PM London / 7 PM Paris" into a pinned Discord post + Notion page
every week, and someone always misreads it across DST. One no-login link where each person
sees their own time + an .ics = a real weekly chore deleted.

## The ONE thing stopping a 10
With NO date header, every card shows an orange **"No date found — add a date header line"**
warning AND the .ics silently dates everything to *today* (DTSTART 20260618). For a recurring
weekly series that's a footgun — events land on the wrong day, and the warning is loud
(repeated once per card) but non-blocking. I'd want an inline date picker, or the warning
collapsed to ONE line at top instead of stamped on all 3 cards. Minor, not a regression.

## Answers
1. USE: Yes, weekly. ADVOCATE: Yes — I'd post this to other community managers unprompted.
2. **Advocacy: 9/10.**
3. ONE blocker to a 10: undated-agenda handling — per-card warning repeated + silent
   "today" fallback in the .ics.

Clarity: **Yes** (headline + "share one link — each person sees their own local time" = clear
in <10s). Value: **Yes** (kills a real weekly hand-typed tz-conversion chore; no login).

Regression vs round 1: **NONE.** Selector-default defect: **FIXED** (snaps to PT on desktop
and mobile; detected tz travels in share link and attendee header).

```json
{"tester": 6, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9,
 "topComplaints": ["Undated agenda: 'No date found' warning repeated on every card AND .ics silently dates everything to today — wrong-day footgun for a weekly series", "Want an inline date picker instead of needing a date-header line"],
 "priorConcernsAddressed": "all"}
```
