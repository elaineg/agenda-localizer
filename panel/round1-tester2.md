NAME: Marcus | IN-AUDIENCE: yes (posts launch-week livestream schedule) | ADVOCACY: 4 | CLARITY: Y | VALUE: Y | BLOCKER: Parser glues the "PT" timezone token onto every session title — corrupts the public shared view AND the .ics

# Marcus — Frontend engineer, 2yr — round 1

Cold open is clean: h1 "Your agenda, in everyone's timezone." + sub "share one link — each person sees their own local time." Zero console errors, no CSS jank, no layout overflow at 375px. I instantly get what it's for. Clarity Y.

I pasted my launch-week agenda. The core idea is exactly my workflow — today I hand-type a tz-conversion table or paste a https://everytimezone.com link in Discord; this is faster. Value Y... IF the output is trustworthy. It isn't.

## What's broken (and I'd notice all of it)
- **PARSER MANGLES TITLES (P0, ship-blocker).** A row like `9:00 AM PT PT Roadmap — Q3` becomes title **"PT PT Roadmap — Q3"**; `10:00 AM PT Opening Keynote` becomes **"PT Opening Keynote"**. The parser strips the *time* but leaves the trailing **"PT" tz token welded to the title** on EVERY session. I verified it's in the shared attendee view (04-shared.png) AND in the downloaded .ics: `SUMMARY:PT Opening Keynote`. That's the literal thing I'd drop in Discord — corrupted for every viewer and in everyone's calendar. Embarrassing; I would not share this.
- **Override source tz DEFAULTS TO "UTC", not the detected PT.** The banner proudly says `Detected source timezone: PT — from "10:00 AM PT…"`, but the override `<select>` sits on **UTC**. So detection is decorative — if a creator trusts the banner and just hits share, conversions can be 7-8h wrong unless they spot the tiny dropdown. Detected value should be the default.
- "PT Roadmap — Q3" title test: PASS in spirit (not misread AS a tz), but it inherits the glued-prefix bug above.
- Good: no-time row (`TBD Community Office Hours`) correctly shows "no time — not exported"; out-of-order rows sort fine; "No date found" hint is clear; share link is self-contained client-side; reconversion fires ("(overridden)" label).

## Verdict
The skeleton is genuinely good and I want this. But the one job — a clean shareable schedule — produces garbage titles in the exact artifact I'd post. Advocacy 4: I'd Slack it to teammates ONLY after the title parser is fixed; right now I'd get clowned for the "PT PT Roadmap" link.

```json
{"tester": 2, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 4, "topComplaints": ["Parser welds 'PT' tz token onto every session title — corrupts shared view + .ics SUMMARY", "Override source-tz selector defaults to UTC instead of the detected PT, so conversions are silently wrong unless you notice the dropdown"], "priorConcernsAddressed": "n/a"}
```
