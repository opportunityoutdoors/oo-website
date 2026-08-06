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

export async function GET(req: NextRequest) {
  // Same guard as the other crons: Vercel sends the secret, nobody else should reach this.
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const cutoff = new Date(Date.now() - MIN_AGE_MINUTES * 60_000).toISOString();

  const { data: stuck, error } = await supabase
    .from("contacts")
    .select("id, email, background_check_id, background_check_status, background_check_invited_at")
    .in("background_check_status", ["invited", "pending"])
    .not("background_check_id", "is", null)
    .lt("background_check_invited_at", cutoff)
    .order("background_check_invited_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    console.error("Background check poll: query failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!stuck?.length) {
    return NextResponse.json({ checked: 0, updated: 0 });
  }

  const provider = getBackgroundCheckProvider();
  let updated = 0;
  const results: Array<{ id: string; from: string; to: string; raw: string }> = [];

  for (const contact of stuck) {
    try {
      const state = await provider.getStatus(contact.background_check_id!);

      // Nothing changed. Common and not worth a write.
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
          // Only a clear result earns an expiry, exactly as in the webhook path.
          background_check_expires_at:
            state.status === "clear" ? expiryFrom(completed).toISOString() : null,
        })
        .eq("id", contact.id)
        // Guarded so a webhook arriving mid-poll wins rather than being overwritten by a
        // staler read.
        .eq("background_check_status", contact.background_check_status);

      updated++;
      results.push({
        id: contact.id,
        from: contact.background_check_status,
        to: state.status,
        raw: state.raw,
      });

      console.log(
        `Background check poll: ${contact.email} ${contact.background_check_status} -> ${state.status} (raw "${state.raw}")`
      );
    } catch (err) {
      // One unreachable check must not stop the batch. Logged with the id so it can be
      // chased, and retried on the next run.
      console.error(
        `Background check poll: ${contact.background_check_id} failed:`,
        err instanceof Error ? err.message : String(err)
      );
    }
  }

  return NextResponse.json({ checked: stuck.length, updated, results });
}
