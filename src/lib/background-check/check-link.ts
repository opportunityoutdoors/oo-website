// The background check link we put in emails: a page on our own domain that forwards to the
// person's VolunteerBadge page (src/app/background-check/page.tsx).
//
// Resend flagged the VolunteerBadge URL because its domain does not match the one we send
// from, and spam filters score that. A link on our domain also lets us answer a finished or
// expired check with a message instead of a VolunteerBadge error.
//
// Keyed on the registration token, which every approved registration already has. With no
// token the raw VolunteerBadge link still works, so the email never goes out without one.

export function checkLinkFor(token: string | null | undefined, volunteerBadgeUrl: string): string {
  if (!token) return volunteerBadgeUrl;
  // Production's value ends in a slash, so it is trimmed rather than doubled.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org").replace(/\/+$/, "");
  return `${base}/background-check?token=${encodeURIComponent(token)}`;
}
