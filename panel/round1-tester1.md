---
tester: 1
name: Priya
clarity: Yes
value: Marginal
advocacy: 7
---

**Clarity — Yes.** Headline "Your agenda, in everyone's timezone." + subhead "Paste your sessions, share one link — each person sees their own local time." told me exactly what it is and who it's for in under 5s. The pre-loaded sample with a live "Localized preview" column and a "Times shown in your timezone: America/Los_Angeles" bar sealed it. No signup wall — instant respect.

**Value — Marginal (leaning Yes).** Today I solve this by pasting a UTC schedule into Slack and fielding "what time is that for me?" all day, or hand-building a everytimezone.com link. This is faster than both: I paste my 5-line on-call/contributor agenda, copy one link, done. The parser is genuinely good — it handled `16:00 UTC`, `9:00 AM IST`, `9:00 AM PT`, `5:00 PM ET`, ranges (`14:00–15:00 UTC` → `7:00–8:00 AM`), and bare `10:00`/`12:00pm` falling back to the source-tz dropdown. Math checked out across LA/India. What keeps it at Marginal not Yes: **no add-to-calendar / .ics export**, which is the thing my teammates actually want — they don't want to re-read a webpage at call time, they want it on their calendar. Without that I'm still doing half the job manually.

**Advocacy — 7.** I'd mention it if a teammate complained about timezone math, but not bring it up unprompted. What holds it back:

Frictions/bugs:
- **No calendar export.** Expected "Add to Google/Outlook/.ics" per session or for the whole agenda; there's nothing. For a recurring on-call sync, the link localizes but doesn't get the event onto anyone's calendar — the last mile is missing.
- **"noon CET" and named European zones fail.** I typed `Kickoff — noon CET` → "Couldn't read a time." A skeptical engineer expects `noon` and common zone names (CET/CEST/JST) to work, not just offsets/US abbreviations.
- **Share link only updates the URL on Copy, not live.** The address bar stays clean while I edit; the encoded state only lands in the hash when I hit "Copy share link." Minor, but I bookmarked the bare URL once and lost my agenda. Live-updating the hash (or a visible "your link" field) would reassure me nothing's lost.
- **`vercel.live/feedback/feedback.js` loads.** I checked the network tab (the whole reason I trust paste tools). Good news: agenda lives entirely in the URL fragment, never POSTed anywhere — truly client-side, nothing phones home with my data. The only external script is Vercel's own feedback widget. I'd strip it for a "we send nothing" guarantee, but it's not a dealbreaker.

What I liked: instant, no account, privacy-clean (state in URL hash), per-line error hints, ranges supported, sensible tz dropdown covering US/EU/India.

**Single change that most raises advocacy:** add per-session and whole-agenda calendar export (.ics + Google link). That turns "nice converter" into "I send this to my contributor list and never field a timezone question again" — a 7 becomes a 9.

```json
{"tester": 1, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 7, "topComplaints": ["No add-to-calendar / .ics export — last mile to teammates' calendars is missing", "'noon' and named zones like CET fail to parse", "share link only writes to URL on Copy, not live — lost an edited agenda once"], "priorConcernsAddressed": "n/a"}
```
