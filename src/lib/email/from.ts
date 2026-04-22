// Single source of truth for the transactional email From address.
// Set NOTIFICATIONS_FROM in Vercel env vars; the fallback matches the historical
// hardcoded value so behavior is unchanged if the env var is missing.
export const NOTIFICATIONS_FROM =
  process.env.NOTIFICATIONS_FROM ||
  "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>";
