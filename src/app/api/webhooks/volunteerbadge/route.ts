import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { expiryFrom } from "@/lib/background-check/eligibility";
import { mapStatus } from "@/lib/background-check/volunteerbadge";

// VolunteerBadge webhook. Receives background check results and the adverse action
// sequence.
//
// URL: https://www.opportunityoutdoors.org/api/webhooks/volunteerbadge
//
// WWW, NOT THE APEX DOMAIN. opportunityoutdoors.org 308-redirects to www, and webhook
// senders do not follow redirects. Stripe's endpoint was pointed at the apex for a day and
// every delivery failed on the redirect while the dashboard showed a healthy, enabled
// endpoint. Same trap, same silence.
//
// Handlers are deliberately not implemented yet. This exists so the URL resolves while the
// endpoint is being configured, and so signature verification is settled before anything
// depends on it. Events are logged and acknowledged.

export const dynamic = "force-dynamic";

/** Documented events. Anything outside this list is logged, not guessed at. */
const KNOWN_EVENTS = [
  "check.complete",
  "check.error",
  "application.submitted",
  "volunteer.created",
  "adverse_action.case_opened",
  "adverse_action.notice_sent",
  "adverse_action.dispute_opened",
  "adverse_action.dispute_resolved",
  "adverse_action.completed",
] as const;

export async function POST(req: NextRequest) {
  const secret = process.env.VOLUNTEERBADGE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("VOLUNTEERBADGE_WEBHOOK_SECRET is not set; refusing webhook");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = req.headers.get("x-volunteerbadge-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // Raw bytes, exactly as with Stripe. Parsing first and re-serialising changes whitespace
  // and key order, and the signature will not verify.
  const raw = await req.text();

  if (!verify(raw, signature, secret)) {
    console.error("VolunteerBadge webhook signature verification failed");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; type?: string; data?: unknown };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Their docs name the field inconsistently across examples, so accept either rather than
  // dropping everything on a guess.
  const name = event.event ?? event.type ?? "unknown";

  if (!KNOWN_EVENTS.includes(name as (typeof KNOWN_EVENTS)[number])) {
    console.warn(`VolunteerBadge: unrecognised event ${name}; acknowledged, not handled`);
    return NextResponse.json({ received: true });
  }

  // The whole payload is logged on every event, always. Their field names are not
  // documented and have already differed from the docs once (applyUrl), so the log is the
  // only record of what a real delivery actually looks like. Cheap, and the alternative is
  // guessing again after the fact.
  console.log(
    `VolunteerBadge event ${name}:`,
    JSON.stringify(event).slice(0, 4000)
  );

  try {
    await dispatch(name, event);
  } catch (err) {
    // 500 asks them to retry, which is right for a transient database failure. Matching a
    // contact is idempotent, so a retry is safe.
    console.error(`VolunteerBadge handler failed for ${name}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Applies an event to a contact.
 *
 * Written defensively rather than against a known schema, because no real payload has been
 * seen yet. Every field is looked for in several plausible places and the outcome is logged
 * explicitly, so the first live delivery either works or says precisely which lookup failed.
 * The alternative, waiting for a payload before writing any of this, means the first real
 * result arrives with nothing to catch it.
 */
async function dispatch(name: string, event: Record<string, unknown>) {
  const data = (event.data ?? event) as Record<string, unknown>;

  // Their id has appeared as applicationId in POST responses. checkId, id and
  // application_id are plausible neighbours; all are tried before giving up.
  const providerId = firstString(data, [
    "applicationId",
    "application_id",
    "checkId",
    "check_id",
    "id",
  ]);

  if (!providerId) {
    console.error(
      `VolunteerBadge ${name}: no id found in payload; cannot match a contact. ` +
        `Keys present: ${Object.keys(data).join(", ")}`
    );
    return;
  }

  const supabase = createServiceClient();

  // TWO IDS, AND THEY DIFFER. The invite response returns an applicationId AND an applyUrl
  // built on a DIFFERENT uuid:
  //
  //   applicationId : 3b6395c8-1af6-4a31-a847-a87c36232792
  //   applyUrl      : .../apply/fa41f894-6283-4701-b294-7178c973b839
  //
  // In sandbox both were the same string, so this only appears against the live API.
  // Sensible on their part, since the public link should not expose the application id, but
  // it means a webhook could reference either and matching on only one silently drops the
  // result. Try the application id first, then fall back to the link.
  let contact:
    | { id: string; email: string | null; background_check_status: string }
    | null = null;

  const byId = await supabase
    .from("contacts")
    .select("id, email, background_check_status")
    .eq("background_check_id", providerId)
    .maybeSingle();
  contact = byId.data ?? null;

  if (!contact) {
    const byUrl = await supabase
      .from("contacts")
      .select("id, email, background_check_status")
      .like("background_check_url", `%${providerId}%`)
      .maybeSingle();
    if (byUrl.data) {
      contact = byUrl.data;
      console.log(
        `VolunteerBadge ${name}: matched contact ${contact.id} via the apply URL, not the ` +
          `application id. Their webhook references the link uuid (${providerId}).`
      );
    }
  }

  if (!contact) {
    // Expected for anything created directly in their dashboard rather than by us, which is
    // worth saying plainly rather than treating as a fault.
    console.warn(
      `VolunteerBadge ${name}: no contact matches ${providerId} by application id or apply URL. ` +
        `Either it was created outside this app, or they use a third identifier we do not store.`
    );
    return;
  }

  if (name === "check.complete" || name === "check.error") {
    const rawStatus =
      firstString(data, ["status", "result", "outcome"]) ??
      (name === "check.error" ? "error" : "unknown");

    const status = mapStatus(rawStatus);
    const completedAt = firstString(data, ["completedAt", "completed_at"]);
    const completed = completedAt ? new Date(completedAt) : new Date();

    await supabase
      .from("contacts")
      .update({
        background_check_status: status,
        background_check_completed_at: completed.toISOString(),
        // Only a clear result earns an expiry. A flag or an error must not look like cover.
        background_check_expires_at:
          status === "clear" ? expiryFrom(completed).toISOString() : null,
        // Status moved, so any previous alert is about a state that no longer exists.
        // Clearing it lets the next real problem alert again instead of being silenced.
        background_check_alerted_at: null,
      })
      .eq("id", contact.id);

    console.log(
      `VolunteerBadge ${name}: contact ${contact.id} ${contact.background_check_status} -> ${status} (raw "${rawStatus}")`
    );
    return;
  }

  // The adverse action series is driven from their dashboard, so these are recorded rather
  // than acted on. The exception is completion, which is the point a decision becomes final
  // and a refund is owed.
  if (name === "adverse_action.completed") {
    await supabase
      .from("contacts")
      .update({
        background_check_status: "declined",
        background_check_reviewed_at: new Date().toISOString(),
      })
      .eq("id", contact.id);

    // Refund now that the decision is final. VolunteerBadge only emits this event after
    // the pre-adverse notice, the five business day dispute window, and the final notice,
    // so a human decided several steps ago. This issues money already owed rather than
    // deciding anything.
    //
    // Guarded against a replayed delivery by the payment_status condition inside, and never
    // fatal: a refund that fails is logged loudly and issued by hand. Throwing instead would
    // make VolunteerBadge retry an event whose database effects have already been applied,
    // which risks compounding the problem rather than fixing it.
    try {
      const { refundAfterAdverseAction } = await import(
        "@/lib/background-check/refund"
      );
      const outcomes = await refundAfterAdverseAction(contact.id);
      const done = outcomes.filter((o) => o.refunded);

      console.warn(
        `VolunteerBadge adverse action COMPLETED for contact ${contact.id} (${contact.email}). ` +
          `Marked declined. Refunds issued: ${done.length}. ` +
          outcomes
            .map((o) =>
              o.refunded ? `refunded ${o.amountCents}c` : `skipped: ${o.reason}`
            )
            .join("; ")
      );
    } catch (err) {
      console.error(
        `Adverse action refund failed for contact ${contact.id}; ISSUE IT BY HAND:`,
        err instanceof Error ? err.message : String(err)
      );
    }

    return;
  }

  console.log(`VolunteerBadge ${name}: recorded for contact ${contact.id}, no action taken`);
}

/** First key present as a non-empty string. Their payload shape is not documented. */
function firstString(
  obj: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return null;
}

/**
 * HMAC-SHA256 over the raw body, compared in constant time.
 *
 * Accepts a bare hex digest or a `sha256=` prefixed one, since the docs are not explicit
 * and both conventions are common. timingSafeEqual needs equal lengths, hence the guard:
 * passing mismatched buffers throws rather than returning false.
 */
function verify(raw: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const provided = signature.startsWith("sha256=") ? signature.slice(7) : signature;

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
