# UX Brief — Agenda Localizer

## 1. Problem statement
Paste your event schedule once and share one link that shows every session in each person's own local time — so nobody does timezone math or shows up at the wrong hour.

## 2. Primary user action
Paste a multi-session agenda and copy a share link. Landing view is the CREATOR editor, pre-loaded with the sample agenda already parsed and localized — the user sees a working before/after the instant the page loads, before typing or clicking anything.

## 3. Emotional tone
Fast and trustworthy — like a clean dev tool. Neutral sans-serif (system/Inter), cool/neutral color temperature (slate + one calm accent for the localized time), comfortable-but-dense spacing so a full agenda reads as a tidy list, not a wall.

## 4. Design decisions (builder must not skip)
- **Live, no-submit parse + structured preview.** As the user edits text or changes source tz, sessions re-render live as cards. Each card shows the **viewer's local time large/primary** and the **source time small/secondary beside it** (e.g. "12:00 PM (your time) · 16:00 UTC"). Always display the detected viewer timezone explicitly near the top (e.g. "Times shown in your timezone: America/New_York"). This is how a timezone tool earns trust.
- **Lenient parser, three row types — never a false error (G1).** The parser must silently accept bare-hour and informal times exactly like `HH:MM`: "8pm", "9am", "7 PM", "4 PM ET", "11 p.m.", "noon", "midnight", with or without a tz token. Each input line resolves to ONE of three rows, all rendered in original order:
  1. **Session card** — has a parseable time (localized as above).
  2. **Note / header row** — has NO time (e.g. "Day 1 — Summit", "lunch", "TBD", a date heading). Render as a visually distinct lightweight row (e.g. smaller, muted, no time column, maybe a subtle divider) — a section label, **NOT** an error. The default is "timeless line = note," not "timeless line = broken."
  3. **Needs-a-time warning** — ONLY when a line clearly looks like it intended a time but couldn't be read. Inline, actionable: "Couldn't read a time here — try `16:00 UTC` or `4 PM ET`." Show a small count ("8 sessions · 1 line needs a time"). **Creator view only — see §5.**
- **Visible timezone correctness (G3) — design for trust, never silently-wrong.** (a) Date-cross badge: when a session's localized time lands on a different calendar day than the source, show a small badge on that card — "+1 day" or "−1 day" — next to the local time. (b) Per-line tz tokens (SGT, JST, CET, PST/PDT, ET, etc.) parse and localize correctly; expand the abbreviation table. (c) If a per-line tz token is unrecognized or conflicts with the source-tz dropdown, FLAG it on the card (a small visible warning chip: "Unknown timezone 'XYZ' — using source tz") — never silently fall back. Confidently-wrong output is the one unforgivable failure for this app.
- **Calendar export on BOTH previews (G4).** The per-session "Add to Google Calendar" + "Download .ics" affordances appear on the creator-side localized preview too, not only the shared view. Same affordance, same place on each card.
- **Title cleanup (G7).** Strip trailing separators and tz tokens from titles ("Standup @" → "Standup"; "Kickoff SGT" → "Kickoff"). Do NOT strip internal colons — keep "Workshop: Building with AI" readable. Only the time/tz portion is removed; the human-readable label stays intact.
- **Copy confirmation that survives.** "Copy share link" swaps its OWN label to "✓ Copied!" via aria-live for ~2s, then reverts — NOT a transient toast (FRICTION LESSON: async clipboard / re-render clobbers toasts). Button must visibly confirm even after a re-parse.
- **Privacy line, plain language (G5).** Near the editor/share button, one quiet line: "Runs entirely in your browser; nothing is uploaded — your agenda travels inside the link itself." Add a smaller adjacent note: "The share link contains your full agenda." Calm/reassuring, not a scare banner.

## 5. Shared / ATTENDEE view (the differentiator + growth surface)
Opening a share URL shows a polished READ-ONLY page (no editor, no paste box): a clean agenda title area, the viewer-timezone banner, and the session cards (local time primary, source secondary) each with "Add to Google Calendar" + "Download .ics". Must look finished and trustworthy to a stranger who's never seen the app. A subtle, non-defacing footer: "Made with → Agenda Localizer" linking to the empty editor. Distinguish modes purely by presence of agenda data in the URL hash: hash present = shared read-only; no hash = creator editor.

**NEVER leak parse warnings here (G2 — existential for the growth surface).** The shared view shows zero "couldn't read a time" warnings, ever. Per row type: session cards render normally (incl. date-cross badges, which DO belong here — they're correctness, not errors); note/header rows render as the same muted note rows as in the editor; lines that were flagged as needs-a-time in the creator view are simply omitted from the shared view. The attendee sees a clean, finished agenda — no yellow, no "broken" feel.

## 6. 5-second check (above the fold, cold visitor)
- **Headline:** "Your agenda, in everyone's timezone."
- **Subtitle:** "Paste your sessions, share one link — each person sees their own local time."
- **Primary element:** the sample agenda already parsed into localized session cards (local time primary, source secondary), with the editor and "Copy share link" button visible. A "Load sample agenda" button is present but the sample is pre-loaded so value is obvious with zero clicks.

## 7. Empty / error / edge / mobile
- True empty editor (creator clears text): show a one-line worked example + a "Load sample agenda" button, never a blank box.
- Unparseable share URL / corrupt hash: friendly message + "Make your own" CTA, no crash.
- Mobile (attendees open links on phones): single-column cards, local time stays the largest element, calendar buttons full-width and tappable; the viewer-timezone banner stays visible.
- **Mobile CREATOR editor — proof above the fold (G6).** On a phone, the sender must see the localized preview working BEFORE copying, without scrolling past the textarea. Show a compact/collapsed localized summary above the fold (e.g. the first 1–2 localized cards + the "N sessions" count, expandable), so the sender sees proof the link works before hitting Copy. The editor textarea can be shorter on mobile to make room.
