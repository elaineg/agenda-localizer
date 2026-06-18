# Round 2 — Tester 5 (Dana, Demand-gen marketer)

In-audience: YES (promotes a multi-timezone virtual summit; needs agenda in emails + landing pages so APAC prospects don't miss sessions). Round 1 score: 6.

## Round-1 blocker recheck — IS IT FIXED?
**FIXED. Confirmed.** My exact round-1 defect was: embedded/parenthetical tz ("Summit 2026 — All times PT", "(all times PT)") silently failed, rendered 7-8h wrong, no warning.

- Pasted agenda starting "Summit 2026 — All times PT" (tz ONLY stated embedded).
  → Banner: "Detected source timezone: PT — from 'Summit 2026 — All times PT'"
  → Override selector SNAPPED to "PT (America/Los_Angeles)". No silent UTC.
- "Times listed in CET" → detected CET, selector snapped to Europe/Paris. Works.
- No "UTC" lie anywhere — every footer row reads "10:00 AM PT", "9:00 AM PT", etc. All indicators AGREE.

## Other round-2 claims verified
- "10:00 AM PT Opening Keynote" → title rendered "Opening Keynote" (prefix stripped). ✓
- "PT Roadmap — Q3" → kept its "PT", shown as no-time row "not exported". ✓
- No-time rows (Networking Lunch, PT Roadmap) → "no time — not exported". ✓
- Out-of-order sessions → auto-sorted (8AM/9AM/10AM). ✓
- Share link: created, agenda lives in URL hash (truly client-side, nothing uploaded). ✓
- Attendee view (opened in Asia/Tokyo): "Source timezone: PT" + "Times shown in your timezone: Asia/Tokyo" + 10:00 AM PT → **2:00 AM (+1 day)** with a "+1 day" badge. This is THE feature for APAC summit promotion — the +1 day badge is exactly what stops Tokyo prospects from showing up a day late. Source tz + times travel correctly. ✓
- Combined .ics: one file, 2 VEVENTs, correct UTC (10AM PT = 17:00Z, 2PM PT = 21:00Z), title cleaned. ✓
- Mobile 375px: embedded detect fires, selector snaps to PT, preview-first layout clean. ✓

## Answers
1. USE & ADVOCATE? Yes to both. I'd paste my summit agenda once, drop the share link in the email + landing page, and the Tokyo/Sydney prospects each see their own local time with day-shift warnings. I would screenshot the attendee-Tokyo "+1 day" view for the team channel — that's the screenshot-worthy moment.
2. **Advocacy: 9/10.**
3. The ONE thing: on MOBILE the "Detected source timezone" confirmation banner isn't surfaced in the top preview block the way it is on desktop — detection fired (selector snapped), but on my phone I couldn't SEE the proof that it caught my embedded "All times PT". For a tool whose whole trust hinges on "did it read my tz right?", I want that banner visible on mobile without scrolling to the selector. Minor, not a blocker — hence 9 not 10.

Clarity: Y ("Your agenda, in everyone's timezone" + "share one link — each person sees their own local time" nailed it in one scroll).
Value: Y (today I hand-build a tz table in Notion/Canva for each region and STILL get day-shift wrong; this does it in one paste + one link).
Embedded/parenthetical auto-detect: **FIXED.**

```json
{"tester":5,"round":2,"clarity":"Yes","value":"Yes","advocacy":9,"topComplaints":["mobile detection-confirmation banner not surfaced in top preview block"],"priorConcernsAddressed":"all"}
```
