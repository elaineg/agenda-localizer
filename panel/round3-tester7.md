---
tester: 7
name: Aisha
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: Yes
---

Re-checking my ONE round-2 blocker first — time-RANGE parsing — head on.

FIXED. I pasted the exact case that burned me: `9-10am hallway track`. It now renders as a
card titled "hallway track" (no dangling "9", no mangled title), timed off the START (9:00),
with the full range shown: "9:00 AM–10:00 AM UTC", localizing to 6:00 PM Tokyo. That is
exactly the fix I asked for. The other range shapes also land:
- `9:00–9:45 AM PT Onboarding Workshop` (en-dash) → title clean, start used, +1-day badge
  in Tokyo. Correct.
- `2-3pm fireside chat` → "2:00 PM–3:00 PM UTC", start used. Correct.
I opened the share link in a fresh Berlin context: zero warning/error leak, ranges render
identically, attendee view is clean and polished. And the empty-state placeholder no longer
false-advertises a range format (now "Session 3 — 16:00 UTC"), closing my other nit.

CRAFT: the range rendering is genuinely considered — "6:00 PM – 7:00 PM (your time)" big and
blue, the source "9:00 AM–10:00 AM UTC" muted beneath, the +1-day badge on midnight-crossers.
This is the polish I judge hard for, and it holds up. I'd ship this attendee view.

ONE residual edge case (NOT a blocker, but it's why I'm at 9 not 10): `10:30-11:15am
Portfolio Critique` — ASCII hyphen with am/pm only on the SECOND half — collapses to a single
time and uses the END (11:15), dropping the start and the range. So the parser handles
`9-10am`, `2-3pm`, and en-dash `9:00–9:45 AM PT`, but not the "first half lacks am/pm + ASCII
hyphen" mix. An attendee on that one row sees the wrong start time. It's isolated and most
agendas won't hit it, but it's the same class of bug (wrong time, visible to attendees) that
held the score down, just rarer now.

VALUE: Yes, and stronger than round 2. Today I hand-build a FigJam table or Notion toggle with
a TZ-converter tab open and still field "what time is that for me?" DMs across the event track.
This kills that loop with one link, working .ics/Google Calendar buttons, the +1-day badge, and
now trustworthy range parsing. Real recurring work during event cycles — multiple times a week.

ADVOCACY 9: My blocker is fixed, the attendee view is trustworthy and polished, and I'd bring
this up unprompted in design Slacks during an event push. Not a 10 only because the one
hyphen+partial-am/pm range shape still picks the wrong time — fix that and it's a 10.

```json
{"tester": 7, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Edge case: '10:30-11:15am Portfolio Critique' (ASCII hyphen, am/pm only on 2nd half) collapses to a single time and uses the END (11:15), dropping start+range — wrong time visible to attendees on that row"], "priorConcernsAddressed": "all"}
```
