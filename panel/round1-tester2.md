---
tester: 2
name: Marcus
clarity: Yes
value: Yes
advocacy: 8
---

I'm a frontend eng who posts our launch-week livestream schedule in a public Discord. The
single problem I have is people asking "wait, what time is that for me?" This nails it.

**Clarity (Yes).** Five seconds, done. "Your agenda, in everyone's timezone." + "Paste your
sessions, share one link — each person sees their own local time." I knew exactly what it is
and that it's for me. The pre-loaded sample with PT/ET/UTC mixed and a `1 line needs a time`
counter is a great cold-open — it shows the parser working before I type anything.

**Value (Yes).** Today I hand-build a UTC table and tell people to Google "what time is X in
my zone." This replaces that with one link. I pasted my real messy agenda (date headers,
mixed PT/EST/UTC, a range, a malformed line), set source TZ, hit Copy share link, opened it
in a Tokyo context and the times were correct (9AM PT keynote → 1AM JST, midnight wrap
handled). Per-session "Add to Google Calendar" + "Download .ics" on the shared view is the
thing that makes me actually drop this in Discord — attendees can one-click it. I checked the
GCal/ICS payloads: DTSTART is UTC `Z`, so they're timezone-safe. Genuinely good.

**Parser/polish frictions (these capped me at 8, not higher):**
- `Closing party — 8pm` → "Couldn't read a time." `8pm` is the single most common way a normal
  person writes a time. If the parser chokes on that, real attendees' agendas will throw
  warnings. Biggest one.
- `Community Demo Day @ 18:00 UTC` → title rendered as **"Community Demo Day @"** with the
  trailing `@` left in. The `@` was the delimiter; strip it. Looks sloppy on the shared view.
- `Launch Week 2026` (my title line) got flagged as a session that "needs a time." It's clearly
  a heading. False-positive warnings make the parser feel dumber than it is.
- **The parse-failure warning cards LEAK INTO THE ATTENDEE/SHARED VIEW.** When I opened the
  link as an attendee, "broken line no time here" and "Launch Week 2026 — Couldn't read a
  time" showed as yellow warning cards. Those are author-only editing hints; an attendee
  seeing them thinks the schedule is broken. On the shared view, just silently drop unparsed
  lines (or show them as plain text notes, no scary yellow).

CSS polish on the shared view is otherwise clean — consistent card spacing, good type
hierarchy, no jank, responsive on mobile, zero console errors in either context. That's the
part I judge hardest and it held up.

**Single change that most raises my advocacy:** hide parse-failure warnings on the
shared/attendee view (and fix `8pm`). The day an attendee opens my link and sees a yellow
"Couldn't read a time" box, I look like I shipped something broken — that's what stops me
from hitting send in Discord.

```json
{"tester": 2, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Parse-failure warning cards leak into the attendee/shared view — looks broken to viewers", "Common time formats fail: `8pm` not parsed; trailing `@` left in title", "Heading line 'Launch Week 2026' false-flagged as a session needing a time"], "priorConcernsAddressed": "n/a"}
```
