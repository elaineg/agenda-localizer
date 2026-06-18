# Round 3 — Tester 6 (Dana, demand-gen marketer) — PARSER-REGRESSION SENTINEL

## Prior concern (round 2): embedded, stated-once tz must be detected, no silent UTC fallback.

### Re-check of the exact regression target — RESULT: HOLDS, did NOT regress.
Tested cold, my own agendas, viewer tz America/New_York and Asia/Singapore.

- **A — "Summit 2026 — All times PT"** (embedded, stated once, no per-line tz):
  Proof reads `Detected source timezone: PT — from "Summit 2026 — All times PT"`.
  Conversion correct: source `9:00 AM PT` -> `12:00 PM` in New_York (+3). PASS.
- **B — "Times listed in CET"**: `Detected source timezone: CET — from "Times listed in CET"`.
  Source `09:00 CET` -> `3:00 AM` New_York. Maps to Europe/Paris. PASS.
- **C — control, NO tz stated anywhere**: NO detection claimed, sessions stay UTC
  (`09:00 UTC`). Good — no FALSE positive, no silently-invented PT. PASS.

The adjacent-token-only parser change did not break embedded single-statement detection.
**REGRESSION: NO.**

## BUT — blocker for ME specifically (mobile): detection proof is hidden at <1024px.
The `Detected source timezone:` block lives in a container classed `hidden lg:flex`.
At 375px (my phone, between meetings) and on a narrow laptop window it is `display:none`
(confirmed via computed style + only one instance in DOM; visible again at 1024px+).
The conversions still run correctly (source line shows "9:00 AM PT"), so it's not a data
bug — but the trust proof that the WHOLE round-2 fix delivered is invisible exactly where
I'd screenshot it for the team. I can't reassure APAC prospects "yes it knows source = PT"
from a phone screenshot. (copy/share buttons fired fine; not testing clipboard read here.)

## Answers
1. **Advocacy: 9 -> 8.** Core parser trust I demanded is rock-solid; knocked one point
   because the proof I'd screenshot disappears on mobile — my primary capture device.
2. **Clarity: Yes.** H1 "Your agenda, in everyone's timezone." + "Paste your sessions,
   share one link — each person sees their own local time" nails it in one scroll.
3. **ONE blocking thing:** detection proof banner is `hidden lg:flex` -> absent at 375px.
   Show it on mobile too. Embedded-tz detection itself did NOT regress — it still holds.

```json
{"tester": 6, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Detected source timezone proof is hidden below 1024px (hidden lg:flex) — invisible at 375px where I screenshot for the team"], "priorConcernsAddressed": "all"}
```
