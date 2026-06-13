---
tester: 5
name: Dana
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: Yes
---

**Re-check of my round-1 dealbreaker (inline per-line tz codes silently wrong):** FIXED, and
fixed properly. I pasted an APAC-heavy agenda with mixed inline codes and opened the share
link as a Tokyo (Asia/Tokyo) recipient. Every line is now correct:

- "9:00 AM SGT" → shows **10:00 AM (your time)**, subtitle "9:00 AM SGT". (9 SGT = 1:00 UTC =
  10 JST. Right.)
- "2pm JST" → **2:00 PM**. Right.
- "10am CET" → **5:00 PM** (CEST/DST in Sept = UTC+2 → 8:00 UTC → 5 PM JST). Right.
- "4:30 PM AEST" → **3:30 PM**. Right.

Last round these all stamped UTC and were off by hours. Now they parse. The dropdown even
lists the supported codes (SGT, JST, CET/CEST, AEST, IST, BST...), so I know the vocabulary.

**Title leakage:** FIXED. "SGT"/"JST" no longer jam into the session title — the title is
clean ("APAC Welcome & Keynote") and the source-tz string sits as a small grey subtitle
under the localized time. That two-line treatment (big "(your time)" + small source) is
actually exactly how I'd want to present it in an email.

**Unknown tz now warned, not silently wrong:** FIXED — this was my explicit ask. "Mystery
Session — 11am XYZ" falls back to source UTC AND shows an amber flag: "Unknown timezone
'XYZ' — using source tz". So I'd catch a typo'd code instead of shipping a wrong time. Exactly
the safety net I wanted.

**Multi-timezone summit now actually works.** My core complaint was that one global "Source
timezone" dropdown couldn't model a summit where sessions live in different zones. Inline
per-line codes solve that — I keep the dropdown on UTC and tag each session in its native
zone. That's my whole use case, handled.

**Value vs. today:** Today I hand-build a tz table in Notion / paste timeanddate.com links and
re-do it per recipient region. This replaces all of that: paste once, one share link, each
recipient sees their own time, plus per-session "Add to Google Calendar" + ".ics". Now that I
trust the math, this is a clear time saver, not marginal. Yes.

**What keeps it off a 10:** (1) "Networking — TBD" (no time) just drops to a quiet italic line
at the bottom with no localized slot — fine, but I'd like it inline in order. (2) I'd love a
visible "view in [region]" toggle on the share page so I can screenshot the APAC version for a
LinkedIn post without spoofing my own tz. (3) DST correctness on CET I had to trust/verify
myself; a tiny "(UTC+2)" offset hint next to the source line would let me sanity-check at a
glance. None are blockers — these are polish.

I'd recommend this to my events/marketing peers running multi-tz webinars. It does the one
annoying thing correctly now.

```json
{"tester": 5, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["No 'view as region X' toggle on the share page to screenshot a specific tz without spoofing my own", "No-time lines (TBD) get demoted to a footnote instead of staying in agenda order", "DST/offset isn't shown so I had to verify CET math myself"], "priorConcernsAddressed": "all"}
```
