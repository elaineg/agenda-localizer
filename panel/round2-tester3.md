---
tester: 3
name: Wen
clarity: Yes
value: Marginal
advocacy: 7
prior_concerns_addressed: Partly
---

# Wen — Marketing data analyst, recurring global webinar series (round 2)

## Re-checking my round-1 trust-killers

**1. Silent +1-day rollover — FIXED.** This was my #1 ask and it's done right. I pasted a
2026-03-10 agenda and viewed it as a Tokyo attendee:
- "Closing Remarks — 23:59 UTC" → "8:59 AM **+1 day**" ✓ (23:59 UTC +9 = 08:59 next day)
- "Late Night — 22:00 UTC" → "7:00 AM **+1 day**" ✓
- "Bare Slot — 12:00" → "9:00 PM" with NO badge ✓ (same day, correctly unbadged)
The "+1 day" badge sits right next to the local time, exactly where I'd look. This is the
silent mangle I came to catch, and it's now visible. Big trust win.

**2. Literal "PST" off-by-one — NOT FIXED.** Still wrong, and it's the same root cause.
For an LA viewer on 2026-03-10 (LA is on PDT, UTC-7):
- "Morning Sync — 11:00 AM PST" → "11:00 AM (your time)"
- "Ref — 19:00 UTC" → "12:00 PM (your time)"
11:00 AM PST (UTC-8) IS 19:00 UTC — the same instant — yet the app renders them an hour
apart. It's treating "PST" as the named PT zone (which resolves to PDT in March) and
applying no offset, instead of honoring PST = fixed UTC-8. A data person who labels a
session "PST" on purpose will get a wrong calendar invite and never know. This is the
exact class of bug my job exists to prevent.

## Verified by hand (I distrust invisible transforms)
UTC and named-zone math all check out. No-time lines ("No Time Line Here", "Networking
Lunch" in the sample) are still shown demoted/italic at the bottom rather than silently
dropped — good, that's the honesty I want. Client-side-only, agenda-in-the-link: still
true, still like it.

## Value — Marginal (unchanged)
Today I hand-build a Sheet with a UTC column + TZ formulas. Sharing here is genuinely
nicer (one link, per-viewer local time, per-session .ics). But still **no CSV/table
export** — I can't get structured data back out, so it doesn't replace the sheet I
actually audit against.

## Advocacy — 7
Up from 6. The +1-day badge fixed the scariest silent failure and I'd now trust the tool
for plain UTC/named-zone agendas. But a polite 7 isn't a real recommend: the literal-PST
off-by-one still ships wrong invites for exactly the labeling a global-webinar coordinator
uses, and there's still no CSV out. Fix PST→fixed-offset and I'm at 8–9.

```json
{"tester": 3, "round": 2, "clarity": "Yes", "value": "Marginal", "advocacy": 7, "topComplaints": ["Literal 'PST' at 11:00 AM still renders 11:00 AM for a PDT-period LA viewer (should be 12:00 PM) — PST treated as named PT zone, not fixed UTC-8; same instant as 19:00 UTC shows an hour off", "No CSV/table export for a data analyst who wants structured data back out"], "priorConcernsAddressed": "some"}
```
