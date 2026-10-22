// What the background check invite looks like, so every place that tells someone to find it
// describes the same thing.
//
// Since 2026-10-22 we send it ourselves (send-invite.ts), ordering the check link-only so
// VolunteerBadge sends nothing. Before that it came from "Opportunity Outdoors via
// VolunteerBadge" as "Volunteer Application", which nobody recognised.

export const INVITE_SENDER = "Opportunity Outdoors";
export const INVITE_SUBJECT_WORDS = "Complete your background check";
/** The words to search for. In the invite's subject line. */
export const INVITE_SEARCH = "background check";

/**
 * VolunteerBadge links stop working this long after the invite. Raised from 7 to 14 in their
 * dashboard on 2026-10-22. Links sent before then still last 7, and carry their own expiry.
 */
export const INVITE_LINK_DAYS = 14;

/** One sentence that tells someone how to find the invite in their inbox. */
export const INVITE_SEARCH_HELP =
  `Search your inbox and spam folder for "${INVITE_SEARCH}". The email is from ` +
  `${INVITE_SENDER}, with the subject "${INVITE_SUBJECT_WORDS}".`;

/**
 * When the invite link stops working. VolunteerBadge returns an expiry with the invite; when
 * it did not, INVITE_LINK_DAYS are counted from when we sent it.
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
 * so the last run before a link dies always lands in its final 24 hours. 30 gives slack
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
