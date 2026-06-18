/**
 * Sample agenda — deterministic values the verifier can assert against.
 * This sample exercises the full trust-the-parse bundle:
 * 1. Stated-once tz header ("All times PT") — triggers the detected-source-tz indicator
 * 2. Sessions NOT in chronological input order (5:00 PM before 9:00 AM) — shows re-sort
 * 3. A no-time row ("Networking Lunch") — shows "no time — not exported" hint
 * 4. One session with an explicit inline tz override ("14:00 CET") — overrides stated-once PT
 *
 * Source timezone: PT (America/Los_Angeles) via stated-once header.
 * Reference date: 2026-06-16
 *
 * Known conversions on 2026-06-16 (summer, PDT active = UTC-7, CEST active = UTC+2):
 *  9:00 AM PDT  → 16:00 UTC → varies by viewer
 *  2:00 PM PDT  → 21:00 UTC
 *  5:00 PM PDT  → 00:00 UTC next day
 *  14:00 CEST   → 12:00 UTC (inline CET/CEST override, authoritative for that session)
 */
export const SAMPLE_TEXT = `All times PT
2026-06-16
Community Q&A — 5:00 PM
Opening Keynote — 9:00 AM
Workshop: Building with AI — 2:00 PM
CEST Deep Dive — 14:00 CET
Networking Lunch`;

export const SAMPLE_SOURCE_TZ = "UTC";
