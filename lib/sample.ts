/**
 * Sample agenda — deterministic values the verifier can assert against.
 * All sessions use a fixed date so localized times are predictable.
 * Source timezone: UTC
 *
 * Known conversions (2026-06-16, summer):
 *  16:00 UTC → 12:00 PM EDT (UTC-4) → 09:00 AM PDT (UTC-7)
 *  09:00 UTC → 05:00 AM EDT          → 02:00 AM PDT
 *  17:30 UTC → 01:30 PM EDT          → 10:30 AM PDT
 */
export const SAMPLE_TEXT = `2026-06-16
Opening Keynote — 16:00 UTC
Workshop: Building with AI — 17:30 UTC
Panel Discussion — 9:00 AM PT
Community Q&A — 5:00 PM ET
just some words with no time`;

export const SAMPLE_SOURCE_TZ = "UTC";
