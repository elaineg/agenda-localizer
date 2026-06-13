---
tester: 6
name: Jules
clarity: Yes
value: Yes
advocacy: 9
prior_concerns_addressed: Yes
---

I'm Jules — weekly community office-hours + AMA for a globally distributed Discord. Last
round I gave a 6: the concept was great but the parser only accepted HH:MM, so my real
schedule (full of "6pm", "9am") bounced with yellow "Couldn't read a time" warnings.

**My top fix — accept bare-hour am/pm — IS FIXED.** I pasted my schedule the way I actually
write it and every single line parsed, zero warnings:
- "6pm ET" → 6:00 PM ET (3:00 PM my time) ✓
- "9am ET" → 9:00 AM ET ✓
- "noon ET" → kept "noon ET", converted to 9:00 AM my time ✓
- "11 p.m. ET" → 11:00 PM ET ✓
- "7 PM ET" → 7:00 PM ET ✓
That's exactly the formats that all failed last round. This is the thing that was blocking
me, and it now Just Works. I could paste my pinned Discord message verbatim.

**Clarity — Yes.** Same strong headline "Your agenda, in everyone's timezone." + subhead
"Paste your sessions, share one link — each person sees their own local time." Pitch lands
in under 5 seconds. Prefilled sample + live preview, no guessing.

**Value — Yes (was Marginal).** Today I hand-type a few timezone conversions into a pinned
Discord message every week. This now beats that cleanly because I no longer pay a re-entry
tax — I paste as-is and get a self-contained share link (no login, agenda lives in the URL
hash). I confirmed the share link copies (valid `/#...` URL read from clipboard) and that
each session has Add-to-Google-Calendar + Download .ics. And my round-1 minor gripe — those
calendar buttons only showed on the shared view — is also fixed: they now appear in the
editor preview too, so I know they exist before I share. Mobile at 375px: single column,
scrollWidth exactly 375, no horizontal scroll, clean. No console errors.

**Advocacy — 9 (was 6).** The blocker is gone, so I'd post this in my Discord and bring it
up unprompted to other community managers. Not a 10 only because of one small thing: when I
clicked "Copy share link" the button label didn't visibly flip to a "Copied!" confirmation
in my test (the link DID copy — I read it back from the clipboard, so copy works; clipboard
verified, label-flip not observed). For a no-login tool, that little "✓ Copied!" reassurance
matters when I'm posting fast — I want to be sure before I paste into Discord. That's the
only thing between this and a 10.

```json
{"tester": 6, "round": 2, "clarity": "Yes", "value": "Yes", "advocacy": 9, "topComplaints": ["Copy-share-link button did not visibly flip to a 'Copied!' confirmation in this run (link did copy, but no on-screen reassurance before posting)"], "priorConcernsAddressed": "all"}
```
