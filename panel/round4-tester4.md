# Round 4 — Tester 4 (Tomás, Ops Analyst, Edge/Windows, medium-tech)

## Prior concerns
First time on panel (no earlier feedback file). priorConcernsAddressed: n/a.

## 1. CLARITY — Yes
In 5s I got it: "Paste a multi-timezone agenda, share one link, everyone sees their own
local time." The H1 "Your agenda, in everyone's timezone." + subline nailed it.
The line "Runs entirely in your browser; nothing is uploaded — your agenda travels inside
the link itself" is exactly what I, as someone wary of pasting internal schedules into
random sites, needed to see. That sold me on safety.
DOWNLOAD-ALL: found it COLD, not buried — big blue "📅 Download all sessions (.ics)" sits
right at the top of the preview, above the session cards. On the attendee view it even
carries the subtitle "Imports into Google Calendar, Apple Calendar & Outlook" — that
answered my "will this land in my Outlook?" question without me asking.

## 2. VALUE — Yes
Today I hand-build all-hands invites: I compute each region's time in Excel, then create
each Outlook event one at a time, or paste a wall of times into a Teams message nobody
trusts. For a 5-session cross-region day this app: (a) localizes every session for each
recipient automatically (the "-1 day" badge on the APAC session is the kind of catch I
normally miss), and (b) the ONE-CLICK bulk .ics drops all 5 events into my calendar in a
single import instead of 5 separate "Add to calendar" clicks. That's a real time save for a
recurring task I do most weeks. Bulk import >> per-session for an agenda this size.
I verified the .ics: 5 correct VEVENTs, UTC times right (SGT/CET/ET conversions all
correct), and the attendee-downloaded file is byte-identical to the creator's. No regression.

## 3. ADVOCACY — 8/10
I'd recommend it to other ops/PM folks who schedule cross-region — and the no-signup,
nothing-uploaded story makes it IT-friendly enough that I'd actually paste a real agenda.
Held back from 9: (1) titles get punctuation-normalized in the .ics ("All-Hands"→"All Hands")
— cosmetic but I'd notice it in Outlook. (2) No event description/location/organizer in the
.ics, and no default duration control (everything is fixed 1h) — for a real invite I'd want
a Teams link in the body, so I'd still edit each event after import. (3) Source-tz is a
single global dropdown; my agenda mixes UTC/SGT/CET/ET inline and it parsed them, but I
wasn't 100% sure whether the dropdown or the inline tz wins — slight trust gap on accuracy.

## Regression check — PASS
Localization works (creator PT view + attendee London view both correct), per-session "Add
to Google Calendar" and per-session "Download .ics" intact, mobile (375px) shows the
download-all button. Zero console/page errors across creator, attendee, and mobile.

## Defects
- P1: .ics events have no DESCRIPTION/LOCATION and a hardcoded 1h duration — ops users need
  the meeting link in the body, so post-import editing is still required (caps the time-save).
- P2: SUMMARY strips punctuation ("All-Hands"→"All Hands"); titles don't round-trip exactly.
- P2: Ambiguity between the global "Source timezone" dropdown and inline per-line tz labels;
  no on-screen confirmation of which governs a line — minor trust gap for accuracy-sensitive users.
- P0: none. New download-all feature works correctly on desktop, mobile, creator & attendee.

```json
{"tester": 4, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": [".ics has no description/location and fixed 1h duration — still must edit each event for the Teams link after import", "title punctuation normalized in .ics (All-Hands→All Hands)", "unclear whether global source-tz dropdown or inline per-line tz wins"], "priorConcernsAddressed": "n/a"}
```
