# Round 4 — Tester 5 (Dana, demand-gen marketer)

Persona: promotes a multi-TZ virtual summit; needs APAC prospects to not miss sessions. Ruthless about time, screenshots tools she likes.

## 1. CLARITY — Yes
Got it in 5 seconds: "Your agenda, in everyone's timezone. Paste your sessions, share one link — each person sees their own local time." That subhead is the pitch. I'd tell a colleague: "Paste your summit agenda, send one link, every attendee sees the times in THEIR zone and can add the whole thing to their calendar." The "+1 day" badge on the late PT session is exactly the cross-day APAC confusion I fight in email.

**Download-all discoverability: FOUND COLD, not buried.** The blue "📅 Download all sessions (.ics)" sits directly under the timezone banner, ABOVE the first session — first thing I saw on both desktop and the Singapore mobile share view. Subtext "Imports into Google Calendar, Apple Calendar & Outlook" answered my "will this work for my attendees' tools?" question without asking. This is screenshot-worthy.

## 2. VALUE — Yes
Today I hand-build calendar holds: per-session .ics in Litmus/manual, or paste times into HubSpot emails and pray APAC reads UTC math right. Per-session links are a dealbreaker at scale — no attendee clicks "add" 5 times. ONE button = the whole agenda on their calendar is absolutely something I'd promote in the registration email and on the landing page. That's the line: "Add the full summit to your calendar in one click." Per-session links still there for people who only want one talk — good to keep both.

## 3. ADVOCACY — 9/10
I'd bring this up unprompted in our team channel tomorrow. Combined .ics validated: 5/5 VEVENTs, full untruncated titles, correct UTC conversions (9am ET→9pm SGT, 5pm PT→8am+1 SGT). Localization + per-session links: no regression. Not a 10 only because (a) no event end-time control — every session defaults to 1 hour, and my keynotes run 90 min, so the calendar block will be wrong; (b) hyphen dropped in one title ("Privacy-First"→"Privacy First"). Neither stops me promoting it.

## Defects
- P1: All VEVENTs hardcoded to 60-min duration (DTEND = DTSTART+1h). No way to set session length → wrong calendar blocks for non-hour sessions. The one thing that would make me hesitate before telling attendees "your calendar is now accurate."
- P2: Hyphen stripped from title in .ics SUMMARY ("Privacy-First Marketing" → "Privacy First Marketing"). Cosmetic.
- Card titles visually truncated with "…" on screen, but full title is in the .ics — acceptable.

Clipboard note: share-link copy verified (URL 454 chars, hash-encoded agenda); read worked in test env.

```json
{"tester": 5, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["VEVENTs hardcoded to 60-min duration — wrong calendar blocks for 90-min keynotes", "hyphen dropped in .ics title (Privacy-First -> Privacy First)"], "priorConcernsAddressed": "n/a"}
```
