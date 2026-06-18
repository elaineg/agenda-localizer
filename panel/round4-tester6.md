# Round 4 — Tester 6 (Jules, content & community marketer)

## 1. CLARITY — Yes
In 5s I got it: "Paste a messy multi-session agenda, share one link, everyone sees the
times in their own timezone." The h1 "Your agenda, in everyone's timezone." + subtitle
nail it. This is literally my weekly Discord office-hours job.

**Download-all discoverability: found COLD, not buried — on BOTH desktop and mobile.**
The blue "📅 Download all sessions (.ics)" button sits at the very top of the preview /
shared view, above the cards. On mobile (375px) it's the first thing after the timezone
banner, with helpful subtext "Imports into Google Calendar, Apple Calendar & Outlook." I
did not hunt for it. Per-session "Add to Google Calendar" / "Download .ics" still present.

## 2. VALUE — Yes
Today I hand-write the schedule into a Discord pinned post + a Notion page and answer
"wait, what time is that for me?" all week. The shared link already kills the timezone-math
DMs. The combined .ics is a real upgrade over per-session: I want my whole weekly series in
my calendar in ONE click, not 5 downloads. Verified the combined file: 5 VEVENTs, one per
session, correct UTC conversions (15:00 UTC AMA → 5:00 PM Berlin on a German viewer),
filename auto-named from my title. Mobile download fired too. This beats per-session.

## 3. ADVOCACY — 7
I'd recommend it, but not unprompted yet because of one trust-breaking bug below.

### Defects
- **P1 (calendar correctness, NOT new-feature but now propagates into combined .ics):**
  A human date header "Community Office Hours — June 20" is shown as a label but NOT parsed
  as the date — events silently defaulted to the WRONG day (June 18, not 20). Only an ISO
  header `2026-06-20` parses correctly. No warning. A community organizer who writes
  "June 20" will ship a calendar file that puts everyone on the wrong day. Fix: parse
  natural-language dates, or warn "no date detected, using <X>".
- **P2 (mobile):** session titles truncate ("Weekly AMA wit…") in cards on 375px — an
  attendee can't read what the session is.
- No regression: localization + per-session add-to-calendar/download all still work; 0
  console errors. Copy share link verified (clipboard read OK in test env).

```json
{"tester": 6, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 7, "topComplaints": ["Natural-language date header (\"June 20\") silently ignored → events land on wrong day in the .ics, no warning", "Session titles truncate on mobile cards"], "priorConcernsAddressed": "n/a"}
```
