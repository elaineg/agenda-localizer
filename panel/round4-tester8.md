# Round 4 — Tester 8 (Rob, freelance brand/visual designer, desktop, low-frequency, "I'd just type it myself")

## 1. CLARITY — Yes
5-second read worked: "Your agenda, in everyone's timezone" + "Paste your sessions, share one link — each person sees their own local time." I'd tell a friend: "Paste a multi-timezone agenda, send one link, everyone sees their own local time and can add it to their calendar." The "Download all sessions (.ics)" button was the FIRST thing in the preview column — big blue, top of the list, not buried. I noticed it cold without hunting. On the attendee view the "Imports into Google Calendar, Apple Calendar & Outlook" subtitle is a nice reassurance.

## 2. VALUE — Marginal (would be Yes if the date bug were fixed)
Today I write the times out by hand in the Slack/email, or eyeball a converter. For 3-4 sessions that's ~4 min of fiddly grunt work I do maybe twice a month. One-click bulk .ics import is genuinely the thing that *could* push me over the line — typing 4 events into my calendar by hand is exactly the chore I hate. The combined .ics is technically correct: 4 VEVENTs, UTC DTSTART/DTEND, valid VCALENDAR wrapper, sensible filename, imports clean.
BUT it only works if I feed it the app's preferred shape (a date-header line, then sessions). When I pasted the way a real person pastes — date inline on each line ("Client Review — 2026-06-22 11:00 AM ET") — every event silently landed on 20260618 (today) and the date got jammed into the event TITLE. A bulk import that puts all my client calls on the wrong day is WORSE than doing it by hand; I'd lose trust and never reuse it. So for a once-or-twice-a-month skeptic, value is conditional, not banked.

## 3. ADVOCACY — 5/10
The feature I was sent to judge (download-all) is well-built and discoverable. But I personally hit a wrong-date import within my first realistic paste, and a low-frequency user who gets burned once doesn't come back. I can't recommend a calendar tool that quietly writes the wrong dates. Fix inline-date parsing and this is a 7-8 for me.

## Regression check — PASS
- Localization: PASS. Attendee opened in Asia/Tokyo, saw "Times shown in your timezone: Asia/Tokyo", 11 AM ET → 12:00 AM +1 day with a clear "+1 day" badge. Correct.
- Per-session links: PASS. "Download .ics" is a data: URI anchor with download attr; "Add to Google Calendar" is a proper render?action=TEMPLATE URL. Both present on creator + attendee.
- Share URL: state in #hash (397 chars, has #), no upload — matches the privacy copy.
- No console/page errors on creator or attendee.

## DEFECTS
- **P0 (data correctness, app-wide, surfaces through the NEW feature): inline per-line dates are not parsed as dates.** Pasting "Title — 2026-06-22 11:00 AM ET" puts the date in the SUMMARY ("...Acme Rebrand 2026 06 22") and sets DTSTART to today (20260618) for ALL sessions. The download-all .ics, per-session .ics, AND Google Calendar links all inherit it, so a one-click bulk import lands every event on the wrong day. Only the sample's separate-date-header format parses correctly. This is the single thing blocking the feature's whole value.
- **P1 (UX): no visible date on session cards / no input-format hint.** The preview cards show NO date at all (only time + "your time"), so the user gets no warning that the date was misread. A "we read this as <date>" echo or a placeholder showing the expected paste format would have caught my mistake before I trusted the export.

```json
{"tester": 8, "round": 4, "clarity": "Yes", "value": "Marginal", "advocacy": 5, "topComplaints": ["Inline per-line dates aren't parsed: all sessions export to today's date and the date leaks into the event title — bulk .ics import lands every event on the wrong day", "Session cards show no date and no paste-format hint, so the misparse is silent and the user trusts a wrong export"], "priorConcernsAddressed": "n/a"}
```
