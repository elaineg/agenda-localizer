NAME: Priya | IN-AUDIENCE: yes (runs cross-tz multi-session syncs) | ADVOCACY: 9 | CLARITY: Y | VALUE: Y | BLOCKER: Override source-tz is a fixed 11-preset list with no arbitrary IANA entry — only real gap.

I run on-call/incident syncs + an OSS contributor call across US/EU/India and live in "what time is that for me?" hell. This is exactly the thing I'd paste into instead of hand-building a worldtimebuddy table.

CLARITY (Y): "Your agenda, in everyone's timezone — paste, share one link, each person sees their own local time" told me what it is and who it's for in ~5s. No jargon, no signup wall, no marketing fluff.

NETWORK-TAB CHECK (this decides it for me): only external host in the markup is calendar.google.com, fired solely by clicking "Add to Google Calendar". The .ics is a `data:text/calendar` URI generated in-browser. Share link carries the agenda inside the URL (#hash, ~193 chars) — nothing phones home. "Runs entirely in your browser; nothing is uploaded" is TRUE, not a claim. This earns the recommend.

TRAP CASES — all passed:
- "PT Roadmap — Q3" NOT misread as a timezone; stayed a session title, detected source still PT from the header line.
- No-time row "TBD breakout — sometime later" → "no time — not exported". Graceful, not silently dropped.
- Out-of-order input re-sorted to chronological (8/9/11am, then 3pm).
- Override PT→BST→JST genuinely reconverts: 9:00 AM PT=9:30 PM IST, BST=1:30 PM IST, JST=5:30 AM IST — all correct, and the per-session sub-label updates ("9:00 AM BST"), not stale.
- Attendee view is read-only (no textarea), keeps Download-all + per-session .ics. Correct.
- Mobile 375px: preview floats up with "See all"/"+2 more", full-width tappable download. Clean.

VALUE (Y): beats my worldtimebuddy-tab + manual-message workflow — one paste, one link, teammates self-serve. Real recurring weekly effort saved.

HOLDS IT BACK FROM 10: override is a closed list of 11 city presets, no free IANA entry — if a source zone isn't one of the 11 I can't force it. Minor; auto-detect covered every header I threw at it. No actual bug found, so it's a 9.

```json
{"tester": 1, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Override source-tz is a fixed 11-preset list, no arbitrary IANA zone entry", "Detected-source banner could show the UTC offset used so I can sanity-check DST instead of trusting silently"], "priorConcernsAddressed": "n/a"}
```
