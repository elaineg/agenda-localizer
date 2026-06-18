# Round 3 — Tester 5 (Marcus, frontend eng, parser-regression sentinel)

## Prior-concern re-check (round 2 fix: "10:00 AM PT Opening Keynote")
**REGRESSION: NO. The round-2 fix STILL HOLDS — verified across card / shared-URL / .ics.**

Pasted: `10:00 AM PT Opening Keynote` + sibling `TIME PT Title` lines + an
adjacent-leading-word title `9:00 AM Early Birds`.

- Card title: **"Opening Keynote"** — "PT" stripped, NOT in title. ✓
- Source-time subtitle correctly shows `10:00 AM PT` (so PT is sniffed as tz, not title). ✓
- Detected source tz banner: **"PT — from '10:00 AM PT Opening Keynote'"**. ✓
- Share-URL slug: `#opening-keynote...` (PT not in slug). ✓
- **.ics SUMMARY: `SUMMARY:Opening Keynote`** — clean, no PT in the calendar event. ✓
- Siblings clean too: "Workshop: Building with AI" (colon kept), "Community Q&A".

## Adjacent-leading-word title (the new global-parser risk)
`9:00 AM Early Birds` → title **"Early Birds"** (no word stripped, NO false warning).
It correctly inherited the detected source tz, showing `9:00 AM PT` as source time.
The new "only a token adjacent to the time is a tz" rule did NOT eat the legit leading
word "Early" — exactly what I wanted to confirm. ✓

## Desktop + 375px mobile
- Desktop: cards, banner, .ics all correct. 0 console errors.
- Mobile 375px: clean, no overflow, title ellipsis truncation is graceful, preview uses a
  tidy "+1 more / See all" pattern. 0 console errors. No janky CSS — passes my eye.
- The only warning shown ("4 sessions have no date... not exported") is CORRECT behavior
  for a dateless agenda, not a regression. Adding a `2026-06-23` header exported all 3.

## Three questions
1. **Advocacy: 9 (HOLD).** Parser is rock-solid through the global tz-token change, output
   is clean in every surface (card, URL, .ics), mobile is polished. I'd still drop this in
   my team's launch-week Discord. Not a 10 only because the "PT" stays visible in the
   source-time line for the no-PT "Early Birds" row (inherited, technically correct, but a
   pedantic viewer might wonder why a line they didn't tag shows "PT") — minor, not blocking.
2. **Clarity: YES.** "Your agenda, in everyone's timezone — paste sessions, share one link,
   each person sees their own local time." The live localized preview + detected-tz banner
   make the value obvious in <10s.
3. **ONE blocking thing: NONE.** No blocker. **The "PT Opening Keynote" parse did NOT
   regress — it still holds across card, shared view, and .ics SUMMARY.**

```json
{"tester": 5, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["no-PT rows inherit and display 'PT' on source-time line (correct but could confuse a pedantic viewer)"], "priorConcernsAddressed": "all"}
```
