---
tester: 4
name: Tomás
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: Partly
---

RE-CHECK OF MY ROUND-2 RESIDUAL CONCERN:
- "The link IS the data — no expiry/revocation." Still true, and as briefed, a real fix
  would need a server/account, which would break the no-upload promise I value. So this
  was never going to be "fixed" without giving up the thing that made me trust it. The
  disclosure is still present verbatim ("Runs entirely in your browser; nothing is
  uploaded... The share link contains your full agenda."). On reflection I'm now treating
  the tradeoff as ACCEPTABLE rather than a dealbreaker: for an internal all-hands, a
  read-only link that anyone forwarded can open is no worse than the agenda I'd paste into
  a Teams channel anyway — and there's no third party holding the data. I decide per-event
  whether to send it. That reframing is what moves me off 8.

NEW FEATURES I TESTED:
- "Copy as table" — this is the win for me. It puts a clean tab-separated table on the
  clipboard: Session / Local time / Local date / Source time / Source timezone. I pasted
  it straight and it lands as real columns in Excel and in a Teams message. That replaces
  the manual reformatting I used to do after the timezone math. Genuinely useful for the
  way I report out.
- Share link is now a labeled "Agenda" read-only view with "Source timezone: UTC" stated
  up top — clearer than before for an attendee who doesn't know what they're looking at.
  Length ~332 chars, data in the #fragment, consistent with no-server.

FRESH RUN (realistic cross-region all-hands, UTC + IST + CET + PT + a bare "10am"):
- All math correct. 9:00 AM IST → 8:30 PM PT (-1 day); 15:30 CET → 6:30 AM PT; 14:00 UTC
  → 7:00 AM PT; bare "10am" parsed as 10:00 UTC → 3:00 AM. Half-hour zones nailed again.
- Opened the link as a Tokyo attendee: 14:00 UTC → 11:00 PM, 11:00 AM PT → 3:00 AM (+1
  day) with the day-shift badge. Verified end to end.

VALUE vs today: I still do this in Excel TZ formulas + manual Teams paste. The "Copy as
table" export now covers the report-out step too, not just the share-out. Solid Yes — it
beats my spreadsheet workflow on both the math and the formatted paste.

ADVOCACY 9: I'd bring this up unprompted to peers who schedule cross-region meetings. The
privacy posture is honest, the math is right across half-hour and day-boundary cases, the
attendee view is legible, and "Copy as table" plugs straight into my Excel/Teams habit.
The link-is-data point is the one thing I'd still mention — but since the only "fix" is a
server I explicitly don't want, I no longer hold it against the app; it's the correct
tradeoff for a no-account tool, clearly disclosed. Not a 10 only because I'd want to see
it survive a genuinely messy paste (mixed date formats, typos) before I stake my name on
it org-wide.

```json
{"tester": 4, "round": 3, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Link-is-data tradeoff disclosed but inherently unfixable without a server (now accepted, not a blocker)", "Unproven on messy real-world pastes (mixed date formats/typos)"], "priorConcernsAddressed": "some"}
```
