---
tester: 4
name: Tomás
clarity: Yes
value: Marginal
advocacy: 6
---

I run scheduling for a distributed ops team, so a tool that turns one agenda into
"everyone sees their own local time" is instantly legible. The H1 "Your agenda, in
everyone's timezone." plus the subhead and a pre-filled live preview told me what it does
in under 5 seconds. No login wall, no install — that alone clears my IT-blocks-everything
bar.

WHAT WORKED
- Pasted a real mixed-region all-hands (UTC + 9:00 AM IST + 3:30 PM CET + 11:00 AM PT). It
  correctly honored the per-line timezone instead of forcing the source dropdown — 14:00
  UTC → 7:00 AM PT, 9:00 AM IST → 8:30 PM PT. That half-hour offset (IST/CET) is exactly
  where I make mistakes by hand, and it nailed it.
- Share link copies cleanly (button flips to "✓ Copied!"). Opened it as a Tokyo attendee:
  read-only view, auto-detected Asia/Tokyo, 14:00 UTC → 11:00 PM with the original UTC
  shown underneath. Math correct.
- "Add to Google Calendar" is a real render-template link; "Download .ics" produced a
  valid VEVENT (DTSTART in UTC). Both work. That's the part my attendees actually need.

WHAT HOLDS ME BACK (the wariness problem)
- I paste INTERNAL schedule details. The whole reason I'd trust this is the no-server
  claim — and there is NO such claim anywhere on the page. I had to inspect the share URL
  myself to discover the data is encoded in the `#fragment` (so it never hits the server).
  A non-technical colleague would never know that, and even I want it stated. One line —
  "Runs entirely in your browser. Nothing is uploaded or stored." — would flip this from
  Marginal to Yes for me.
- Counterpoint that worried me: the share link IS the data. Anyone with the link decodes
  the full agenda. For a public webinar that's fine; for an internal all-hands with room
  names / project codenames, a forwarded link leaks everything. No expiry, no "this link
  contains your agenda" warning.
- "Manager Sync - 10am" got flagged "Couldn't read a time." Bare 10am with no zone is the
  single most common way my team writes times. I get WHY (ambiguous), but it felt like the
  parser quit on normal input. It should fall back to the source timezone for bare times.

VALUE vs today: I do this in Excel with TZ formulas + manual paste into Teams. This is
faster for the share-out and the attendee calendar buttons are nicer than what I do now.
But I only ship ~2-3 of these a week and the privacy ambiguity means I'd hesitate on the
internal ones — so Marginal, not a clear win.

ADVOCACY 6: genuinely useful and the timezone math is trustworthy, but I won't recommend
it to peers for COMPANY data until the page tells me where my data goes. I'd recommend it
today only for public/community events.

TOP FIX: Add a visible, plain-language privacy line ("Runs entirely in your browser —
nothing is uploaded or saved; your agenda travels inside the link itself") plus a small
note that the share link contains the full agenda. That one change addresses my exact
blocker and lifts this to an 8.

```json
{"tester": 4, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 6, "topComplaints": ["No on-screen statement that data stays in the browser / never hits a server — the exact reassurance a wary corporate user needs", "Share link silently contains the full agenda; no warning that forwarding it leaks internal details", "Bare times like '10am' flagged unreadable instead of falling back to the source timezone"], "priorConcernsAddressed": "n/a"}
```
