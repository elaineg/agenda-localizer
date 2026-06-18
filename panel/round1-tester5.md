NAME: Dana | IN-AUDIENCE: yes (promotes multi-tz virtual summit agenda) | ADVOCACY: 6 | CLARITY: Y | VALUE: Y | BLOCKER: Source-tz auto-detect only fires when "All times PT" is on its OWN line — embed it in a title or parens and every time is silently 7–8h wrong with no warning.

## Dana — Demand-gen marketer (MacBook + phone)

CLARITY: Y. Headline "Your agenda, in everyone's timezone" + "share one link, each person sees their own local time" told me exactly what it does in one scroll. The cold sample preview (localized times + add-to-calendar buttons already populated) sold it instantly — I'd screenshot this for the team channel.

VALUE: Y. Today I hand-build a tz table in Notion / paste a tzconverter grid into emails and a Canva graphic — tedious and error-prone for a multi-tz summit. A shareable link where each APAC prospect sees their own time + one-click "Download all sessions (.ics)" is genuinely better. The combined .ics validated: 4 correct VEVENTs (9 AM PT = 16:00Z), no-time rows correctly skipped. Attendee view carried my PT override and showed source + viewer tz cleanly. Mobile (375px) shows the live preview in one scroll.

THE BLOCKER (why only 6, not 9): The source-timezone DETECTION is a trap. It worked for the sample ("Detected source timezone: PT — from 'All times PT'"). But my real header read "Virtual Summit 2026 — All times PT" — detection silently FAILED, the selector sat on UTC, and the bold "(your time)" number was off by 8 hours with ZERO warning. Same with "(all times PT)". Real agendas never put the tz note on its own bare line. I'd paste mine, see plausible times, share the link, and APAC prospects show up 8 hours wrong — the exact disaster this tool exists to prevent.

Secondary: even when detection works, the "Override source timezone" select still visually reads "UTC" while the math is PT — inconsistent, made me distrust which value is live.

WOULD I ADVOCATE: Not yet. The .ics + share link are strong, but I can't recommend a tool whose headline feature (auto-detect the tz I stated once) breaks on the most common phrasing and fails silently. Make detection robust to "— All times PT" / "(all times PT)" anywhere, OR loudly warn "couldn't detect source timezone — defaulting to UTC, please set it", and this jumps to a 9.

```json
{"tester": 5, "round": 1, "clarity": "Yes", "value": "Yes", "advocacy": 6, "topComplaints": ["Source-tz auto-detect only matches 'All times PT' on its own line; embedded in a title or parens it silently fails and times are 7-8h wrong with no warning", "Override-source-timezone select shows 'UTC' even when detection banner is correctly using PT — inconsistent, undermines trust in which value is live"], "priorConcernsAddressed": "n/a"}
```
