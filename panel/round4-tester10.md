# Round 4 — Tester 10 (Sam, PM, mobile-heavy)

## 1. CLARITY — Yes
5-second read nailed it: "Your agenda, in everyone's timezone" + "Paste your sessions, share
one link — each person sees their own local time." I'd tell a friend: "paste a messy
multi-region agenda, send one link, everyone sees it in their own time and can add it to
their calendar." The "Download all sessions (.ics)" button was the FIRST thing in the
preview, above the fold on my phone — found it COLD, zero hunting. The "Imports into Google
Calendar, Apple Calendar & Outlook" subtext on the attendee view is exactly the reassurance
I'd want before sharing.

## 2. VALUE — Yes (with one caveat that stings)
Today I hand-build a Notion table with a UTC column and make people do their own math, or I
paste per-session "Add to calendar" links one at a time. ONE button that drops the entire
roadmap-review agenda into a stakeholder's calendar is exactly my kind of polished artifact —
I'd share that over per-session links every time. Combined .ics verified: 5 VEVENTs, valid
VCALENDAR, sensible filename `q3-roadmap-review-2026-07-15.ics`. Localization is solid:
attendee in Tokyo saw correct local times + "+1 day" badges; creator view + per-session
"Add to Google Calendar"/"Download .ics" all still present on BOTH creator and shared views
— no regression there.

CAVEAT: the calendar DATE is wrong. I typed `2026-07-15` in the agenda (and even per-line
dates), but every DTSTART came out `20260618` — literally "tomorrow." The app ignores any
date in my text and stamps everything to tomorrow, with no date field and no warning. Times
and TZ are right; the day is not. If a stakeholder imports this, the whole roadmap review
lands on the wrong date. That's the one thing that would embarrass me after I hit "share."

## 3. ADVOCACY — 7... no, honest 6
The localization + one-click bulk download is genuinely a "wow, free and no login?" moment
and discoverability is perfect. But I share things to look organized, and a calendar export
that silently puts everything on the wrong day is the exact failure that makes ME look
disorganized. I can't unreservedly recommend a calendar tool whose dates are wrong. Fix the
date and I'm at a 9.

## Defects
- **P0 (new feature + core):** .ics DTSTART ignores the date in the agenda and stamps ALL
  sessions to "tomorrow" (today 2026-06-17 → DTSTART 20260618). Per-line explicit dates also
  ignored. No date input, no warning. Breaks the import use case the download-all button sells.
- **P1:** No visible field or note telling the user what date the export will use; a PM has no
  way to set the real session date.
- Nit: mobile preview card shows only 2 sessions then "+ 3 more"; fine since the full
  localized list below shows all 5, but the top "PREVIEW (5 SESSIONS)" count vs 2 shown is a
  small mismatch.

Note: copy share link verified working (hash-based URL, 452 chars, attendee view rendered
from it correctly).

```json
{"tester": 10, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 6, "topComplaints": ["Combined .ics stamps every session to 'tomorrow', ignoring the date in the agenda — wrong calendar date on import", "No date field or warning about which date the export uses"], "priorConcernsAddressed": "n/a"}
```
