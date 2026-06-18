# Round 3 — Tester 2 (Wen, marketing data analyst, desktop two-monitor)

## Prior concern (round-2 cap → 9): "Early Bird" mis-sniffed as tz "EARLY"
Builder claimed fixed. Re-checked the EXACT thing first.
- Pasted: `9:00 AM Early Bird Registration` + normal sessions, source "All times PT".
- NO "Unknown timezone 'EARLY'" warning anywhere — desktop, mobile 375, OR shared view. (any "Unknown timezone" = false)
- Title "Early Bird Registration" intact in cards, shared link view, AND .ics: `SUMMARY:Early Bird Registration`, filename `early-bird-registration.ics`.
- Hand-verified conversion: 9:00 AM PDT(UTC-7) → `DTSTART:20260910T160000Z`. Correct. Keynote 10:00→1700Z, Workshop 2:00PM→2100Z. All correct.
VERDICT: round-2 defect FIXED, completely. 

## Scenario 3 — legitimate PT detection (regression check)
- `All times PT` header → "Detected source timezone: PT — from 'All times PT'". WORKS. NO regression on header tz detection.
- Times convert correctly (10:00 PT→1700Z, 11:30→1830Z, 1:00→2000Z, hand-checked).

## NEW finding — silent title strip on per-line tz token (the one thing holding me back)
Test spec said: "'PT Roadmap' should keep 'PT' in the title." It does NOT.
- `10:00 AM PT Opening Keynote` → card title renders "Opening Keynote" (PT eaten)
- `11:30 AM PT Roadmap — Q3` → card title renders "Roadmap — Q3" (PT eaten)
- Same in .ics: `SUMMARY:Opening Keynote`, `SUMMARY:Roadmap — Q3`. PT stripped everywhere.
The app treats any tz token (PT/CET/etc) directly after the time as a per-session tz override and SILENTLY removes it from the title — no diff, no notice.
This is milder than EARLY (PT is a real tz, so consuming it is defensible) — but as someone who distrusts tools that transform data invisibly, a silent strip with zero signal is exactly the pattern I flag. "PT Roadmap" is a TITLE, not a tz override; I'd want it kept, OR at least a visible "moved 'PT' to source-tz" note so I can verify nothing was lost.
NOT a regression vs round-2 (round-2 was about a FALSE warning; this is silent stripping of a real-tz word) — but it is the inverse trust problem.

## Answers
1. ADVOCACY: 9 → 9. The false-warning fix is real and clean and earns back the trust it cost. It does NOT lift me to 10 because the new silent PT-strip is the same family of "did it quietly change my data?" doubt — a 10 needs me to fully trust it with the audience, and I caught it dropping a title word with no notice. One visible signal (or keeping the word) and this is a 10.
2. CLARITY: Yes. Headline "Your agenda, in everyone's timezone" + "Detected source timezone" + per-card "(your time)" vs source line told me exactly what it does in <30s. CSV-out exists ("Copy as table"), which I like.
3. ONE BLOCKING THING: none is hard-blocking (I'd still ship/recommend). The single thing capping me at 9: a per-line tz token (PT/CET) immediately after the time is silently stripped from the title with no visible notice — show a diff/notice or keep the word.

clarity: Yes | value: Yes (vs my manual BigQuery/Sheets tz math + per-attendee copy — this is one paste, one link, conversions I verified by hand were exact)
fixed-or-regressed: round-2 defect FIXED; NO regression on legit tz detection; one NEW silent-strip nit found.
```json
{"tester": 2, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["per-line tz token (PT/CET) right after the time is silently stripped from the title in cards + .ics with no visible notice — 'PT Roadmap' becomes 'Roadmap'; a data-hygiene user can't see what was removed", "no in-UI signal/diff showing which tokens were consumed as timezones vs kept as title text"], "priorConcernsAddressed": "all"}
```
