---
tester: 10
name: Sam
clarity: Yes
value: Yes
advocacy: 8
---

I'm Sam, a PM who runs cross-functional roadmap reviews with stakeholders in different
regions and shares clean artifacts constantly. Tested on mobile (375px), then a laptop
mindset for the stakeholder open.

**Clarity — Yes.** Headline "Your agenda, in everyone's timezone." plus subhead "Paste
your sessions, share one link — each person sees their own local time." told me exactly
what it does and that it's for me in about 3 seconds. A textarea, a source-timezone
dropdown, and a "Copy share link" button — zero ambiguity. This is the rare app I'd
understand without reading anything.

**Value — Yes (real recurring).** Today I do this by hand: I keep the agenda in Notion,
then footnote "9am PT / 12pm ET / 5pm London / 1am Tokyo," and inevitably someone still
asks "wait what time for me?" This app kills that. I paste sessions once, set source TZ,
copy ONE link, and every stakeholder opens it and sees THEIR local time auto-detected
(I confirmed: 09:00 UTC rendered as 6:00 PM in a Tokyo context). Each session even has
"Add to Google Calendar" and "Download .ics" — both produce correct events (verified the
ICS body and the GCal template URL carry the right UTC times). No login, link is fully
self-contained in the URL hash. This is exactly my kind of shareable, look-organized
artifact, and I'd use it weekly.

**Advocacy — 8.** I'd bring this up in a roadmap-planning Slack thread unprompted. It
loses 2 points on the parser, which is brittle for how people actually type:
- The agenda **title line** gets parsed as a session and shows a yellow "Couldn't read a
  time" warning — and that warning persists in the SHARED stakeholder view, where they
  can't fix it. My clean artifact has a yellow error band at the top. That's the thing
  that would make me hesitate to send it to execs.
- Real informal input fails: "standup 9am" and "retro 4 PM ET" both errored; it only
  reliably reads colon formats like "9:00 AM PT". Worse, "sync at 2:30pm tomorrow" half-
  parsed into "sync at tomorrow" and silently dropped the 2:30pm. A PM pasting live
  meeting notes will see mostly yellow.
- Mobile: session titles truncate ("Eng capacity de…") next to the calendar buttons.
- No date inference (defaulted to tomorrow) — fine for now but I'd want to set a date.

It degrades gracefully (no crashes, no console errors, and it literally tells you the
format it wants), which is why it's still an 8 and not lower. But the title-as-error and
the strict parser are what hold it back from a 9.

**Highest-impact fix:** Don't treat a line with no time as a broken session — let me mark
a heading (or auto-detect the first line as a title), and loosen the parser to read
"9am" / "4 PM ET" / "2:30pm". A roadmap agenda has a heading and informal times; right now
both produce yellow warnings on the artifact I'm trying to look organized with.

```json
{"tester": 10, "round": 1, "clarity": "Yes", "value": "Yes",
 "advocacy": 8, "topComplaints": ["Title/heading line parsed as a session and shows a persistent 'Couldn't read a time' warning, even in the shared stakeholder view", "Parser too strict: 'standup 9am' and 'retro 4 PM ET' fail; only colon formats like '9:00 AM PT' work, and 'sync at 2:30pm' silently dropped the time", "Mobile session titles truncate next to calendar buttons"], "priorConcernsAddressed": "n/a"}
```
