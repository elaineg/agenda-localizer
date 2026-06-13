# Panel SYNTHESIS — agenda-localizer — Round 1

Preview tested: https://agenda-localizer-iyj1f0v5d-elainegao.vercel.app (commit b3303d0)
Date: 2026-06-12. All 10 roster personas, parallel.

## Score table
| # | Persona | Clarity | Value | Advocacy | Fully passes (≥9 + Y/Y)? |
|---|---------|---------|-------|----------|--------------------------|
| 1 | Priya (backend eng) | Yes | Marginal | 7 | no |
| 2 | Marcus (frontend eng) | Yes | Yes | 8 | no |
| 3 | Wen (data analyst) | Yes | Marginal | 6 | no |
| 4 | Tomás (ops analyst) | Yes | Marginal | 6 | no |
| 5 | Dana (demand-gen mktr) | Yes | Marginal | 5 | no |
| 6 | Jules (community mktr) | Yes | Marginal | 6 | no |
| 7 | Aisha (product designer) | Yes | Yes | 8 | no |
| 8 | Rob (freelance designer) | Yes | Marginal | 6 | no |
| 9 | Elena (eng manager) | Yes | Yes | 8 | no |
| 10 | Sam (PM) | Yes | Yes | 8 | no |

**Fully passing: 0/10.** Clarity unanimous Yes — the 5-second story works. The gap is entirely
execution on the product's heart (the parser) plus trust/polish. No one is confused about what
it's for; they don't yet trust/enjoy it enough to advocate.

## Frictions grouped by cause

### G1 — PARSER TOO STRICT — the dominant, recurring blocker (T2, T5, T6, T7, T10, T1)
The spec scoped only `HH:MM`+tz, but real pasted schedules use bare-hour and informal times.
The "paste your messy real schedule and it just works" promise is failing on common input.
- Bare-hour am/pm NOT parsed: "8pm" (T2), "6pm"/"7 PM"/"9am" (T6), "2pm" (T7), "9am"/"4 PM ET" (T10), "noon CET" (T1). **5+ personas.**
- Heading/title/note lines with no time ("Day 1 — Summit", "lunch", "TBD", a date/section header) are flagged as BROKEN sessions with a yellow "Couldn't read a time" warning (T7, T10, T2). They should render as section headers/notes, not errors.
RECUR: yes, strongest signal in the round. This is THE fix.

### G2 — Parse warnings LEAK into the shared/attendee view (T2, T7, T10)
The creator's yellow "Couldn't read a time" warning cards persist on the polished attendee
view — "looks broken to viewers," "exactly what would stop me hitting send in Discord." The
shared/growth surface must be clean. Warnings are creator-only feedback.
RECUR: yes (3 personas, all value=Yes high-advocacy ones — this is blocking 8→9).

### G3 — Timezone correctness / trust bugs (T5, T3, T1)
The worst class for a time tool — confidently wrong output destroys trust:
- Inline per-line tz code ignored: "9:00 AM SGT" rendered as UTC (off by hours) and "SGT" leaked into the title (T5). SGT/JST/etc. either unrecognized-and-silently-treated-as-source, or not surfaced as a conflict.
- Silent +1-day rollover with no indication when local time crosses to a different calendar day (T3, also Wen's #1 trust ask).
- PST/PDT literal handling questioned (T3 "PST off-by-one"); "noon CET" failed (T1).
FIX: (a) expand tz-abbreviation table (SGT and other common business zones); (b) when a line carries a tz token that isn't recognized or conflicts with the source dropdown, FLAG it rather than silently using source tz; (c) show a "+1 day"/"−1 day" date badge on any session whose localized time lands on a different calendar day; (d) confirm literal standard/daylight offsets.
RECUR: partial but high-severity (trust is existential for this category; Wen/Dana are in-ICP).

### G4 — Calendar export not discoverable on the CREATOR preview (T1, T8)
6 testers found+used the Google Calendar/.ics links (they work, on the SHARED view). But T1 and
T8 concluded "no calendar export" because the creator-side localized preview doesn't surface
add-to-calendar. Surface the same per-session calendar links in the creator preview.
RECUR: 2 personas; cheap; removes a false "half a tool" perception.

### G5 — Privacy story invisible (T4, also reassures Wen/Tomás class)
Data lives client-side in the URL hash and nothing is POSTed (Priya verified in network tab),
but the UI never says so. Tomás (in-ICP, wary of pasting company schedules) is blocked on this.
FIX: one plain-language line — "Runs entirely in your browser; nothing is uploaded — your agenda travels inside the link itself," plus a note that the share link contains the full agenda.

### G6 — Mobile editor: localized preview below the fold (T9)
On mobile the sender can't see the localized proof before copying. Show a collapsed localized
preview above the fold on mobile so the sender sees it works before sharing.

### G7 — Title-extraction edge cases (T2, T5, T8) — polish
Trailing "@" left in a title (T2); tz code "SGT" leaks into title (T5); colons stripped from
titles like "Workshop: Building" (T8 — currently by-design per spec, but reads as a bug).
Reconsider stripping colons; strip trailing separators/tz tokens cleanly.

### Single-persona / lower-priority
- Ugly base64 `#hash` share URL "looks spammy/unprofessional" pasted in Slack/email (T8 low-freq, T9 still gave 8). Hard to fully fix (state must live in URL); defer unless cheap (a shorter/cleaner encoding or a note).
- Share link only writes to URL on Copy; Priya lost an edit once (T1). Minor — consider live-updating the hash as you type, or clarify.

## Plan for round 2 (priority order)
1. **G1** — make the parser lenient: bare-hour am/pm ("8pm","9am","4 PM ET","11 p.m."), "noon"/"midnight"; treat timeless lines as section headers/notes, NOT errors. (THE fix.)
2. **G2** — never show parse warnings on the shared/attendee view (creator-only).
3. **G3** — tz correctness/trust: expand abbreviation table (SGT+), flag unrecognized/conflicting tz tokens instead of silently using source, add a "+1 day" date-cross badge, confirm PST/PDT/CET literals.
4. **G4** — surface per-session add-to-calendar in the creator preview.
5. **G5** — add the plain-language privacy line + share-link-contains-agenda note.
6. **G6** — mobile: localized preview above the fold.
7. **G7** — title-extraction cleanup (trailing tokens; reconsider colon stripping).

Round 2 = re-test ALL 10 (none fully passed; the parser + warning-leak fixes touch every tester's flow).
