# Panel SYNTHESIS — Round 5 (run 20260617-205623-daily)

App: agenda-localizer (local prod build, http://localhost:3022)
Feature under test: one-click "📅 Download all sessions (.ics)" combined add-to-calendar button
on creator preview AND shared attendee view (desktop + mobile). PLUS the round-4 P0 date fix.

## Per-tester results

| # | Persona | Role | Audience | Clarity | Value | Advocacy R5 | Advocacy R4 | Δ |
|---|---------|------|----------|---------|-------|-------------|-------------|---|
| 1 | Priya | Senior backend eng | IN | 9 | 8 | 8 | 8 | 0 |
| 2 | Marcus | Frontend eng | IN | 9 | 9 | 9 | 5 | +4 |
| 3 | Wen | Marketing data analyst | IN | 9 | 8 | 8 | 4 | +4 |
| 4 | Tomás | Ops analyst | IN | 9 | 8 | 8 | 8 | 0 |
| 5 | Dana | Demand-gen marketer | IN | 9 | 9 | 9 | 9 | 0 |
| 6 | Jules | Community marketer | IN | 9 | 8 | 8 | 7 | +1 |
| 7 | Aisha | Product designer | IN | 9 | 8 | 8 | 8 | 0 |
| 8 | Rob | Freelance brand designer | NON-FIT (carried) | 9 | 5 | 6 | 5 | +1 |
| 9 | Elena | Eng manager | IN | 8 | 7 | 7 | 5 | +2 |
| 10 | Sam | Product manager | IN | 9 | 9 | 9 | 6 | +3 |

In-audience personas: 1,2,3,4,5,6,7,9,10 (9). Non-fit carried: 8 (Rob, low-frequency designer).
In-audience advocating at 9+: Marcus, Dana, Sam (3 of 9).

## Headline: the date P0 is RESOLVED — unanimous

All 10 testers independently confirmed the round-4 P0 is FIXED. Each pasted an agenda in their
own natural style, downloaded the combined .ics, and verified by hand that the calendar DAY is
now correct and that no date string leaks into the SUMMARY. Verified across every format the fix
claimed:
- ISO header dates (`2026-07-15`, `2026-06-23`) APPLY to following sessions (Wen's exact R4 break:
  "Webinar Series — 2026-07-15" → events now land on 07-15, not ~today). 
- Natural-language headers ("Wednesday, July 16", "Monday, June 22", "Mon Jun 23", bare "June 25")
  apply correctly.
- Inline per-session dates ("July 20 — …") apply AND are stripped from SUMMARY (Wen).
- Header-date carry across multiple day-blocks works (Elena's exact R4 carry case).
- DST/TZ math correct throughout (EDT/PDT/CEST/IST/SGT all spot-checked).
- The "No date found — add a date header line" warning fires on dateless agendas instead of a
  silent wrong-day export (Sam, Rob, Aisha confirmed).
- VEVENTs now carry a DESCRIPTION (Tomás confirmed); creator button always shows the
  "Imports into Google/Apple/Outlook" caption (Aisha confirmed — her R4 P1 fixed).

NO REGRESSIONS: localization (incl. +1-day badges), per-session links, hash-state share URL,
creator↔attendee byte-identical .ics, zero console errors / zero external network requests
(Priya, Tomás verified client-side claim). Discoverability remains an unambiguous pass.

Advocacy recovered from R4's 1/9 in-audience-at-9+ to 3/9, with the whole distribution lifting
(every cratered tester moved up: Marcus +4, Wen +4, Sam +3, Elena +2, Jules +1). The collapse was
indeed the single date P0; fixing it restored trust. But the bar (9+) is NOT met by the audience
majority — six in-audience personas sit at 7-8, each held there by a NEW, consistent class of
parsing defect surfaced once the date bug was gone.

## P1 — Title/time/header token-collision parsing (the new ceiling; named by 6 testers)

With dates fixed, the remaining friction is the parser mishandling messy real-world title lines.
This is the same "tool silently mangles my data" trigger that gates the data-hygiene personas.
Distinct failure modes, all on naturally-pasted input:
1. **Title em-dash/text swallowed into time-parse**: "Workshop — Figma Variables Deep Dive" exports
   as "Workshop Figma Variables Deep Dive" (Aisha); "Mystery Session at 3:00 PM" → SUMMARY
   "Mystery Session at" (Wen). The title's own punctuation/trailing words get eaten.
2. **Title word parsed as a timezone**: "6/26 3:30pm Retro" → "Retro" read as a TZ → "Unknown
   timezone 'RETRO'" warning + a session titled literally "6" (Elena).
3. **Time-less / title-only lines silently DROPPED**: "Friday Jun 26 — Community Game Night" (no
   time) and "Friday June 26 - 2pm Sprint Review" (promoted to a header) vanish from the list AND
   the .ics with no warning — testers got N-1 sessions and didn't notice until they counted
   (Jules, Elena). A community marketer / EM posts TBD/all-day items constantly.
4. **Title/series header line lumps everything under one date**: a leading "… — Week of June 22"
   title makes the on-screen preview group every session under that one header, so it LOOKS like
   all sessions are on the 22nd even though the .ics dates are correct — made Wen/Jules doubt the
   fix until they opened the file.

## P1 — Source-timezone default ignores stated/inline tz (named by Elena, Rob)

Source-tz dropdown defaults to UTC even when the agenda says "all times PT" or uses inline ET/PT
suffixes the parser otherwise honors. Elena's first natural paste was 7h off until she hand-picked
PT — "on my phone between meetings I could easily send a wrong-by-7h link." This is the next
silent-wrong-data risk after dates.

## P1 — No per-session parsed-DATE label on preview cards (Wen, Sam)

There's no way to audit what date each session resolved to without downloading and opening the
.ics. A parsed-date line on each card (like the existing source-time line) would let the
data-hygiene personas trust it without cracking the file — and would defuse the "lumped header"
confusion in P1.4.

## P2 / backlog (NOT to chase)

- Hardcoded 60-min VEVENT duration; no LOCATION field — wrong block length for 90-min sessions,
  no room for Teams/meeting link (Tomás). Caps time-save but not trust.
- Sessions not sorted chronologically — stay in paste order (Tomás).
- Mobile session titles truncate at 375px ("Opening Keynot…") (Dana).
- `download-all-ics-mobile` testid not rendered at 375px / on attendee view — desktop button shows
  instead; download works, so user-invisible, but the spec'd variant isn't firing (Dana, Elena).
- Date-header rendering inconsistent: ISO headers render raw "2026-06-25" while natural-language
  render styled "MON JUN 23"; creator humanizes, attendee shows raw (Marcus, Aisha).
- No "Copied!" toast on Copy share link (Priya, Sam); no "date applied: Sept 15" confirmation.
- No-date cards show a confident "3:00 AM (your time)" while warning "No date found" — contradictory (Aisha).

## ROUND VERDICT: FIX

The round-4 P0 is decisively resolved and advocacy recovered (1/9 → 3/9 in-audience at 9+), but the
audience-weighted bar (in-audience personas at 9+) is NOT met: six in-audience personas (Priya,
Wen, Tomás, Jules, Aisha at 8; Elena at 7) are held below 9 by a SINGLE crisp, fixable new class —
title/time/header token-collision parsing (P1) — that surfaced only once the date bug was gone.
This is NOT a structural ceiling (so not PARK): the holdouts are in-audience, named a concrete
defect, and several said they'd clear 9 once messy title lines parse cleanly and nothing is
silently dropped. It is also not the new feature's design — discoverability, the date fix, and the
combined .ics all PASS. Recommend ONE more builder fix loop focused on PARSER ROBUSTNESS:
(1) stop title text/punctuation leaking into the time/tz parse (em-dash, "Retro"-as-tz, trailing
"at"); (2) never silently drop a time-less or header-promoted line — keep it as an all-day/TBD
session or warn visibly; (3) honor a stated "all times PT" source-tz line / inline suffixes by
default; (4) add a per-session parsed-date label on the preview cards so a misparse is auditable
without opening the .ics. Fold P1 source-tz + date-label in. Re-run a panel round after the fix.

Note: Rob (non-fit, low-frequency designer) sits at 6 and explicitly attributes his hesitation to
his own usage frequency, NOT a defect ("the thing I complained about is fixed"); he does not gate.
