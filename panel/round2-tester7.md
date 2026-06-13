---
tester: 7
name: Aisha
clarity: Yes
value: Yes
advocacy: 8
prior_concerns_addressed: Yes
---

Re-checking my round-1 blockers first, one by one:

1. Header/note lines scolded as failed times — FIXED. "Day 1 — Design Community Summit"
   now renders as a muted italic header row above the cards; "Coffee break", "TBD closing
   remarks", and "lunch" render as muted italic note rows, interleaved in the right
   position. Nothing is treated as a failed session. This is exactly the graceful handling
   I asked for, and the positioning is correct.
2. "2pm" rejected — FIXED. "2pm fireside chat" parsed cleanly to 2:00 PM UTC. Lowercase
   am/pm with no minutes works now.
3. Parse warnings leaking into the attendee view — FIXED. I opened the share link in a
   Tokyo context: zero "couldn't read a time" text (confirmed by reading the rendered body
   too). The shared view is clean and polished. Bonus: a considered "+1 day" badge appears
   on times that cross midnight (16:00 UTC → 1:00 AM Tokyo +1 day) — that prevents the
   exact "wait, what DAY is that?" DM. That's real craft.

The empty state is also upgraded and considered: the textarea placeholder teaches the
format ("9:00 AM PT — Keynote", "9:00-9:45 AM PT Workshop") and the empty preview panel
says "Paste an agenda on the left… Example: Session 3 — 16:00 UTC." Good teaching moment.

Where craft still slips — and this is what keeps me off a 9:

- TIME-RANGE PARSING IS BROKEN, and it's visible to attendees. "9-10am hallway track" came
  out as a card titled "9 hallway track" timed at 10:00 AM UTC. Two bugs in one row: the
  parser grabbed the END of the range (10am) instead of the start (a session starts at 9,
  not 10), and it surgically removed "-10am" from the MIDDLE of the string leaving a
  dangling "9" in the title. An attendee sees "9 hallway track" — looks like a typo on a
  page I'm trying to make look polished. Worse: the empty-state placeholder literally
  advertises "9:00-9:45 AM PT Workshop" as a supported format, so the app is promising
  something it mangles. Either parse ranges properly (use the start time, strip the whole
  "9-10am" token) or don't advertise the format.
- "fireside chat" / "hallway track": once the leading time token is stripped, the title
  loses its leading capital context. Minor, but "fireside chat" lowercase as a card title
  reads slightly unpolished next to "Opening Keynote".

VALUE: Yes, unchanged and now stronger. Today I hand-build a FigJam table or Notion toggle
with a TZ-converter tab open, and still field "what time is that for me?" DMs. This kills
that loop with one link, working .ics/Google Calendar buttons, AND the +1-day badge that my
manual table never gave me. Real recurring work, multiple times a week during event cycles.

ADVOCACY 8: All three of my round-1 blockers are genuinely fixed and the attendee view is
now trustworthy. I'd recommend it. The only thing keeping it off a 9 is the range-parsing
bug ("9 hallway track") — because it's wrong AND visible to attendees AND the app advertises
that very format. Fix ranges and this is a tool I bring up unprompted in design Slacks.

```json
{"tester": 7, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Time-range '9-10am hallway track' parses wrong: title becomes '9 hallway track', time uses the END (10am) not the start — and this shows in the attendee view", "Empty-state placeholder advertises '9:00-9:45 AM PT' as a format but the range parser mangles it", "Stripped-time titles lose leading-cap polish ('fireside chat')"], "priorConcernsAddressed": "all"}
```
