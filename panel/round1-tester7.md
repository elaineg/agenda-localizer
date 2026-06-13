---
tester: 7
name: Aisha
clarity: Yes
value: Yes
advocacy: 8
---

I run a design-community event track across timezones, so the headline did its whole job in
about three seconds: "Your agenda, in everyone's timezone." plus "Paste your sessions, share
one link — each person sees their own local time." That is exactly my pain, named in my words.
No jargon, no hero illustration covering the fold. I knew what it was and that it was for me
before I scrolled.

Craft, judged hard — and it mostly holds up. The two-pane paste→preview layout is clean,
the session cards have calm spacing and a sensible hierarchy (bold title, big colored "your
time", muted source time underneath). The blue accent is restrained. The "4 sessions · 1 line
needs a time" counter is a genuinely considered touch — it tells me at a glance the parse
worked and flags what didn't, in the same breath. The attendee view (I opened the share link
in a Tokyo context) is the real test, and it passed: 16:00 UTC correctly became 1:00 AM, the
"Times shown in your timezone: Asia/Tokyo" chip makes it feel honest, and per-session "Add to
Google Calendar" + "Download .ics" both produced correct, valid files. That is trustworthy
enough to put in front of attendees.

Where the craft slips — and these are exactly the things that make me hesitate to advocate
LOUDLY:

1. The "couldn't read a time" warning is too eager and not smart enough about intent. My title
   line "Day 1 — Design Community Summit" got scolded with "Couldn't read a time — add a time
   like `16:00 UTC`." A header is not a failed session; treating it like one is clumsy and
   makes a clean agenda look broken. Same for "lunch" and "TBD closing remarks" — those are
   intentional no-time rows, not errors.
2. Natural time formats fail. "2pm fireside chat" was rejected outright. Real people paste
   "2pm", "9-10am", "noon". If I have to rewrite my notes into `2:00 PM PT` first, the tool is
   making me do the work it promised to remove.
3. The author's parse warnings LEAK into the attendee view. An attendee opening my link should
   never see "just some words with no time — Couldn't read a time." That's my mess showing on a
   page I'm trying to make look polished and considered. Hide unparsed lines (or render them as
   plain notes) in the shared view.
4. Minor: no per-event timezone abbreviation context next to the converted time in cards on the
   editor side, and the empty state is fine but plain ("Paste an agenda on the left…").

VALUE: Yes. Today I hand-build a FigJam table or a Notion toggle with a manual TZ-converter tab
open, and inevitably someone DMs "wait, what time is that for me?" This kills that loop with one
link plus working calendar buttons. That's real recurring work — every event cycle, multiple
times a week during planning.

ADVOCACY 8: I'd recommend it, but with a caveat sentence ("just write times as `2:00 PM PT`"),
and that caveat is what keeps it off a 9. Fix the lenient parsing + the warning leaking into the
attendee view and this becomes a tool I bring up unprompted in design-community Slacks.

Single highest-impact change: stop scolding non-session lines and accept natural formats —
treat header/note lines (and "2pm") gracefully, and never surface parse warnings in the
shared attendee view.

```json
{"tester": 7, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Title/note lines like 'Day 1 — Summit', 'lunch', 'TBD' get a 'couldn't read a time' error — headers aren't failed sessions", "Natural formats like '2pm' rejected; forces me to rewrite notes into '2:00 PM PT'", "Author's parse warnings leak into the polished attendee/share view"], "priorConcernsAddressed": "n/a"}
```
