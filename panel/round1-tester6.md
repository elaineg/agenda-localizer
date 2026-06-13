---
tester: 6
name: Jules
clarity: Yes
value: Marginal
advocacy: 6
---

I'm Jules — I run a weekly community office-hours/AMA series for a globally distributed
Discord. Posting "what time is this for YOU" across timezones is exactly the by-hand job I
do every week. So I came in primed to love this.

**Clarity — Yes.** Headline "Your agenda, in everyone's timezone." + subhead "Paste your
sessions, share one link — each person sees their own local time" told me the whole pitch in
under 5 seconds. The prefilled sample + live localized preview on the right meant I never
wondered what to do. This nails my mental model: one link everyone reads in their own time.

**Value — Marginal.** What I love and what it gets right:
- NO LOGIN. The share link is a self-contained URL hash — I can drop it in Discord and
  every member just opens it. This is the single biggest reason I'd consider it.
- I opened my own share link as a Tokyo member (timezone Asia/Tokyo) and the times
  converted correctly (18:30 ET → 7:30 AM JST). Conversion is accurate.
- The shared/recipient view has "Add to Google Calendar" + "Download .ics" per session.
  That's genuinely great for my members.
- Copy button works (label flips to "✓ Copied!"). Mobile at 375px is clean, single column,
  no horizontal scroll, no mobile bugs found.

Why only Marginal: **the parser rejects the way real people write times.** I pasted my
actual schedule and most lines failed. Tested 6 common formats:
- "6:30pm ET" → works.  "10:00 ET" → works.
- "6pm ET" → FAILS.  "7 PM ET" → FAILS.  "9am ET" → FAILS.  "11 p.m. ET" → FAILS.

It seems to require HH:MM. But nobody in my Discord writes "7:00 PM" — they write "7pm".
Every bare-hour time gets a yellow "Couldn't read a time" box. So to actually use this I'd
have to rewrite every line adding ":00", which is exactly the re-entry tax that makes me
just keep doing it by hand in Notion. Today I hand-write a few timezone conversions in the
pinned Discord message; this would only beat that if I can paste my message AS-IS.

Minor: I selected "ET" as source timezone but my lines already had "ET" inline and it still
worked — fine, but the relationship between the source-tz dropdown and inline "ET/PT" tags
isn't explained. Also the Add-to-Calendar buttons only appear on the shared view, not in my
editor preview, so I didn't know they existed until I opened my own link.

**Advocacy — 6.** It's close. The concept, the no-login link, and accurate conversion are
all 9/10. But I can't recommend "paste your schedule" to my community when half my pasted
lines bounce. A 6 because I'd hesitate to post it, fearing friends paste real text and hit a
wall of yellow warnings.

**Highest-impact change:** make the parser accept bare-hour am/pm — "6pm", "7 PM", "9am",
"11 p.m." — not just HH:MM. That one fix turns this from Marginal to a Yes I'd post in
Discord unprompted.

```json
{"tester": 6, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 6, "topComplaints": ["Parser rejects bare-hour times like '6pm','7 PM','9am' — only HH:MM works, so real pasted schedules mostly fail", "Add-to-Calendar/.ics only shows on the shared view, not the editor preview, so I didn't know it existed", "Source-timezone dropdown vs inline ET/PT tags relationship unexplained"], "priorConcernsAddressed": "n/a"}
```
