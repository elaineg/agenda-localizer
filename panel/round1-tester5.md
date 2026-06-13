---
tester: 5
name: Dana
clarity: Yes
value: Marginal
advocacy: 5
---

**Cold open (the 5s/one-scroll test):** Passes. Headline "Your agenda, in everyone's
timezone." + subhead "Paste your sessions, share one link — each person sees their own
local time." told me exactly what it does and who it's for before I scrolled. The page
pre-loads a sample with localized times already rendered side-by-side, so I *saw* the
value instead of having to imagine it. As a marketer this is the kind of legible I'd
normally screenshot. The "Copy share link" button is the obvious next action.

**The job:** I pasted a real multi-timezone summit agenda — sessions in SGT, CET, ET.
Copy link worked (clipboard had a hash-encoded URL, no backend needed — nice). I opened
that link in a fresh Tokyo browser and the recipient saw a clean read-only agenda in
Asia/Tokyo with per-session "Add to Google Calendar" + "Download .ics" and a "Make your
own" footer. That recipient experience is genuinely good and is exactly what I'd drop in
an email or behind a landing-page CTA.

**But here's the dealbreaker — it gets the times WRONG, silently.** My line
"APAC Welcome & Keynote — 9:00 AM SGT" was rendered as "9:00 AM **UTC**" with the word
"SGT" jammed into the session title. "14:00 CET" became "14:00 **UTC**". The app ignores
inline timezone codes and blindly stamps everything with the dropdown's "Source: UTC".
9 AM SGT is 1 AM UTC — so the localized times my APAC prospects would see are off by
hours, with zero warning. Worse, it's inconsistent: inline "PT" and "ET" DID parse, but
"SGT"/"CET" didn't. For a *multi-timezone* summit — my entire use case — this produces
confidently-wrong output. I'd send bad session times and not know it. That's the exact
disaster this tool promises to prevent.

**Value vs. today:** Today I hand-build a timezone table in Notion or paste a
timeanddate.com link. This is faster and the share-link/.ics is better than what I do
now — IF I trust the times. The single-source-timezone model means every session in my
agenda must be in one tz, which a global summit never is. So: Marginal.

**Frictions:**
- Inline tz codes (SGT/CET/JST/AEST...) silently ignored → wrong times, no warning.
- Single "Source timezone" dropdown can't model an agenda where sessions span zones.
- Garbage like "SGT"/"ET" leaks into the session title instead of being consumed.
- "TBD" / no-time lines correctly flagged — good, that part's handled well.

**Highest-impact change:** Honor inline timezone abbreviations per line (or at minimum
WARN "found 'SGT' in this line but applying UTC — fix?"). Getting times wrong silently
turns a screenshot-worthy tool into a liability. Fix that and this jumps to an 8-9.

```json
{"tester": 5, "round": 1, "clarity": "Yes", "value": "Marginal", "advocacy": 5, "topComplaints": ["Inline timezone codes (SGT/CET) silently ignored — every cross-tz session shows wrong localized time with no warning", "Single source-timezone model can't represent a multi-timezone summit, which is the core use case", "Unparsed tz codes leak into the session title"], "priorConcernsAddressed": "n/a"}
```
