---
tester: 7
name: Aisha — Product designer (judges craft hard)
in_audience: yes
round1: 8
round2: 8
clarity: Yes
value: Yes
prior_concerns_addressed: some
---

Re-checking my carried round-1 blocker FIRST:

BLOCKER (carried): "no-time rows demoted to faint italic, no inline 'add time' affordance,
a real session could be lost." STATUS: NOT FIXED. "PT Roadmap — Q3" and "Coffee break"
still render as faint grey italic rows. In the CREATOR view they at least say
"no time — not exported" (honest). But in the ATTENDEE view they are bare floating italic
titles between cards — no card, no border, no label, no "skipped" hint at all. As an
attendee I cannot tell whether "PT Roadmap — Q3" is a real session I'm missing or a stray
line. There is STILL no inline "add time" affordance anywhere, on either view. A genuine
session with a forgotten time silently drops out of the .ics and the attendee never knows.
This is the exact failure I flagged, and it's the one thing keeping me off a 9.

Builder's THREE stated changes — all verified working, real craft:
1. Detected source tz snaps the override selector + travels in the link + shows in the
   attendee header. CONFIRMED: pasted "Summit 2026 — All times PT" → banner "Detected source
   timezone: PT — from 'Summit 2026 — All times PT'", selector snapped to PT, and the Tokyo
   attendee header reads "Source timezone: PT / Times shown in your timezone: Asia/Tokyo".
   Every indicator AGREES — NO "UTC" lie anywhere. This is the trust fix and it's solid.
2. Title stripping is correct: "10:00 AM PT Opening Keynote" → "Opening Keynote", while
   "PT Roadmap — Q3" KEEPS its PT. Exactly the behavior promised. .ics SUMMARYs are clean
   ("Opening Keynote", not the raw time prefix).
3. Embedded/parenthetical tz detection works ("All times PT" inside a header line is caught).

Other craft I liked: sessions pasted OUT OF ORDER (Lunch, Keynote, Roadmap, Workshop) sort
ascending in both views. The "+1 day" badge on 10AM PT → 2AM Tokyo is a considered touch
that kills the "wait, what DAY?" DM. Combined .ics = 3 correct VEVENTs (10AM PT = 17:00Z).
The "Source timezone (times in your agenda are in…)" relabel when no tz is detected, and the
disabled "Copy as table", show someone thought about states.

Craft slips that hold it at 8 (besides the blocker):
- ALL-NO-TIMES error state (garbage paste) shows three ghost "no time — not exported" rows
  and NO friendly "we couldn't find any times — try '10:00 AM PT Keynote'" guidance. Missed
  teaching moment, and "Copy share link" stays primary-blue/active when nothing's exportable.
- Mobile 375px: "(your time)" wraps to its own line and card titles truncate ("Workshop:
  Build…") because the two buttons crowd them. Functional, slightly unpolished.

CLARITY: Yes. Headline "Your agenda, in everyone's timezone" + "share one link — each
person sees their own local time" tells me what and who in 5 seconds.
VALUE: Yes. Today I hand-build a FigJam table or Notion toggle with a TZ converter open and
still field "what time for me?" DMs across my event track. One link + working .ics + the
+1-day badge kills that loop. Recurring during every event cycle.

ADVOCACY 8: All three stated fixes landed and the attendee view is trustworthy and clean.
But the no-time row — my carried blocker — is still a faint ghost with no add-time
affordance and, in the attendee view, no "skipped" label at all. Until a missing time can't
silently drop a real session (inline add-time, or at minimum an attendee-visible "no time
set" tag), I won't bring it up unprompted in design Slacks at a 9. Fix that and it's a 9–10.

```json
{"tester": 7, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Carried blocker NOT fixed: no-time rows ('PT Roadmap — Q3') still faint italic with no inline add-time affordance; in the ATTENDEE view they're bare floating text with no 'not exported'/'no time set' label, so a real session can silently vanish from the .ics", "All-no-times/garbage state has no friendly 'no times found — try this format' guidance; Copy share link stays active when nothing is exportable", "Mobile 375px: '(your time)' wraps and card titles truncate because the two action buttons crowd them"], "priorConcernsAddressed": "some"}
```
