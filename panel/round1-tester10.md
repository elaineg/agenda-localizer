NAME: Sam | IN-AUDIENCE: yes (organizes cross-functional roadmap reviews across regions) | ADVOCACY: 8 | CLARITY: Y | VALUE: Y | BLOCKER: Shared/attendee view header says "Source timezone: UTC" while every row is correctly computed & labeled "PT" — that contradiction would make me hesitate to send the link to stakeholders.

What it is (30s, mobile + desktop): "Paste your sessions, share one link — each person sees their own local time." Crystal clear headline, sample preloaded so I instantly saw the payoff. I'd pitch it to my team in one sentence.

What I do today: I write the agenda in Notion and hand-type "(9am PT / 12pm ET / 6pm CET)" per session — people STILL show up at the wrong hour. This auto-localizes per-viewer and gives per-session + bulk .ics. Real recurring win — I run these reviews weekly across LA/NY/London/Tokyo.

What impressed me (I tried it all):
- Source-tz detection read "All times PT" and did NOT get fooled by my "PT Roadmap — Q3" title. Correct.
- Out-of-order sessions auto-sorted (Design Review 9am floated to top).
- My no-time "Lunch & open discussion" row shown greyed: "no time — not exported." Nothing silently dropped.
- Tokyo attendee saw "1:00 AM +1 day" with a clear +1 day badge and "9:00 AM PT" subline. Math is right.
- Shared view clean & read-only (no paste box), mobile reflows well, "Copy as table" is a bonus for Notion.

What holds it back from a 9:
- THE blocker: shared view header literally reads "Source timezone: UTC" though detection found PT and every row uses PT. The detected PT never gets saved into the share link (the override selector also sits on "UTC" instead of pre-filling detected PT). Times are correct, but a stakeholder reading "UTC" distrusts the artifact — and looking organized is the whole reason I'd use this. I won't debug it; I'd fall back to Notion if questioned.
- Minor: override should default to the DETECTED zone, not UTC.

Would I advocate? Yes, quietly — send it to one PM friend, not broadcast, until "UTC" matches the PT it's actually using.

```json
{"tester": 10, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 8, "topComplaints": ["Shared view header says 'Source timezone: UTC' while rows are correctly computed/labeled PT — detected zone not persisted into share link, erodes trust", "Override selector defaults to UTC instead of pre-filling the detected source zone"], "priorConcernsAddressed": "n/a"}
```
