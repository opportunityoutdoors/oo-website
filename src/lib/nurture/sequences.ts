// Timing and structure for the mentee and mentor nurture sequences.
//
// The WORDS live in copy.json next to this file, not here. Edit them either directly in
// that file or through the local copy editor at http://localhost:3000/nurture-editor
// (dev only). This file only defines the shape of that data and the helpers used to
// schedule it.
//
// Each track is two emails: a day 0 acknowledgment, and one follow-up with a short
// synopsis and a button through to the events page. The follow-up LINKS to events rather
// than embedding a list, which is why there is no "nothing scheduled" fallback to worry
// about: the page is correct whether or not anything is on the calendar.
//
// One rule that matters when editing copy.json: `key` is a stable identifier, not a
// label. It is written to nurture_sends and is what stops a step from sending twice.
// Renaming a key makes that step eligible to send again to everyone currently enrolled.
// Add new keys, never recycle old ones.
//
// Changes to copy.json take effect on the next build. Locally that needs a dev server
// restart, since JSON is imported at build time; in production it needs a deploy.

import copyData from "./copy.json";

export type NurtureTrack = "mentee" | "mentor";

export type NurtureBody = {
  subject: string;
  heading: string;
  paragraphs: string[];
  /** Path is relative to the site root; the sender resolves it against siteUrl(). */
  cta?: { label: string; path: string };
};

export type NurtureStep = {
  key: string;
  /** Days after enrollment. Step 1 is day 0 and sends inline at signup, not on the cron. */
  dayOffset: number;
  body: NurtureBody;
};

export const NURTURE_SEQUENCES = copyData as unknown as Record<
  NurtureTrack,
  NurtureStep[]
>;

export const NURTURE_TRACKS: NurtureTrack[] = ["mentee", "mentor"];

/** Steps for a track, ordered by when they send. */
export function stepsFor(track: NurtureTrack): NurtureStep[] {
  return [...NURTURE_SEQUENCES[track]].sort((a, b) => a.dayOffset - b.dayOffset);
}

/** The step sent inline at signup, so the applicant is acknowledged immediately. */
export function firstStep(track: NurtureTrack): NurtureStep {
  return stepsFor(track)[0];
}

/** Once this step is recorded, the enrollment is complete. */
export function finalStepKey(track: NurtureTrack): string {
  const steps = stepsFor(track);
  return steps[steps.length - 1].key;
}
