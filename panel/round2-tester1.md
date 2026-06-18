NAME: Priya — senior backend engineer | IN-AUDIENCE: yes | ROUND1: 9 | ROUND2: 9 | CLARITY: Y | VALUE: Y

REGRESSION SENTINEL — nothing broke. All 3 round-2 builder changes verified live, zero external requests, zero JS errors.

MY ROUND-1 CONCERNS, re-checked:
- "Override is a fixed 11-preset list, no arbitrary IANA entry" — STILL the case (UTC/PT/ET/CT/MT/BST/CET/IST/JST/SGT/AEST). Not in the builder's round-2 change list, so not addressed. Still my one minor gap, NOT a regression.
- "Detected banner could show the UTC offset" — not added, but per-card "Source time" sublabels + correct .ics offsets make it sanity-checkable. Minor.
- (Bonus) A .ics DTSTAMP fractional-seconds nit I'd flagged before is GONE — captured DTSTAMP is clean "20260618T104416Z", RFC-valid.

ROUND-2 FIXES — ALL CONFIRMED:
(1) Source-tz snap + no UTC lie: pasted "Summit 2026 — All times PT" → detected "PT — from 'Summit 2026 — All times PT'", override snapped to PT (America/Los_Angeles), creator header "America/Los_Angeles". Opened the share link as an Asia/Kolkata attendee: header reads "Source timezone: PT" + "Times shown in your timezone: Asia/Calcutta" — the round-1 UTC lie is GONE. Source tz travels in the link. Attendee view read-only (0 textareas).
(2) Title strip: "10:00 AM PT Opening Keynote" → title "Opening Keynote" (inline tz stripped). "PT Roadmap — Q3" → kept "PT Roadmap — Q3". Disambiguation correct in preview AND .ics SUMMARY.
(3) Embedded-form detect: "All times PT" embedded in the title line detected fine.

OTHER TRAPS:
- No-time row "Networking Lunch" → "no time — not exported", shown but excluded from .ics. Graceful.
- Out-of-order input (3PM, 10AM, 11AM, 14:00) re-sorted chronologically (10AM/11AM/2PM/3PM) in preview AND .ics.
- Day rollover: 14:00 PT & 3PM PT show "2:30 AM / 3:30 AM (+1 day)" for the India attendee — correct DST math (PDT=UTC-7: .ics DTSTART 17:00Z/18:00Z/21:00Z/22:00Z, all verified).

NETWORK: external requests during full flow = NONE (calendar.google.com only fires on explicit "Add to Google Calendar" click). Share link is a #hash data payload (~369 chars). "Runs entirely in your browser; nothing is uploaded" holds. This is what earns the recommend from me.

MOBILE 375px: preview floats up with "+2 more"/"See all", full-width download button, cards stack cleanly, both tz banners present. No layout break.

1. USE + ADVOCATE: Yes to both. I'd paste my cross-tz on-call/OSS schedule and hand teammates one link instead of fielding "what time is that for me?" — and the network-tab check passing means I'd actually recommend it in Slack.
2. ADVOCACY: 9.
3. ONE BLOCKER: still the closed 11-preset override list — if my source zone isn't one of the 11 and auto-detect misses, I can't force an arbitrary IANA zone. It held me at 9 in round 1 and remains the only thing between this and a 10. Everything else is excellent.

```json
{"tester": 1, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Override source-tz still a fixed 11-preset list, no arbitrary IANA zone entry"], "priorConcernsAddressed": "none"}
```
