---
tester: 9
name: Elena
clarity: Yes
value: Yes
advocacy: 8
---

I opened the link on my phone between two meetings, which is exactly how a shared planning
link reaches me in real life.

**Clarity — Yes.** Headline "Your agenda, in everyone's timezone." plus the subhead "Paste
your sessions, share one link — each person sees their own local time." told me what this
is in well under 5 seconds. A sample agenda was already loaded, so I didn't have to think.
No signup wall, no "create account," no setup — which for me is the difference between
using a tool and closing the tab.

**Value — Yes.** Today I solve this by typing "(9am PT / 12pm ET / 5pm UK)" by hand into a
Google Doc or Slack message for every sprint ceremony across my 3-timezone team, and people
STILL mess up the math or paste a stale converter link. This kills that. I tested the real
flow: pasted sessions, hit "Copy share link," got a self-contained URL (data encoded in the
hash — no backend, nothing to break), opened it as a recipient on mobile, and every session
rendered in MY local time with the source time underneath. It even handled a mixed agenda
(UTC, PT, ET on different lines) correctly and flagged the one line with no time instead of
silently dropping it. The per-session "Add to Google Calendar" and "Download .ics" actually
work — the GCal link carried the correct UTC datetime (verified 16:00Z), and the .ics is a
valid VCALENDAR. That last bit is what saves my REPORTS time, not just me: they tap one
button and it's on their calendar in the right slot.

**Advocacy — 8.** I'd bring this up in my next "tooling that doesn't suck" Slack thread.
It's not a 9–10 because of two things that hit my exact use case:

Frictions (mobile / speed):
- On the EDITOR view at 375px, the localized preview sits entirely below the fold — I only
  saw the input box and buttons. The sender doesn't get the "oh, magic" payoff until they
  scroll. The preview is the proof; bury it and a hurried sender may not trust it before
  sharing. (Recipient view, the one that actually gets shared, is fine — preview is up top.)
- The whole agenda is encoded in the URL hash, so the share link is enormous. On mobile
  Slack/iMessage that looks sketchy/spammy and there's no title preview. I'd hesitate to
  paste a 600-char link into a channel without a word of context.
- No timezone label on the SENDER's source dropdown caught me for a second ("times in your
  agenda are in…") — fine once I read it, but my 30s budget noticed the pause.

Single highest-impact change: on the editor, show a collapsed one-line localized preview
(or the first session) ABOVE the fold on mobile, so the sender sees it works before they
copy. Bonus: shorten/prettify the share link (or add a short title) so it doesn't look like
spam when pasted into Slack.

```json
{"tester": 9, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["mobile editor preview is below the fold — sender doesn't see the proof before sharing", "share link is a giant URL-hash blob that looks spammy when pasted into Slack/iMessage"], "priorConcernsAddressed": "n/a"}
```
