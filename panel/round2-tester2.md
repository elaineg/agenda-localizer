---
tester: 2
name: Marcus
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: all
---

# Round 2 — Tester 2 (Marcus, frontend eng 2yr, desktop Chrome + devtools)

In-audience: YES (drops one link in a Discord for a public 'launch week' livestream series; every viewer should see local time). Round 1 advocacy: 4.

## Round-1 P0 re-check: FIXED — verified in cards, shared view, AND .ics
Pasted out-of-order agenda with embedded header "Launch Week Summit 2026 — All times PT":
- "10:00 AM PT Opening Keynote" → card title "Opening Keynote" (NO "PT"). ✓
- .ics line `SUMMARY:Opening Keynote` (NOT "PT Opening Keynote"). ✓  <-- the exact thing that burned me last round
- "PT Roadmap — Q3" correctly KEPT as "PT Roadmap — Q3". ✓
- Detected source tz "PT — from 'Launch Week Summit 2026 — All times PT'" (embedded form). Override snapped to PT, your-tz banner + per-card original-time reference all AGREE. ZERO "UTC" lie. ✓
- Out-of-order input auto-sorted; no-time rows greyed "no time — not exported" and excluded from .ics. ✓

## Trailing-word check (a prior round-2 note flagged titles losing their last word): FIXED
- "Live Coding: Build with our SDK 11:30am PT" → "Live Coding: Build with our SDK" (SDK kept). ✓
- "Panel on DX 2pm PT" → "Panel on DX". ✓   "A talk that ends in API 3pm PT" → "A talk that ends in API". ✓

## Shared/attendee view (opened share link as Asia/Tokyo viewer)
- "Source timezone: PT" + "Times shown in your timezone: Asia/Tokyo". No literal "UTC" on page. ✓
- 10:00 AM PT → "2:00 AM (your time) +1 day" — correct math; the "+1 day" badge is a classy touch. Source tz + times travel inside the link hash, nothing uploaded. ✓
- .ics DTSTART UTC correct (17:00Z/18:30Z/21:00Z for 10AM/11:30AM/2PM PT). ✓

## Mobile 375px (New York viewer)
- No horizontal overflow, zero console errors. Smart "PREVIEW (3 SESSIONS) / See all / +1 more" stacked layout. 10AM PT → 1PM ET correct. ✓
- Nitpick (the one thing): card titles TRUNCATE on narrow cards ("Workshop: Build...") with no tooltip/expand — for a PUBLIC shared schedule that's the lone bit of jank I still notice.

## Answers
1. USE + ADVOCATE? Yes to both. The two things that made me distrust the parser last round (garbled titles, UTC lie) are gone, and the provenance line + original-time reference + "+1 day" badge are exactly the polish that makes me trust it enough to post publicly.
2. Advocacy: 9
3. ONE thing stopping a 10: mobile card-title truncation with no expand on the public shared view. Fix that and I post it in team Slack unprompted.

Clarity: Y. Value: Y (today I hand-write "10am PT / 1pm ET / 6pm UTC" and still get DMs asking "what's that my time"; this kills it).
Round-1 P0 (title token-collision): FIXED.

```json
{"tester": 2, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["mobile card titles truncate ('Workshop: Build...') with no expand/tooltip on the public shared view"], "priorConcernsAddressed": "all"}
```
