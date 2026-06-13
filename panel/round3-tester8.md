---
tester: 8
name: Rob
clarity: Yes
value: Marginal
advocacy: 8
prior_concerns_addressed: Partly
---

I'm Rob — freelance brand designer, in Figma/Photoshop most of the day, scheduling client
review calls and the odd creator-community workshop across timezones maybe twice a month.
Baseline: "I could type the times into Slack in 4 minutes." Re-tested cold on desktop.

**My ONE remaining round-2 blocker was the ugly base64 share link.** Verdict: PARTLY fixed.

I pasted my real agenda — two "Client review:" calls and a "Creator workshop:" — copied the
share link and looked at it. What changed:
- The link now carries a **readable date prefix**: `…/#2026-06-18.eyJ0ZXh0Ijoi…`. The brief
  said it would get a "human-readable title slug" — it's the DATE, not the title, so a client
  can't tell which call it is from the URL.
- It's still **320 chars of base64** after that prefix. Honestly still not something I'd drop
  raw into a client email — it still reads a bit like a phishing string.
- BUT there's now a clear explainer under the buttons: "Runs entirely in your browser;
  nothing is uploaded — your agenda travels inside the link itself. The share link contains
  your full agenda." That genuinely lowers my guard — it explains WHY the link is long, so
  I'd be more comfortable forwarding it (or pasting it behind a "View agenda" hyperlink).
  That's the difference between "looks like malware" and "long but legit." Real progress.

**Colons + calendar export — still solid (re-confirmed).** Preview renders "Client review:
Acme rebrand" with the colon. Google Calendar link carries `text=Client+review:+Acme+rebrand`
intact. Each session has a working "Download .ics" (`data:text/calendar` anchor, valid
VCALENDAR) and "Add to Google Calendar". No console errors. Copy button fired and returned
the full link in clipboard; label flipped to "✓ Copied!".

**Clarity — Yes.** "Your agenda, in everyone's timezone" + live prefilled preview. 5 seconds.

**Value — Marginal (real, but ~2x/month for me).** Per-line zone parsing is correct and the
.ics export is what makes a client actually land in their calendar. For a single 1:1 I'd
still just type it in Slack; for the multi-zone workshop the share link + calendar buttons
earn their keep. Low personal frequency caps it, not quality.

**Advocacy — 8 (held).** The explainer text meaningfully softened my objection, but the
promised title slug didn't land — it's a date, and the link is still a 320-char base64 blob.
That's the one cosmetic between 8 and 9: hyperlink it behind clean anchor text, OR put the
session title (not just date) in the slug, and I'd forward it to a paying client without a
second thought. I'd still recommend it unprompted to peers running community events.

Copy verified visually; clipboard read worked in my run. No console errors.

```json
{"tester": 8, "round": 3, "clarity": "Yes", "value": "Marginal", "advocacy": 8, "topComplaints": ["Promised title slug is actually just a date prefix; link still a 320-char base64 blob, not client-email-ready raw", "Low personal frequency (~2x/month) caps value for me, though the tool is solid"], "priorConcernsAddressed": "some"}
```
