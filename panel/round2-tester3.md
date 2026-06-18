---
tester: 3
name: Wen
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: all
---

# Wen — Marketing data analyst, recurring global webinar series (round 2, re-test)

In-audience: YES. Round 1 advocacy: 6 → Round 2: **9**.

## Re-checking my exact prior trust-killers

**1. Header contradiction (header said UTC/override while times were PT-derived) — FIXED.**
Pasted: embedded header "Summit 2026 — All times PT", "10:00 AM PT Opening Keynote",
"PT Roadmap — Q3 — 11:30 AM", a no-time "Networking Lunch", and out-of-order rows.
- Detected banner: "Detected source timezone: PT — from 'Summit 2026 — All times PT'" (embedded form caught).
- Override selector AUTO-SNAPPED to "PT (America/Los_Angeles)" — agrees with detection.
- Every card subtitle: "Tue, Sep 15 · 10:00 AM PT". Labeled PT, never UTC.
- Creator banner "Times shown in your timezone: America/New_York"; attendee header "Source timezone: PT".
**All four indicators AGREE. No "UTC" lie anywhere (desktop AND 375px mobile).**

**2. Override leakage in share link — FIXED.** Decoded payload =
`{sourceTimezone:"America/Los_Angeles", appliedSourceTzAbbr:"PT", text:...}` — it carries
the DETECTED source tz, not my browser/override state. Opened the link as a Tokyo attendee:
header said "Source timezone: PT", rows correct, no leakage.

**3. Title stripping — FIXED.** "10:00 AM PT Opening Keynote" → title "Opening Keynote".
"PT Roadmap — Q3" → kept verbatim. Exactly right.

**4. Literal "PST" off-by-one (my round-1 hardest blocker) — FIXED.** LA viewer, Mar 10:
"11:00 AM PST" → 12:00 PM AND "19:00 UTC" → 12:00 PM — now the SAME instant (PST honored as
fixed UTC-8 = PDT 12:00). Last round these were an hour apart. The bug my job exists to catch is gone.

**5. No CSV/table export (my round-1 second complaint) — ADDRESSED.** "Copy as table" emits
clean TSV with a header row (Session / Local time / Local date / Source time / Source timezone)
that pastes straight into Sheets/BigQuery. That's the structured data-out I wanted.

prior_concerns_addressed: all

## Verified by hand (I distrust invisible transforms)
PT=PDT=UTC-7 Sep 15; my ET=UTC-4 (ET=PT+3): Keynote 10AM PT→1PM ET ✓; Roadmap 11:30→2:30 ✓;
Closing 2PM→5PM ✓; Early 9AM→12PM ✓. Tokyo attendee (PT+16): Keynote→2AM+1day ✓; Closing→6AM+1day ✓.
Out-of-order input SORTED by time. No-time row → "no time — not exported".
.ics (UTC-anchored): Keynote DTSTART 170000Z ✓, Closing 210000Z ✓, no-time row omitted, SUMMARY
clean. I can audit every row — this is the transparency that earns my trust.

## Clarity: Yes
"Your agenda, in everyone's timezone" + "share one link — each person sees their own local time"
told me what it is and who it's for in 10 seconds. The detected-source banner is what makes me trust it.

## Value: Yes
Today I hand-build a Sheet with per-region TZ formulas and paste into Slack, redone every webinar
(>1×/week). This now shows the parse, lets me verify by hand, travels source-tz in the link with no
leakage, exports UTC-anchored .ics AND TSV back out. It replaces the sheet I audit against. Up from Marginal.

## The ONE thing stopping a 10
"9:00 AM Early Bird Registration" throws a yellow "Unknown timezone 'EARLY' — using source tz".
The parser sniffed the ordinary title word "Early" as a tz token. It recovers correctly (uses PT,
math right), but a spurious tz warning on a row that had no tz at all makes a data-hygiene person
second-guess the whole parse. Only treat a token as a tz when it sits right beside the time, so clean
input stays clean. (Minor sibling: a title/date line like "Spring Sync 2026" gets flagged
"no time — not exported" instead of being recognized as a header — small noise.)

```json
{"tester": 3, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Spurious 'Unknown timezone EARLY — using source tz' warning: parser sniffs the ordinary title word 'Early' as a tz token; recovers correctly but undermines trust in clean input — only treat a token as tz when adjacent to the time", "Minor: a title line like 'Spring Sync 2026' gets flagged 'no time — not exported' instead of recognized as a header"], "priorConcernsAddressed": "all"}
```
