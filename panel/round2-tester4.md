# Round 2 — Tester 4 (Tomás, Ops analyst, Edge/Windows, medium-tech)

In-audience: YES. Round 1 advocacy: 9. I'm the regression sentinel here.

## Re-check of my prior concerns
- My round-1 ask was structured Excel/Outlook paste — still parked/out-of-scope. Not a blocker, just the remaining gap to a 10. No regression.
- Privacy disclosure I'd cared about earlier ("Runs entirely in your browser; nothing is uploaded… the share link contains your full agenda") is STILL present, verbatim, under the Copy button. Good.
- The link-is-the-data tradeoff (no expiry/revocation) is unchanged — inherent to the no-server design and still honestly disclosed. Acceptable to me; I decide per-event whether to send the link.

## Round-2 builder claims — verified live (Chromium ≈ Edge, my tz = America/New_York)
Pasted my OWN agenda: `Summit 2026 — All times PT` / date / `2:00 PM PT Roadmap — Q3` / `10:00 AM PT Opening Keynote` / `Networking Break` (no time) / `9:00 AM Morning Standup` (out of order).

1. **Embedded source-tz detect + override snap**: "Detected source timezone: PT — from 'Summit 2026 — All times PT'". Override selector auto-snapped to **PT (America/Los_Angeles)**. PASS.
2. **No "UTC" lie**: my-time header = **"Times shown in your timezone: America/New_York"** (real applied tz). PASS.
3. **Title extraction**: "10:00 AM PT Opening Keynote" → **"Opening Keynote"** (PT stripped, "10:00 AM PT" kept as source label). "2:00 PM PT Roadmap — Q3" → **"Roadmap — Q3"** (prefix stripped, title intact). PASS.
4. **No-time row**: "Networking Break" → divider, **"no time — not exported"**, not faked into an event. PASS.
5. **Out of order**: re-sorted Standup 9AM → Keynote 10AM → Roadmap 2PM. PASS.
6. **Conversions**: 9AM PT→12PM ET, 10AM PT→1PM ET, 2PM PT→5PM ET. All correct. PASS.

## Share link → attendee (opened cold in Europe/London, a 3rd tz)
- "Source timezone: PT" travels in the link. "Times shown in your timezone: **Europe/London**" (NOT UTC).
- Re-localized: 5PM / 6PM / 10PM London. Source labels (9:00 AM PT…) preserved. **Source-tz indicator, header, and per-card labels all AGREE — no UTC lie anywhere.** PASS.

## Combined .ics
3 VEVENTs (Networking Break correctly excluded). DTSTART UTC matches PT source (16:00/17:00/21:00Z). Clean SUMMARY, source time in DESCRIPTION. PASS.

## No-server / no-account (matters a LOT — internal schedule data)
Network watched on creator AND attendee: only GETs + RSC payload. **Zero POSTs, zero upload.** Agenda lives in the URL #fragment (never sent to server). I'd paste an internal all-hands here. PASS.

## Mobile 375px
Stacks cleanly (summary card + "See all", paste box, PT override, full preview). Conversions match desktop. No overflow. Minor: the "Detected source timezone" banner shown on desktop isn't surfaced in the mobile top summary — implied by the override snap, not a blocker.

## Answers
- **Clarity: Y** — "Paste an agenda, share one link, everyone sees their own local time."
- **Value: Y** — Today I hand-build TZ tables in Excel and paste converted times into Teams invites; people still mis-read them. One self-localizing link + bulk .ics kills that. Saves real minutes weekly.
- **Use + advocate: Yes to both.** I'd send it to the other regional coordinators.
- **Advocacy: 9/10.**
- **ONE thing stopping a 10**: still no structured Excel/tab-separated paste — when I copy a schedule grid out of Excel (time | session | owner) it lands as raw lines, not mapped columns. Free-text is excellent; Excel-native paste is where my data actually lives.

## Regression vs round 1: NONE. All three round-2 fixes landed correctly; nothing previously working broke.

```json
{"tester": 4, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["No structured Excel/tab-separated paste — Excel grid lands as raw text, not mapped columns", "Mobile top summary omits the 'Detected source timezone' banner shown on desktop (minor)"], "priorConcernsAddressed": "n/a"}
```
