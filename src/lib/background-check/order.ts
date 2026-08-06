import { createServiceClient } from "@/lib/supabase/server";
import { evaluateEligibility } from "./eligibility";
import { getBackgroundCheckProvider } from "./volunteerbadge";

// Ordering a background check for a contact, and recording that we did.
//
// Called from the Stripe webhook once a camp payment settles. Deliberately not called from
// the registration form: a check ordered before payment is money spent on someone who may
// never come, and the whole point of check-after-pay is that they are committed by then.

export type OrderOutcome =
  | { ordered: true; providerCheckId: string; applicantUrl: string | null }
  | { ordered: false; reason: string };

/**
 * Orders a check if this person actually needs one.
 *
 * Re-evaluates eligibility here rather than trusting the caller. The fee was computed when
 * the form was rendered, possibly minutes earlier, and in between the person may have been
 * screened through another registration. Checking again costs one query and prevents paying
 * twice for the same person.
 *
 * Never throws. A failure to order is logged and reported, because by the time this runs the
 * camp payment has already succeeded and the registration is complete. Losing a payment over
 * a screening API hiccup would be a far worse outcome than an unordered check an admin can
 * see and retry.
 */
export async function orderBackgroundCheckIfNeeded(
  contactId: string
): Promise<OrderOutcome> {
  const supabase = createServiceClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select(
      "id, email, first_name, last_name, date_of_birth, background_check_status, background_check_expires_at"
    )
    .eq("id", contactId)
    .single();

  if (error || !contact) {
    return { ordered: false, reason: `contact ${contactId} not found` };
  }

  if (!contact.email) {
    // Minors registered by a guardian have no email of their own. They are also never
    // screened, so this is expected rather than a problem.
    return { ordered: false, reason: "contact has no email" };
  }

  const eligibility = evaluateEligibility({
    dateOfBirth: contact.date_of_birth,
    status: contact.background_check_status,
    expiresAt: contact.background_check_expires_at,
  });

  if (eligibility.kind !== "needs_check") {
    return { ordered: false, reason: eligibility.kind };
  }

  // Claim the slot BEFORE calling the provider. If the call succeeds but the process dies
  // before the response is written, a retry would order and pay for a second check. Marking
  // 'invited' first means the re-evaluation above sees in_progress and stops. The cost of
  // being wrong in this direction is a stuck 'invited' row an admin can reset, rather than
  // a duplicate charge.
  const { data: claimed } = await supabase
    .from("contacts")
    .update({ background_check_status: "invited" })
    .eq("id", contactId)
    .eq("background_check_status", contact.background_check_status)
    .select("id");

  if (!claimed?.length) {
    return { ordered: false, reason: "another request claimed this check first" };
  }

  try {
    const provider = getBackgroundCheckProvider();
    const result = await provider.invite({
      contactId: contact.id,
      email: contact.email,
      firstName: contact.first_name,
      lastName: contact.last_name,
    });

    await supabase
      .from("contacts")
      .update({
        background_check_provider: provider.name,
        background_check_id: result.providerCheckId,
        // Stored so the confirmation page can link straight to the form. Completion must
        // never depend on an invite email arriving and being noticed.
        background_check_url: result.applicantUrl,
        background_check_invited_at: new Date().toISOString(),
        background_check_url_expires_at: result.expiresAt?.toISOString() ?? null,
      })
      .eq("id", contactId);

    console.log(
      `Background check ordered for contact ${contactId}: ${result.providerCheckId}` +
        (result.sandbox ? " [SANDBOX, no email sent]" : "") +
        (result.applicantUrl ? ` -> ${result.applicantUrl}` : "")
    );
    return {
      ordered: true,
      providerCheckId: result.providerCheckId,
      applicantUrl: result.applicantUrl,
    };
  } catch (err) {
    // Release the claim so a retry can work, rather than leaving someone stuck 'invited'
    // with no invitation ever sent.
    await supabase
      .from("contacts")
      .update({ background_check_status: contact.background_check_status })
      .eq("id", contactId)
      .eq("background_check_status", "invited");

    const message = err instanceof Error ? err.message : String(err);
    console.error(`Failed to order background check for ${contactId}:`, message);
    return { ordered: false, reason: `provider error: ${message}` };
  }
}
