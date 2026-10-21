// What VolunteerBadge's invite email looks like, so every place that tells someone to find it
// describes the same thing. Read off a real invite on 2026-10-21.
//
// Their subject is "Opportunity Outdoors — Volunteer Application" and cannot be changed
// through the API. It says "volunteer" to mentees too, so every instruction says it is meant
// for everyone attending. The subject is quoted without its dash because our public copy
// carries none, and searching for "Volunteer Application" finds it either way.

export const INVITE_SENDER = "Opportunity Outdoors via VolunteerBadge";
export const INVITE_SUBJECT_WORDS = "Volunteer Application";
/** The word to search for. Matches the sender's address, noreply@volunteerbadge.com. */
export const INVITE_SEARCH = "VolunteerBadge";

/** VolunteerBadge links stop working 7 days after the invite. */
export const INVITE_LINK_DAYS = 7;

/** One sentence that tells someone how to find the invite in their inbox. */
export const INVITE_SEARCH_HELP =
  `Search your inbox and spam folder for "${INVITE_SEARCH}". The email is from ` +
  `"${INVITE_SENDER}" and the subject says "${INVITE_SUBJECT_WORDS}". It is for everyone ` +
  `coming to camp, not only volunteers.`;

/**
 * When the invite link stops working. VolunteerBadge returns an expiry with the invite; when
 * it did not, the 7 days their email states are counted from when we sent it.
 */
export function inviteLinkExpiry(
  urlExpiresAt: string | null,
  invitedAt: string | null
): Date | null {
  if (urlExpiresAt) return new Date(urlExpiresAt);
  if (invitedAt) return new Date(new Date(invitedAt).getTime() + INVITE_LINK_DAYS * 86_400_000);
  return null;
}

/** Day 3 reminder: at least this long after the invite. */
export const FIRST_REMINDER_DAYS = 3;
/**
 * Final reminder: once the link has this many hours or fewer left. The cron runs once a day,
 * so the last run before a 7-day link dies always lands in its final 24 hours. 30 gives slack
 * for a late run without ever reaching back to day 5.
 */
export const FINAL_REMINDER_HOURS_LEFT = 30;

export type ReminderDue = "first" | "final" | null;

/**
 * Which reminder, if any, is due now. Pure, so the schedule is tested rather than trusted.
 *
 * Never once the link has expired: a reminder that points at a dead link is worse than none,
 * and that case goes to staff instead. `sent` makes each reminder go once. Someone first seen
 * late (a missed run, a long outage) gets only the final one rather than both on one day.
 */
export function reminderDue(input: {
  invitedAt: string | null;
  urlExpiresAt: string | null;
  sent: number;
  now?: Date;
}): ReminderDue {
  const now = input.now ?? new Date();
  if (!input.invitedAt) return null;
  const expiry = inviteLinkExpiry(input.urlExpiresAt, input.invitedAt);
  if (!expiry || now >= expiry) return null;

  const hoursLeft = (expiry.getTime() - now.getTime()) / 3_600_000;
  const daysSinceInvite = (now.getTime() - new Date(input.invitedAt).getTime()) / 86_400_000;

  if (hoursLeft <= FINAL_REMINDER_HOURS_LEFT) return input.sent < 2 ? "final" : null;
  if (daysSinceInvite >= FIRST_REMINDER_DAYS && input.sent < 1) return "first";
  return null;
}
