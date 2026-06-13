---
tester: 8
name: Rob
clarity: Yes
value: Marginal
advocacy: 8
prior_concerns_addressed: Partly
---

I'm Rob — freelance brand designer, in Figma/Photoshop all day, scheduling client review
calls and the odd creator-community workshop across timezones maybe twice a month. Baseline:
"I could type the times out in Slack in 4 minutes." Re-tested cold on desktop.

**Re-checking my three round-1 blockers:**

1. **No add-to-calendar / .ics — FIXED.** This was my highest-impact ask and it's done right.
   Every session card now has "Add to Google Calendar" and "Download .ics". I downloaded the
   Acme one: valid VCALENDAR, `DTSTART:20260613T170000Z` correctly = 10:00 AM PT,
   `SUMMARY:Client review: Acme rebrand`, 1-hour default. This is the thing that turns it from
   a read-only table into something my client actually clicks and lands in their calendar.
   That's the change that beats me typing "2pm ET / 11am PT" by hand.

2. **Colons stripped from titles — FIXED.** "Client review: Acme rebrand" and "Creator
   workshop: timezone deep-dive" both render WITH the colon now, and the colon survives into
   the .ics SUMMARY. Clean.

3. **Ugly base64 `#hash` share link — NOT fixed.** Copy link still hands me a 285-char
   `https://…/#eyJ0ZXh0Ijoi…` monster. It works and round-trips, but I still wouldn't paste
   that into a client email — it reads like phishing. A short URL or a "this stays in your
   browser, here's a clean link" treatment would close this.

**Clarity — Yes.** Same strong cold open: "Your agenda, in everyone's timezone" + the live
prefilled preview. Got it in 5 seconds.

**Value — Marginal (real but low-frequency for ME).** The per-line zone parsing is right:
Acme 10am PT and Bluebird 2pm ET correctly resolve to 10:00 and 11:00 in my LA time. The .ics
export is what I wanted. For a single 1:1 call I'd still just type it in Slack — but for the
multi-zone workshop, share link + per-session calendar buttons genuinely save me effort.
Honestly occasional for me, but the tool earns its keep when I do use it.

**Advocacy — 8.** Up from 6. The calendar export landed and colons are fixed — the two
functional gaps are gone, so I'd now bring this up to peers who run community events without
being asked. Not a 9/10 only because of the share-link cosmetics: that ugly hash is the one
thing standing between "useful tool I mention" and "thing I'd confidently forward to a paying
client." Fix the link presentation and this is a 9.

Copy verified visually (button click fired, link returned in clipboard fine in my run).
No console errors. .ics download is a `data:` anchor — opens correctly for a real click.

```json
{"tester": 8, "round": 2, "clarity": "Yes", "value": "Marginal", "advocacy": 8, "topComplaints": ["Share link is still an ugly 285-char base64 #hash — looks like phishing in a client email", "Low personal frequency (~2x/month) caps the value for me, though the tool is solid"], "priorConcernsAddressed": "some"}
```
