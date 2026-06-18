# Round 4 — Tester 7 (Aisha, product designer, judges craft hard)

Tested cold on desktop (1440px) + opened share URL as a Tokyo-timezone attendee (my primary lens).

## 1. Clarity — Yes
5-second read: "paste a multi-TZ agenda, share one link, everyone sees their own local time."
The h1 "Your agenda, in everyone's timezone." + subhead nail it.
**Download-all: found COLD, not buried.** It sits full-width at the very top of the localized
preview, first thing above the cards. I saw it before I read a single session row. Placement is
right. The button feels **crafted, not bolted on**: full-width primary blue, calendar emoji,
clean 40px height, good hierarchy vs the small outlined per-session "Add to Google Calendar /
Download .ics" — they complement rather than compete (one bold primary vs. quiet row actions).
The attendee view even adds a tasteful caption "Imports into Google Calendar, Apple Calendar
& Outlook." Empty state is considered (dashed box, example, button correctly hides — no dead button).

## 2. Value — Yes
Today I assemble cross-TZ event agendas by hand in Notion + a "world clock" tab and tell people
"convert it yourself," then field DMs. Bulk .ics is the unlock: one click drops the whole track
into an attendee's calendar instead of 5 separate per-session imports. Verified the file: 5/5
sessions as VEVENTs, every UTC conversion correct (9AM PT→16:00Z, 11:30 ET→15:30Z, 18:00 CET→16:00Z).
The "+1 day" badges in the Tokyo view are genuinely thoughtful — that's the detail that earns trust.

## 3. Advocacy — 8/10
Localization is correct, the share-link-as-attendee flow is the real product, and the new bulk
download is exactly where I'd reach for it. I'd recommend it to event-track organizers unprompted.
Held back from 9 by craft inconsistencies below, not utility.

## Defects
- **P1 (craft inconsistency):** the helper caption "Imports into Google Calendar, Apple Calendar
  & Outlook" appears UNDER the button in the attendee/share view but is MISSING in the editor view —
  the editor is where you first meet the button and needs the reassurance most. Make it consistent.
- **P1 (parsing):** my first line "Design Systems Across Borders — Community Track" (a track title,
  no time) got swallowed as a header and never shown as a card title. A title-line that isn't a date
  or session is silently dropped — confusing for a real agenda paste.
- **P2:** combined .ics filename is just the date ("2026-07-14.ics"); a track-named file would be
  more legible in a downloads folder. Minor.

```json
{"tester": 7, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Download-all helper caption shown in attendee view but missing in editor view — inconsistent", "Non-date/non-session title lines silently dropped on paste", "Combined .ics named only by date, not by track"], "priorConcernsAddressed": "n/a"}
```
