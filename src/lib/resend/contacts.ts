// Resend Contacts sync — the marketing-list side of the contact pipeline.
// Resend stores contacts at the account level, grouped by Segment. The "General"
// segment is the default marketing list; future targeting (mentees vs mentors)
// is done with additional segments filtered on the contact properties set here.
//
// Key: uses RESEND_CONTACTS_API_KEY if set (a dedicated key), otherwise falls
// back to RESEND_API_KEY. Both must have contacts-write (full access) permission.
// The account's existing key is full access, so the fallback is sufficient and
// no dedicated key is required.
import { Resend } from "resend";

// The "General" segment created in the Resend account. Override via env.
const GENERAL_SEGMENT_ID =
  process.env.RESEND_SEGMENT_ID || "96b839bf-f170-4faa-9d9d-e31675fe2bd5";

export interface ResendContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Only honored on create (backfill). Form sync never re-subscribes. */
  unsubscribed?: boolean;
  properties?: Record<string, string | number | null>;
}

/**
 * Create or update a contact in Resend's "General" segment.
 * Create assigns the segment + properties; if the contact already exists, we
 * update by email (refreshing name/properties) without touching unsubscribe state.
 * Returns "created" | "updated" | "skipped" for backfill reporting.
 */
export async function upsertResendContact(
  input: ResendContactInput,
  apiKeyOverride?: string
): Promise<"created" | "updated" | "skipped"> {
  const apiKey =
    apiKeyOverride ||
    process.env.RESEND_CONTACTS_API_KEY ||
    process.env.RESEND_API_KEY;
  if (!apiKey) return "skipped";

  const resend = new Resend(apiKey);
  const { email, firstName, lastName, unsubscribed, properties } = input;

  const created = await resend.contacts.create({
    email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    unsubscribed: unsubscribed ?? undefined,
    properties: properties || undefined,
    segments: [{ id: GENERAL_SEGMENT_ID }],
  });

  if (!created.error) return "created";

  // Already exists (or other error) — refresh details by email. Deliberately
  // omit `unsubscribed` so a form submission can never silently re-subscribe
  // someone who opted out.
  const updated = await resend.contacts.update({
    email,
    firstName: firstName ?? undefined,
    lastName: lastName ?? undefined,
    properties: properties || undefined,
  });

  if (updated.error) {
    console.error(`Resend contact upsert failed for ${email}:`, updated.error);
    return "skipped";
  }
  return "updated";
}
