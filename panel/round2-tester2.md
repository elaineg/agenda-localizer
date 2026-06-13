---
tester: 2
name: Marcus
clarity: Yes
value: Yes
advocacy: 8
prior_concerns_addressed: Yes
---

Round-2 re-check of my four round-1 blockers — pasted a real launch-week agenda with a
heading line, `9am`/`8pm`-style times, a `@ 18:00 UTC` line, and a junk line, then opened the
share link in a Tokyo context.

**All four round-1 blockers FIXED:**
- `Closing party — 8pm PT` now parses → "8:00 PM PT", localizes correctly to 12:00 PM +1 day
  JST. The single most common time format finally works.
- `Community Demo Day @ 18:00 UTC` → title is now clean "Community Demo Day", no trailing `@`.
- `Launch Week 2026` heading no longer false-flagged as a session needing a time — it renders
  as a muted italic header line. Correct.
- **The big one: parse-failure cards NO LONGER LEAK into the shared/attendee view.** "broken
  line no time here" shows as a quiet gray italic note (author view AND Tokyo viewer), not a
  scary yellow "Couldn't read a time" card. This was the thing that stopped me hitting send in
  Discord, and it's done. Viewer header is clean: "Agenda / Source timezone / Times shown in
  your timezone." Zero console errors in author or viewer, clean on 375px mobile too.

**CSS polish:** genuinely good. Consistent card spacing, clear type hierarchy, the blue
"(your time)" + original-zone subtitle + orange "+1 day" badge is exactly the right info
density. Per-session "Add to Google Calendar" / "Download .ics" still present on the shared
view — that's the feature that makes me actually drop the link in Discord. Nothing janky.

**NEW issue that keeps me at 8, not 9:** the parser eats the LAST WORD of a title before the
time. I pasted `Live Coding: Build with our SDK 11:30am PT` and the card title rendered as
"Live Coding: Build with our" — "SDK" vanished. Reproduced cleanly: `Panel on DX 2pm PT` →
"Panel on", `A talk that ends in API 3pm PT` → "A talk that ends in". It's swallowing the
trailing title word into the time token. For me that's not cosmetic — half my livestream
titles end in a product noun (SDK, API, CLI) and they'd silently lose it in front of my whole
team. That's a "looks broken" moment, same category as last round's warning leak.

**Single change to get me to 9:** stop dropping the last title word before the time. Fix that
and this is a tool I bring up unprompted in our team Slack.

```json
{"tester": 2, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Parser drops the LAST word of a title before the time: 'Build with our SDK 11:30am' -> title 'Build with our' (SDK lost); reproduced with DX/API too", "Otherwise no blockers remain"], "priorConcernsAddressed": "all"}
```
