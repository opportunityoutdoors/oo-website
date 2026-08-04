// Single source of truth for the transactional email From address.
// Set NOTIFICATIONS_FROM in Vercel env vars; the fallback matches the historical
// hardcoded value so behavior is unchanged if the env var is missing.
export const NOTIFICATIONS_FROM =
  process.env.NOTIFICATIONS_FROM ||
  "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>";

// Ongoing series mail (nurture sequences, the monthly newsletter) should not come from
// notifications@, which people learn to associate with receipts and reminders. Splitting
// the addresses also keeps a marketing deliverability problem from dragging down the
// transactional stream, since reputation is tracked per sending address.
export const MARKETING_FROM =
  process.env.MARKETING_FROM ||
  "Opportunity Outdoors <hello@send.opportunityoutdoors.org>";

// Where replies actually go.
//
// The send.opportunityoutdoors.org subdomain has NO MX records: it exists only to send, so
// anything replied to notifications@ or hello@ is discarded silently. Several templates
// invite people to "just reply to this email", which until now was untrue. The apex domain
// runs Google Workspace and does receive, so replies are pointed there.
//
// Pass this as `replyTo` on every send. It costs nothing and it is the difference between
// a donor reaching a person and shouting into a void.
export const REPLY_TO =
  process.env.REPLY_TO_EMAIL || "info@opportunityoutdoors.org";
