---
tester: 2
name: Marcus
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: Yes
---

Round-3, re-checking the ONE blocker that held me at 8 in round 2: the parser was eating the
last word of a title that sat right before the time. I pasted a real launch-week agenda built
specifically to hit it — titles ending in product nouns right before the time:

```
Live Coding: Build with our SDK 11:30am PT
Panel on DX 2pm PT
A talk that ends in API 3pm PT
Office Hours on the CLI 4:30pm PT
Closing party — 8pm PT
broken line no time here
```

**Blocker FIXED.** Every trailing word survives, in BOTH views:
- Editor preview: "Live Coding: Build with our SDK", "Panel on DX", "A talk that ends in API",
  "Office Hours on the CLI". SDK / DX / API / CLI all intact — exactly the words that vanished
  last round.
- Attendee view (opened the share link in an Asia/Tokyo context): identical, all four product
  nouns present, "3:30 AM (your time) +1 day / 11:30 AM PT" stack correct. This is the half of
  my titles that would have silently lost a word in front of my whole team — it's solid now.

Everything I praised before still holds: the "broken line no time here" junk line renders as a
quiet gray italic note in author AND attendee view (no scary warning card leaking to viewers),
per-session "Add to Google Calendar" / "Download .ics", clean viewer header ("Agenda / Source
timezone / Times shown in your timezone"). Zero console errors in editor or Tokyo viewer.

**CSS polish:** genuinely good. The "Copy share link" button flips to a green "✓ Copied! / Link
copied — paste it anywhere" state — clear feedback, no jank. Consistent card spacing, right type
hierarchy, blue (your time) + muted source-time line + orange "+1 day" badge is the correct info
density. Mobile (375px) collapses to "+2 more / See all" sensibly. Nothing janky to flag.

**Why 9 not 10:** the title-drop fix earns the 9 — I'd now drop this in our team Slack unprompted
for launch week. What keeps it off a 10 is purely nice-to-have: I'd love a one-click "set source
TZ to PT" instead of hunting the dropdown (I left it on UTC by accident once), and an at-a-glance
"viewers see THEIR time" reassurance line near the copy button so a teammate trusts the link
before clicking. Neither is a defect — the core job is done well.

Blocker status: FIXED. No remaining blockers.

```json
{"tester": 2, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Minor: source-timezone is a plain dropdown, easy to leave on wrong default (left on UTC by accident)", "Minor: no reassurance line near Copy button telling the author that viewers auto-see their own local time"], "priorConcernsAddressed": "all"}
```
