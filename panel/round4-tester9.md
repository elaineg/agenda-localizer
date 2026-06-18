# Round 4 — Tester 9 (Elena, Eng Manager, mobile-first)

Tested COLD on mobile (375px), local prod build. Pasted a real 5-session Sprint 24 ceremony
schedule across PT/ET, copied share link, opened attendee view on mobile, downloaded bulk .ics.

## 1. CLARITY — Yes
5s: "paste an agenda, everyone sees their own local time, share one link." The H1 "Your agenda,
in everyone's timezone." + subline nailed it instantly. On the shared attendee view the blue
**"Download all sessions (.ics)"** sits directly under the timezone header, ABOVE every session,
with subtext "Imports into Google Calendar, Apple Calendar & Outlook." I noticed download-all in
~3 seconds — NOT buried, well placed for mobile. Discoverability: excellent.

## 2. VALUE — Marginal (would be Yes if the .ics dates were right)
Today I paste ceremony times into a Google Doc and let each report do their own math, or hand-make
calendar invites. "Add the whole sprint to my calendar in one click" is exactly what I want and
beats per-session clicking. Localization is correct (4:00 PM ET rendered 1:00 PM PT, 11:00 AM ET
→ 8:00 AM, math right). Per-session links + bulk both present, no regression there.
BUT the bulk .ics put EVERY session on the WRONG DAY — see P0.

## 3. ADVOCACY — 5/10
Concept and mobile UX are genuinely good and I almost recommended it. The wrong-date export is a
trust-killer: I'd import the sprint, find all 5 ceremonies stacked on today, and stop trusting it.
A manager can't share a calendar file that's silently wrong. Fix P0 and this is an 8.

## DEFECTS
- **P0 — Bulk .ics dates collapse to TODAY for natural-language dates.** Pasted
  "Sprint Planning — Mon June 23, 9:00 AM PT" … "Retro — Fri June 27, 2:00 PM PT". On-screen
  preview correctly showed June 23 / 25 / 26 / 27. But the downloaded .ics had DTSTART
  20260618 (today) for ALL 5 events — times correct, dates all wrong. Same with per-session.
  Using an explicit ISO header ("2026-06-23") DOES produce correct DTSTART, so the parser only
  honors its own date format, NOT the "messy agenda" the app promises to localize. Worst part:
  the screen looks right while the file is wrong — silent corruption.
- **P1 — Session title bleeds the date.** SUMMARY came out "Sprint Planning Mon June 23," —
  the date is jammed into the event title (and a trailing comma). Ugly in a calendar.

```json
{"tester": 9, "round": 4, "clarity": "Yes", "value": "Marginal",
 "advocacy": 5, "topComplaints": ["Bulk .ics puts all sessions on today's date when agenda uses natural-language dates (Mon June 23) — preview right, file silently wrong", "Date bleeds into the event SUMMARY/title"], "priorConcernsAddressed": "n/a"}
```
