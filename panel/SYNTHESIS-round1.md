# Panel SYNTHESIS — Round 1 (DEEPEN: parser robustness / trust-the-parse bundle)

App: agenda-localizer · URL tested: http://localhost:3000 (local prod build)
Round goal: validate SOURCE-TZ AUTO-DETECT, TITLE/TZ TOKEN-COLLISION FIX, SHARED-VIEW HONEST SUMMARY, FLAGGED-ROW HINT + CHRONOLOGICAL SORT.

## Audience-weighted bar (declared up front)
IN-AUDIENCE = personas who announce/coordinate multi-session events across timezones.
- IN-AUDIENCE (9): Priya, Marcus, Wen, Tomás, Dana, Jules, Aisha, Elena, Sam.
- NON-FIT / borderline (1): Rob (low-frequency, occasional client calls; carry his floor, does not gate).
PASS = every in-audience persona advocates at adv≥9.

## Per-tester table
| Name  | In-audience? | Advocacy | Clarity | Value | The one blocking thing |
|-------|--------------|----------|---------|-------|------------------------|
| Priya | yes | 9 | Y | Y | Override source-tz is a fixed 11-preset list, no arbitrary IANA entry (minor) |
| Marcus| yes | 4 | Y | Y | Parser GLUES the "PT" tz token onto every session title — corrupts shared view + .ics |
| Wen   | yes | 6 | Y | Y | Attendee "Source timezone" header states UTC/override while times are PT-derived — header contradicts the math |
| Tomás | yes | 9 | Y | Y | Free-text-only input; can't paste a structured Excel/Outlook block (out-of-scope enhancement) |
| Dana  | yes | 6 | Y | Y | Auto-detect only fires when "All times PT" is on its OWN line; embedded/parens phrasing silently fails → times 7–8h wrong, no warning |
| Jules | yes | 9 | Y | Y | Override dropdown defaults to UTC even after correctly detecting PT — control contradicts the correct preview |
| Aisha | yes | 8 | Y | Y | No-time rows demoted to faint italic with no inline add-time affordance — a real session can be lost |
| Rob   | non-fit | 7 | Y | Y | Stale "UTC" labels (override default + attendee header) contradict correct PT rows, dent trust |
| Elena | yes | 6 | Y | Y | Attendee header "Source timezone: UTC" contradicts PT-based rows; mobile never surfaces the "Detected: PT" indicator |
| Sam   | yes | 8 | Y | Y | Shared-view header reads "Source timezone: UTC" while rows are correctly PT — detected zone not persisted into share link |

## In-audience-at-9 count: 3/9 (Priya, Tomás, Jules)
Clarity 10/10 Y · Value 10/10 Y. Nobody disputes the value prop; every blocker is an execution defect, not a wedge doubt.

## Grouped defects

### FEATURE defects (introduced/owned by THIS DEEPEN bundle — fixable)
1. **Detected source-tz is NOT persisted/applied as the default — UTC leaks everywhere** — cited by 6 testers (Marcus, Wen, Jules, Rob, Elena, Sam). Two faces of one root bug:
   - The "Override source timezone" selector defaults to UTC even when detection correctly reads PT (the control contradicts the correct preview).
   - The shared/attendee view header reads "Source timezone: UTC" while every row is correctly computed FROM PT — header contradicts the math; detected zone is never encoded into the share link. Wen also flags override-leakage into the copied link.
   - **This is the single dominant defect and the clearest path to PASS.** Pure trust-breaker: math is right everywhere, but the displayed/persisted source label is wrong. Caps Wen/Elena/Sam at 6–8 and is half of Marcus's problem.

2. **Title/TZ token-collision fix is INCOMPLETE — "PT" prefix welded onto titles** — cited by Marcus (P0 for him; advocacy 4). The em-dash title "PT Roadmap — Q3" is no longer *misread as a timezone* (the fix's stated goal — that part PASSED for everyone), BUT the leading source-tz token ("PT", "AM") is stripped from the time and glued onto the title: `10:00 AM PT Opening Keynote` → title "PT Opening Keynote", confirmed in the shared view AND the .ics SUMMARY. Only Marcus hit this phrasing (time + tz on the same line as the title with no separator); others used separated lines. Real defect in the artifact that ships to viewers/calendars.

3. **Auto-detect is brittle to phrasing** — cited by Dana (caps her at 6). Detection fires only when "All times PT" is on its OWN bare line; "Summit 2026 — All times PT" or "(all times PT)" silently fails, selector stays UTC, times render 7–8h wrong with NO warning. Same silent-wrong-time class the feature exists to prevent. Fix = detect the phrase anywhere OR loudly warn when defaulting to UTC.

### Polish / smaller feature gaps (carry; not blocking once #1–#3 land)
4. **No-time row affordance** — Aisha (8) + Wen noted it works (flagged, excluded, sorted) but Aisha wants an inline "add time" affordance so a fast-scanning coordinator can't lose a real session. The flag+exclude+sort feature itself PASSED verification across testers.
5. **Mobile doesn't surface the "Detected: PT" indicator** — Elena; desktop shows it, 375px does not.

### Out-of-scope / pre-existing enhancement requests (PARK — do not gate)
6. **Free-text-only input; no structured paste** — Tomás (still a 9), Wen (CSV in/out). Paste-an-Excel/Outlook-table mode. Enhancement, not a regression.
7. **Override is a closed 11-preset list, no arbitrary IANA entry** — Priya (still a 9). Minor enhancement.

## Verdict
FIX-AND-RETEST. One defect dominates and is cheap: **persist & apply the DETECTED source timezone everywhere** — pre-select it in the override selector, encode it into the share link, and make the attendee "Source timezone" header state the zone actually used. That single fix directly lifts Wen, Elena, Sam, Rob, Jules (and half of Marcus) from 6–8 toward 9+. Bundle two smaller robustness fixes in the same pass: (#2) stop welding the leading tz token onto titles when time+tz+title share a line; (#3) make auto-detect robust to "All times PT" embedded in a header/parens (or warn loudly on UTC fallback). Park #6/#7 as enhancements.
