# UX Brief — Agenda Localizer

## 1. Problem statement
Paste your event schedule once and share one link that shows every session in each person's own local time — so nobody does timezone math or shows up at the wrong hour.

## 2. Primary user action
Paste a multi-session agenda and copy a share link. Landing view is the CREATOR editor, pre-loaded with the sample agenda already parsed and localized — the user sees a working before/after the instant the page loads, before typing or clicking anything.

## 3. Emotional tone
Fast and trustworthy — like a clean dev tool. Neutral sans-serif (system/Inter), cool/neutral color temperature (slate + one calm accent for the localized time), comfortable-but-dense spacing so a full agenda reads as a tidy list, not a wall.

## 4. Design decisions (builder must not skip)
- **Live, no-submit parse + structured preview.** As the user edits text or changes source tz, sessions re-render live as cards. Each card shows the **viewer's local time large/primary** and the **source time small/secondary beside it** (e.g. "12:00 PM (your time) · 16:00 UTC"). Always display the detected viewer timezone explicitly near the top (e.g. "Times shown in your timezone: America/New_York"). This is how a timezone tool earns trust.
- **Never silently drop a line.** Lines that fail to parse render as a flagged row ("Couldn't read this line — add a time like `16:00 UTC`") inline, in order, while every valid line still localizes. Show a small count ("8 sessions · 1 line needs a time").
- **Copy confirmation that survives.** "Copy share link" swaps its OWN label to "✓ Copied!" via aria-live for ~2s, then reverts — NOT a transient toast (FRICTION LESSON: async clipboard / re-render clobbers toasts). Button must visibly confirm even after a re-parse.

## 5. Shared / ATTENDEE view (the differentiator + growth surface)
Opening a share URL shows a polished READ-ONLY page (no editor, no paste box): a clean agenda title area, the viewer-timezone banner, and the session cards (local time primary, source secondary) each with "Add to Google Calendar" + "Download .ics". Must look finished and trustworthy to a stranger who's never seen the app. A subtle, non-defacing footer: "Made with → Agenda Localizer" linking to the empty editor. Distinguish modes purely by presence of agenda data in the URL hash: hash present = shared read-only; no hash = creator editor.

## 6. 5-second check (above the fold, cold visitor)
- **Headline:** "Your agenda, in everyone's timezone."
- **Subtitle:** "Paste your sessions, share one link — each person sees their own local time."
- **Primary element:** the sample agenda already parsed into localized session cards (local time primary, source secondary), with the editor and "Copy share link" button visible. A "Load sample agenda" button is present but the sample is pre-loaded so value is obvious with zero clicks.

## 7. Empty / error / edge / mobile
- True empty editor (creator clears text): show a one-line worked example + a "Load sample agenda" button, never a blank box.
- Unparseable share URL / corrupt hash: friendly message + "Make your own" CTA, no crash.
- Mobile (attendees open links on phones): single-column cards, local time stays the largest element, calendar buttons full-width and tappable; the viewer-timezone banner stays visible.
