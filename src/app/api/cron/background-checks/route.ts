import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getBackgroundCheckProvider } from "@/lib/background-check/volunteerbadge";
import { expiryFrom } from "@/lib/background-check/eligibility";

// Polls the provider for checks that have not resolved, and closes the gap that webhooks
// leave.
//
// WHY THIS EXISTS. A webhook is best-effort delivery, and this codebase has now been bitten
// three times by trusting one: Stripe's endpoint pointed at a redirecting apex domain and
// every delivery failed silently for a day; ACH gifts would have vanished because the
// handler returned early on an unsettled status; and a background check has sat 'invited'
// for over an hour with no delivery of any kind.
//
// The failure mode is always the same and always invisible: the system behaves correctly,
// nobody is told, and a person who paid is left unable to attend. Polling is the answer,
// because it asks rather than waits.
//
// This does NOT replace the webhook. The webhook is faster and remains the primary path.
// This is the net underneath it.

export const dynamic = "force-dynamic";

/** Don't poll immediately; give the webhook a fair chance to arrive first. */
const MIN_AGE_MINUTES = 15;

/** How many to reconcile per run. Their API is not rate-limit documented, so be modest. */
const BATCH = 25;

/**
 * Reconciles checks that have not resolved. Exported so the admin view can call it directly
 * rather than waiting for the schedule.
 *
 * That matters because this cron runs DAILY, not every two hours as first written. Vercel's
 * Hobby plan caps cron frequency at once per day, and the sub-daily schedule silently failed
 * four consecutive deployments before anyone noticed. A stuck check waiting up to 24 hours
 * is too slow for someone who has paid and cannot attend, so the real answer is to reconcile
 * when a human looks at the list, and let the cron be the backstop for when nobody does.
 */
export async function reconcileStuckChecks(limit = BATCH) {
  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - MIN_AGE_MINUTES * 60_000).toISOString();

  const { data: stuck } = await supabase
    .from("contacts")
    .select("id, email, background_check_id, background_check_status")
    .in("background_check_status", ["invited", "pending"])
    .not("background_check_id", "is", null)
    .lt("background_check_invited_at", cutoff)
    .order("background_check_invited_at", { ascending: true })
    .limit(limit);

  if (!stuck?.length) return { checked: 0, updated: 0 };

  const provider = getBackgroundCheckProvider();
  let updated = 0;

  for (const contact of stuck) {
    try {
      const state = await provider.getStatus(contact.background_check_id!);
      if (state.status === contact.background_check_status) continue;

      const completed = state.completedAt ?? new Date();
      await supabase
        .from("contacts")
        .update({
          background_check_status: state.status,
          background_check_completed_at:
            state.status === "clear" || state.status === "flagged"
              ? completed.toISOString()
              : null,
          background_check_expires_at:
            state.status === "clear" ? expiryFrom(completed).toISOString() : null,
          // See the webhook path: a status change invalidates any prior alert.
          background_check_alerted_at: null,
        })
        .eq("id", contact.id)
        // A webhook arriving mid-poll wins rather than being overwritten by a staler read.
        .eq("background_check_status", contact.background_check_status);

      updated++;
      console.log(
        `Background check reconcile: ${contact.email} ${contact.background_check_status} -> ${state.status} (raw "${state.raw}")`
      );
    } catch (err) {
      console.error(
        `Background check reconcile: ${contact.background_check_id} failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return { checked: stuck.length, updated };
}

export async function GET(req: NextRequest) {
  // Same guard as the other crons: Vercel sends the secret, nobody else should reach this.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Reconcile first, then alert. Order matters: polling may resolve a check that would
    // otherwise have been reported as stalled, and an alert about a problem that fixed
    // itself thirty seconds ago is exactly the kind of noise that gets a channel muted.
    const result = await reconcileStuckChecks();

    const { sendBackgroundCheckAlerts } = await import(
      "@/lib/background-check/alert"
    );
    const alerts = await sendBackgroundCheckAlerts();

    return NextResponse.json({ ...result, alerts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Background check cron failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
