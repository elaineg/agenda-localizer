# Round 4 — Dana (Demand-gen marketer), 375px phone

## Prior blocker re-check (round 3 was 8)
FIXED. The "Detected source timezone: PT — from '…'" indicator — invisible on my 375px
phone in round 3 — is now VISIBLE and LEGIBLE in BOTH views at 375px:
- CREATOR view: reads `Detected source timezone: PT — from "Summit 2026 — All times PT"`,
  wraps cleanly across two lines, no clipping, no overlap.
- ATTENDEE/shared view (tested as Asia/Singapore): same indicator shows, plus
  "Times shown in your timezone: Asia/Singapore". This is exactly the trust-proof I
  screenshot for my team channel — it's back on mobile.

## No regression
- Conversions correct: 10:00 AM PT → 1:00 AM +1 day in Singapore (the cross-midnight
  APAC risk is flagged clearly with a "+1 day" pill — gold for my summit).
- .ics correct: with a date header, all 3 VEVENTs export; 10:00 AM PT/Jun 23 = 170000Z. ✓
- Dateless sessions correctly disabled from export with a clear "add a date header" warning.
- Desktop unbroken.

## Panel answers
1. Advocacy: **9** (round 3 was 8). The mobile detection indicator CLOSED my blocker — the
   proof I screenshot now survives on the phone, in the attendee view APAC prospects see.
2. Clarity: **Yes** — "Paste your sessions, share one link — each person sees their own
   local time" + live preview made it instantly legible. Value: **Yes** — today I hand-build
   a timezone table in Notion/Canva per email; this is paste→share-link→done, no signup.
3. Holding below a 10: the share link is a long opaque hash; I'd want a "Copy as table"
   path I trust pastes cleanly into a HubSpot email, but nothing blocks 9.

```json
{"tester": 1, "round": 4, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["share link is a long opaque hash, not a pretty URL", "want confidence Copy-as-table pastes clean into HubSpot emails"], "priorConcernsAddressed": "all"}
```
