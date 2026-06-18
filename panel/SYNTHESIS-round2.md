# Panel SYNTHESIS — Round 2 (DEEPEN: source-tz-detect / trust-the-parse, GLOBAL shared-output fix)

App: agenda-localizer · URL tested: http://localhost:3000 (local prod build)
Round goal: verify the 3 round-1 builder fixes — (1) detected source tz persisted/applied EVERYWHERE (override selector snaps, attendee header honest, source tz travels in share link); (2) title/tz token-collision ("10:00 AM PT Opening Keynote" → "Opening Keynote"; "PT Roadmap — Q3" keeps "PT"); (3) embedded/parenthetical stated-once auto-detect.

## Audience-weighted bar
IN-AUDIENCE (9): Priya, Marcus, Wen, Tomás, Dana, Jules, Aisha, Elena, Sam.
NON-FIT carried (not re-tested): Rob (round-1 floor adv 7, out of audience, does not gate).
PASS = every in-audience persona advocates at adv≥9.

## Per-tester table
| Name  | In-audience? | R1 → R2 | Clarity | Value | The one blocking thing (R2) |
|-------|--------------|---------|---------|-------|------------------------------|
| Priya | yes | 9 → 9 | Y | Y | Override is closed 11-preset list, no arbitrary IANA entry (minor, carried, NOT a regression) |
| Marcus| yes | 4 → **9** | Y | Y | Mobile 375px shared-view card titles truncate with no tooltip/expand (polish) |
| Wen   | yes | 6 → **9** | Y | Y | False tz warning: "Early Bird Registration" → "Unknown timezone 'EARLY'" (title word sniffed as tz) |
| Tomás | yes | 9 → 9 | Y | Y | No structured Excel/TSV paste (out-of-scope, parked) |
| Dana  | yes | 6 → **9** | Y | Y | Mobile 375px doesn't surface the "Detected source timezone" banner (polish) |
| Jules | yes | 9 → 9 | Y | Y | Undated agenda: "No date found" repeats per-card AND .ics silently dates all events to today (footgun) |
| Aisha | yes | 8 → 8 | Y | Y | No-time row: in ATTENDEE view it's bare floating italic with NO "no time" label; silently drops from .ics (carried) |
| Elena | yes | 6 → **9** | Y | Y | Override dropdown still lists bare "UTC" as first option — momentary double-take (only an option, not applied) |
| Sam   | yes | 8 → **9** | Y | Y | False tz warning: "Early Standup" → "Unknown timezone 'EARLY'"; plus "No date found" repeats per-card |

## In-audience-at-9 count: 8/9
At adv≥9: Priya, Marcus, Wen, Tomás, Dana, Jules, Elena, Sam. Below bar: Aisha (8).
Clarity 9/9 Y · Value 9/9 Y. Wedge undisputed; every remaining blocker is execution polish, not a value doubt.

## Regression check vs round 1
NO REGRESSIONS. Priya, Tomás, Jules (the 3 sentinels) all held at 9 with explicit "no regression" verdicts. Several bonus pre-existing nits also resolved this pass (Priya: DTSTAMP RFC-clean; Marcus: trailing-word collision; Wen: literal-PST off-by-one + clean TSV copy-out; Jules: "✓ Copied!" label-flip).

## Round-1 defect resolution (all 3 CONFIRMED FIXED)
1. **Source-tz persisted/applied everywhere** — FIXED. Verified by all 6 round-1 complainants (Marcus, Wen, Jules, Elena, Sam, + Priya as sentinel). Selector snaps to detected PT; attendee header reads honest "Source timezone: PT" + viewer's local zone (tested Tokyo, NY, London, Paris, Kolkata) — NO "UTC" lie anywhere viewer-facing; detected tz encoded into the client-side share-URL hash; no override leakage.
2. **Title/tz token-collision** — FIXED. Marcus (the P0 owner) confirmed in cards, shared view, AND .ics SUMMARY: "10:00 AM PT Opening Keynote" → "Opening Keynote"; "PT Roadmap — Q3" preserved. Corroborated by Wen, Tomás, Dana, Jules, Aisha, Elena, Sam.
3. **Embedded/parenthetical auto-detect** — FIXED. Dana (the cap owner) confirmed "Summit 2026 — All times PT" detects PT and "Times listed in CET" → Europe/Paris; no silent UTC. Corroborated across testers.

## Grouped defects (R2)

### FEATURE defects (fixable; introduced/adjacent to this DEEPEN)
1. **False tz warning on title words — "EARLY" misread as a timezone token** — cited by Wen (caps her at 9) AND Sam (caps him at 9). "9:00 AM Early Bird Registration" / "9:00 AM Early Standup" emits "Unknown timezone 'EARLY' — using source tz". Recovers correctly (times right) but the false orange warning on clean input dents trust for a data-hygiene PM/analyst. Root: a token is treated as a tz candidate even when NOT adjacent to the time. Fix: only sniff a tz token immediately adjacent to the time. **This is the single most-cited NEW defect (2 testers) and the cheapest path to lift both to 10.**
2. **No-time row invisible/unlabeled in ATTENDEE view + silent .ics drop** — Aisha (the ONLY sub-bar tester, 8; carried from R1). Creator view labels it "no time — not exported", but the attendee view shows bare floating italic text with NO "no time set" tag, so an attendee can't distinguish a dropped session from a stray line. No inline "add time" affordance. **This is the lone blocker holding PASS at 8/9.**
3. **Undated-agenda footgun** — Jules (caps at 9). With no date header, the .ics silently dates all events to today + "No date found" warning repeats per-card. Wrong-day risk for a recurring weekly series.
4. **Per-card warning repetition** — Sam + Jules: "No date found" renders as an orange box on every card instead of one quiet top-level hint. Noise, not wrong math.

### Polish / smaller (carry; not blocking 9s)
5. **Mobile 375px doesn't surface the "Detected source timezone" banner** — Dana + Tomás (note). Detection fires (selector snaps) but the on-screen proof isn't shown on the phone composer. (Note: Elena reports the mobile composer DID show "Detected source timezone: PT" for her — so this may be view/state-specific; worth a builder confirm.)
6. **Mobile shared-view card titles truncate** — Marcus, no tooltip/expand at 375px.
7. **Override dropdown lists bare "UTC" first** — Elena; only an option, not the applied value.

### Out-of-scope / enhancement (PARK — do not gate)
8. **Structured Excel/TSV paste** — Tomás (still 9). Parked from R1.
9. **Arbitrary IANA entry in override** — Priya (still 9). Minor, parked from R1.

## Verdict
FIX-AND-RETEST a tight bundle — one cheap fix flips the round to PASS-or-better:
- **Primary (PASS lever):** defect #1 — stop sniffing non-adjacent title words ("EARLY", etc.) as tz tokens; only treat a token adjacent to the time as a tz. This directly lifts Wen + Sam from 9 → 10 and removes the only NEW trust-denter introduced.
- **PASS-completing:** defect #2 — label the no-time row in the ATTENDEE view (and/or add an inline "add time" affordance); Aisha (8) is the single persona below the 9 bar and explicitly says fixing this makes it a 9–10.
- **Bundle (cheap, lifts several to 10):** #3 undated-agenda guard (don't silently date to today; warn once), #4 collapse the repeated "No date found" into one top-level hint.
Park #5–#7 polish and #8–#9 enhancements. We are at 8/9 in-audience-at-9 with zero regressions and all 3 round-1 defects confirmed fixed — one attendee-view no-time label closes the bar.
