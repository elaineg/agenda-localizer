---
tester: 8
name: Rob
clarity: Yes
value: Marginal
advocacy: 6
---

I'm Rob — freelance brand designer. I live in Figma/Photoshop and only occasionally schedule
a couple client review calls and the odd creator-community workshop across timezones. My
honest baseline: "I could just type the times out myself in 4 minutes," and I'm cheap.

**Clarity — Yes.** Cold load, ~5s, I got it. The headline "Your agenda, in everyone's
timezone." plus the subline "Paste your sessions, share one link — each person sees their
own local time" told me exactly what it is and who it's for. The pre-filled sample with a
live localized preview on the right sealed it — I didn't have to guess. No confusion.

**Value — Marginal (leaning useful, but low frequency for me).** I pasted my real mixed
schedule: "Acme rebrand — 10:00 AM PT", "Bluebird packaging — 2:00 PM ET", "workshop —
18:00 UTC". It correctly parsed the inline zone on each line (didn't force one source tz)
and converted all three into my LA local time, with the original time kept underneath as a
sanity check. That's genuinely the fiddly part I'd otherwise do by hand or in a converter
tab, and it caught it per-line, which impressed me. The killer feature is the share link:
my client opens it and sees THEIR local time, no math, no "wait, is that my 2pm?" — that's
the value over me typing out a table.

But: I do this maybe twice a month. For a single call I'd still just type "2pm ET / 11am
PT" in Slack — faster than opening a tab. The win only shows up for the multi-session
workshop with an audience in several zones. So real but occasional.

**Advocacy — 6.** I'd mention it to a peer who runs community events, not unprompted to
everyone. What holds it back from an 8+:
1. **No add-to-calendar / .ics.** I checked — there's no "Add to calendar" anywhere. For a
   review CALL, the thing people actually want is it landing in their calendar at the right
   time. Without that, my client still has to manually create the event. This is the gap.
2. The share link is a giant `#eyJ...` base64 hash. It works, but pasting that monster into
   a client email looks sketchy/unprofessional — I'd worry a client thinks it's spam.
3. Colons in titles get stripped: "Client review: Acme" rendered as "Client review Acme".
   Cosmetic, but I noticed.

No console errors. Copy verified visually (button flipped to "✓ Copied!"); clipboard read
also returned the URL fine in my run. Shared link round-tripped and showed all sessions.

**Highest-impact change:** add an "Add to calendar" (.ics + Google Calendar) button per
session on the shared view. That turns it from a pretty read-only table into something my
clients actually act on, and it's the one thing that beats me typing times by hand.

```json
{"tester": 8, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 6, "topComplaints": ["No add-to-calendar / .ics export — biggest gap for review calls", "Share link is an ugly long base64 #hash, looks unprofessional in a client email", "Colons in session titles get stripped (cosmetic)"], "priorConcernsAddressed": "n/a"}
```
