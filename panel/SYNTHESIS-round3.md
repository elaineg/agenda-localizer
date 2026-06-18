# Panel SYNTHESIS — Round 3 (DEEPEN: trust-the-parse — delta re-test of 3 fixes + parser-regression sentinels)

App: agenda-localizer · URL tested: http://localhost:3000 (local prod build)
Round goal: confirm builder's 3 fixes since R2 — (1) GATING: SHARED/attendee view now labels no-time rows "no time — not exported" (Aisha's blocker); (2) TRUST: title word adjacent to time no longer mis-sniffed as tz, no false "Unknown timezone 'EARLY'" (Wen + Sam); (3) TRUST: undated agenda no longer silently dated to today — undated sessions flagged + EXCLUDED from .ics, repeated "No date found" collapsed into ONE banner (Jules + Sam). The tz-token-adjacency change is GLOBAL, so Marcus + Dana ran as parser-regression sentinels.

## Audience-weighted bar
IN-AUDIENCE (9): Priya, Marcus, Wen, Tomás, Dana, Jules, Aisha, Elena, Sam.
NON-FIT carried (does not gate): Rob (round-1 floor adv 7, out of audience).
PASS = every in-audience persona advocates at adv≥9.

## Per-tester table
| Name  | In-audience? | R2 → R3 | Clarity | Value | The one blocking thing (R3) |
|-------|--------------|---------|---------|-------|------------------------------|
| Priya | yes | carried 9 | Y | Y | Override is closed preset list, no arbitrary IANA (carried, orthogonal, not re-tested) |
| Marcus| yes | 9 → 9 | Y | Y | SENTINEL — NO regression: "10:00 AM PT Opening Keynote"→title "Opening Keynote", tz=PT; .ics SUMMARY clean. Nit: no-tag rows inherit & show source "PT" (correct, mildly pedantic). |
| Wen   | yes | 9 → 9 | Y | Y | False "EARLY" warning FIXED. New nit: a real-tz word adjacent to time ("PT" in "PT Roadmap — Q3") is SILENTLY stripped from title with no diff/notice — caps a data-hygiene analyst at 9. |
| Tomás | yes | carried 9 | Y | Y | No structured Excel/TSV paste (carried, out-of-scope) |
| Dana  | yes | 9 → **8** | Y | Y | SENTINEL — NO parser regression (embedded "All times PT"→PT, "Times listed in CET"→Paris both hold). DROPPED 1pt: "Detected source timezone" banner is `hidden lg:flex` → invisible below 1024px, so on her 375px phone the detection PROOF is gone (data still correct). |
| Jules | yes | 9 → **10** | Y | Y | Undated-agenda footgun FIXED: one top-level banner, per-card "no date — not exported" tag, .ics button DISABLED when all undated, nothing dated to today; dated export verified clean (no regression). |
| Aisha | yes | 8 → **9** | Y | Y | GATING FIXED & HOLDS: attendee view now shows "no time — not exported" on no-time rows (desktop + 375px), .ics excludes them (3 VEVENTs, not silent). Nit (non-blocking): line-1 heading parsed as a no-time session row. |
| Elena | yes | carried 9 | Y | Y | Override dropdown lists bare "UTC" first (carried, orthogonal) |
| Sam   | yes | 9 → **10** | Y | Y | BOTH FIXED: no false "EARLY" warning + undated agenda → one banner, .ics button disabled, sessions genuinely excluded. No regression on "All times PT". Nit: mobile renders preview twice. |

## In-audience-at-9 count: 8/9
At adv≥9: Priya (9c), Marcus (9), Wen (9), Tomás (9c), Jules (10), Aisha (9), Elena (9c), Sam (10). BELOW bar: Dana (8).
Clarity 9/9 Y · Value 9/9 Y. Wedge undisputed. The ONE sub-bar tester (Dana) is held by a MOBILE-ONLY visibility bug, not a value or data-correctness doubt.

## Regression check (GLOBAL tz-token-adjacency change)
NO PARSER REGRESSIONS. Both sentinels explicitly confirmed their R2 fixes hold:
- Marcus: "10:00 AM PT Opening Keynote" → title "Opening Keynote", tz=PT, .ics SUMMARY clean; "9:00 AM Early Birds" → "Early Birds" (no over-strip, no false warning).
- Dana: embedded "Summit 2026 — All times PT" → PT; "Times listed in CET" → Europe/Paris; control with NO tz stated → stays UTC, no false-positive invented PT.
The 3 targeted fixes are all CONFIRMED FIXED (Aisha gating, Wen/Sam EARLY-warning, Jules/Sam undated guard).

## Grouped defects (R3)

### FEATURE defects (fixable)
1. **Detected-source-tz banner hidden below 1024px (`hidden lg:flex`)** — Dana (the ONLY sub-bar tester, 9→8). On 375px mobile the "Detected source timezone" PROOF banner is `display:none`; detection + conversions still work (source line shows "9:00 AM PT") but the trust-proof is invisible exactly where Dana screenshots for her team. This is the SAME mobile-banner polish flagged in R2 (#5) — now it is the LONE blocker holding PASS at 8/9. Fix: render the detected-source-tz banner on mobile too. **This is the single PASS-completing fix.**
2. **Silent strip of a real-tz word from the title with no notice** — Wen (caps at 9). "PT Roadmap — Q3" / a "PT" adjacent to time is moved to source-tz and silently removed from the title with no diff/notice. NOT a regression (R2 was a false warning; this is correct-but-invisible transform). Caps a data-hygiene persona at 9. Fix: keep the word OR show a visible "moved PT to source tz" notice. (Does not block the bar — Wen is already at 9.)

### Polish / smaller (carry; not blocking)
3. **Line-1 heading parsed as a no-time session row** — Aisha (still 9). First line of a paste (clearly a title) gets a "no time — not exported" tag. Consistent/harmless; fixing earns her a 10.
4. **Mobile renders the session preview twice** — Sam + Jules (both at 10). Compact top preview + full preview lower down = redundant scroll on 375px. Cosmetic, not a regression.
5. **No-tag rows show inherited source "PT" on their source line** — Marcus (still 9). Technically correct; mildly pedantic.

### Out-of-scope / enhancement (PARK — do not gate)
6. **Structured Excel/TSV paste** — Tomás (carried 9).
7. **Arbitrary IANA entry in override** — Priya (carried 9).

## Verdict
FIX-AND-RETEST one cheap, single-persona defect to flip to PASS:
- **PASS lever (defect #1):** un-hide the "Detected source timezone" banner below 1024px (drop the `hidden lg:flex` gate / render a mobile variant). This is Dana's ONLY blocker, it is a one-class CSS fix, and it lifts her 8 → 9, closing the bar at 9/9 in-audience-at-9. No data is wrong — only the proof is missing on her phone.
- Bundle (cheap, lifts several to 10, NOT required for PASS): #2 visible notice when a real-tz word is moved out of the title (Wen → 10), #3 treat line-1 as a heading (Aisha → 10), #4 de-dupe the mobile double-preview (Sam/Jules polish).
Park #6–#7. We are at 8/9 with ZERO parser regressions and all 3 targeted fixes confirmed fixed; one mobile-banner CSS fix closes the bar.
