# Panel SYNTHESIS — agenda-localizer — Round 2

Preview tested: https://agenda-localizer-8s3eu4rzp-elainegao.vercel.app (commit e63582e)
Date: 2026-06-13. All 10 re-tested (round-1 had 0 full passes; parser+warning fixes touched every flow).

## Score table (round-1 → round-2)
| # | Persona | Clarity | Value | Advocacy | Full pass? | Prior fixed? |
|---|---------|---------|-------|----------|-----------|--------------|
| 1 | Priya (backend eng) | Yes | Yes (M→Y) | 7→**9** | ✅ | Yes (calendar export found, "noon"/named-zones parse) |
| 2 | Marcus (frontend eng) | Yes | Yes | 8→**8** | no | Yes (all 4) — but NEW title bug |
| 3 | Wen (data analyst) | Yes | Marginal | 6→**7** | no | Partly (+1day fixed; PST not; no CSV) |
| 4 | Tomás (ops analyst) | Yes | Yes (M→Y) | 6→**8** | no | Yes (privacy line landed) |
| 5 | Dana (demand-gen) | Yes | Yes (M→Y) | 5→**9** | ✅ | Yes (inline tz codes honored+flagged) |
| 6 | Jules (community) | Yes | Yes (M→Y) | 6→**9** | ✅ | Yes (bare-hour parses) |
| 7 | Aisha (designer) | Yes | Yes | 8→**8** | no | Yes (notes/2pm/clean shared) — but NEW range bug |
| 8 | Rob (freelance designer) | Yes | Marginal | 6→**8** | no | Yes (.ics + colons) — link still ugly |
| 9 | Elena (eng manager) | Yes | Yes | 8→**9** | ✅ | Yes (mobile preview above fold; link shrank) |
| 10 | Sam (PM) | Yes | Yes | 8→**9** | ✅ | Yes (heading/informal times) |

**Fully passing: 5/10** (Priya, Dana, Jules, Elena, Sam). Need 9/10. Clarity 10/10, value 8/10.
Every round-1 grouped friction (G1–G7) was resolved and confirmed by the affected testers.

## Holdouts and causes

### H1 — NEW parser regression: title word-drop + bare-hour range (T2 Marcus 8, T7 Aisha 8) — TOP fixable
The round-2 lenient parser introduced two title/range bugs, both visible in the SHARED view:
- **Title word-drop (T2):** the bare-hour/time match eats the last word before the time. "Live Coding: Build with our SDK 11:30am PT" → "Live Coding: Build with our" (SDK gone); "Panel on DX" → "Panel on". Titles that end in a product noun silently lose it.
- **Bare-hour range (T7):** "9-10am hallway track" → title "9 hallway track" at 10:00 AM UTC — wrong title AND uses the END of the range instead of the START, AND fails to localize. (Note: the empty-state placeholder still advertises "9:00–9:45 AM PT" as supported, so this format is promised.)
Both are correctness/polish regressions from the parser work. 2 in-ICP testers blocked at 8. FIX FIRST.

### H2 — Literal PST/PDT treated as DST-aware zone, not fixed offset (T3 Wen 7, also T9 bonus)
"11:00 AM PST" and "19:00 UTC" are the same instant but render an hour apart for an LA viewer,
because "PST" maps to America/Los_Angeles (→PDT/UTC-7 in summer) instead of a fixed UTC-8.
Also: alias "UK" → BST/GMT and "PST/PDT" → PT family (T9 explicitly asked; she flagged "UK" falls
back to source tz). A time tool that ships wrong invites is the worst failure for Wen (data hygiene).

### H3 — Copy confirmation not visibly flipping for real users (T6 Jules, T10 Sam) — recurring friction
Two testers reported NO visible "✓ Copied!" confirmation (clipboard DID copy — both verified by
reading it back). The verifier passed it twice, so the flip works mechanically but is too
subtle/brief/mis-placed for a real user mid-task. This is the recurring copy-confirmation friction
lesson resurfacing — make the confirmation UNMISTAKABLE (prominent, longer dwell, clear color/icon).
Both already at 9, but fixing protects them and signals polish.

### H4 — Data-export gap (T3 Wen, value=Marginal) — cheap ICP win
Wen (data analyst) keeps value=Marginal partly because "no CSV/table export — can't replace the
sheet I audit against." A client-side "Copy as table"/CSV export of the localized agenda is cheap,
on-brand (no server), and would likely move Wen value→Yes and serve the analyst ICP generally.

### H5 — Ugly base64 share link (T8 Rob 8 lone blocker; T9 "still a titleless blob") — polish
The share link is a ~233–285 char `#eyJ...` base64 blob with no human-readable part. T8's ONLY
remaining blocker; T9 said it's the one thing short of 10. Add a human-readable title slug to the
URL (e.g. `/#launch-week-2026-...payload`) without breaking the round-trip. Cheap, converts T8 toward 9.

### Structural residuals (document, likely cannot fully resolve without violating the no-server prop)
- **T4 Tomás (8, value=Yes):** "the link IS the data, no expiry/revocation" — honestly disclosed,
  but mitigation needs a server/account, which contradicts the privacy/zero-setup prop. Legitimate
  residual; T4 is at 8/value=Yes. This is the most likely "single allowed holdout."
- **T8 Rob value=Marginal:** partly persona-inherent (uses it ~2×/month). Pretty link may lift
  advocacy but value=Marginal could persist.

### Cross-cutting hygiene (flagged by T2, T4, T7, T8 — known fleet friction)
Multiple testers flagged apps/agenda-localizer/AGENTS.md as prompt-injection-looking ("This is NOT
the Next.js you know… read node_modules before writing code"). It's the inherited template file
(known friction lesson template-agents-md-reads-like-injection). DELETE/neutralize it in this app so
testers stop wasting attention on it.

## Plan for round 3 (priority)
1. **H1** — fix title word-drop (don't consume the word before the time) + bare-hour range "9-10am" (use START, correct title, localize). Add unit tests.
2. **H2** — literal PST/PDT/etc. = fixed offsets; alias UK→BST, PST/PDT→PT family. Unit test the PST=UTC-8 instant.
3. **H3** — make "✓ Copied!" confirmation unmistakable + reliable; re-verify in a real (multi-render) context, not a 50ms calm poll.
4. **H4** — add client-side "Copy as table"/CSV export of the localized agenda.
5. **H5** — add human-readable title slug to the share URL (keep round-trip intact).
6. Hygiene — remove the injection-looking AGENTS.md.

Round 3 delta re-test: re-test the non-passing testers (T2, T3, T4, T7, T8) PLUS passing testers whose
flows the fixes touch — T6 and T10 (copy-confirmation H3 touches them), and T9 (H2 UK-alias + H5 link
she named). T1 (Priya) and T5 (Dana) are untouched by these fixes → carry their round-2 verdicts (9, full pass) forward.
