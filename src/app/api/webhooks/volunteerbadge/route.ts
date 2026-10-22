import { NextRequest, NextResponse, after } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { expiryFrom } from "@/lib/background-check/eligibility";
import { checkOutcome } from "@/lib/background-check/volunteerbadge";

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
// HOW A RESULT FINDS ITS PERSON. We order with POST /applications and store the application
// id. No result event carries it (support, 2026-10-22). application.submitted links that
// application to a volunteer id, volunteer.created links a volunteer id to an email, and
// check.complete, check.adjudicated and check.error name the check id and volunteer id. So we
// keep the volunteer id from whichever of the first two arrives, and the check id from the
// first result, and match every later event on those.
//
// THEY NEVER RETRY, and wait 5 seconds for an answer. A refused or slow delivery is lost, so
// slow work (a refund) runs after the response, and the nightly poll is the net underneath.

export const dynamic = "force-dynamic";

/** Documented events. Anything outside this list is logged, not guessed at. */
const KNOWN_EVENTS = [
  "check.complete",
  "check.adjudicated",
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
    // Logged with the header NAMES, never their values. On 2026-10-22 the first two live
    // deliveries (Konnor Spencer's result) were refused here without a trace, so nobody
    // could tell what VolunteerBadge calls its signature header.
    console.error(
      "VolunteerBadge webhook refused: no x-volunteerbadge-signature header. Headers present: " +
        [...req.headers.keys()].join(", ")
    );
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
    console.error(
      `VolunteerBadge webhook refused: body is not JSON (content-type ` +
        `${req.headers.get("content-type")}, ${raw.length} bytes)`
    );
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
    // They do not retry a failed delivery, so this event is lost here; the nightly poll is
    // what recovers the result. Logged loudly so the gap can be found.
    console.error(`VolunteerBadge handler failed for ${name}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

type Contact = { id: string; email: string | null; background_check_status: string };
const CONTACT = "id, email, background_check_status";

/**
 * The contact an event belongs to, tried from the most specific id to the least: the check
 * id, the volunteer id, our stored application id (or the uuid in its apply link), and for
 * volunteer.created alone, the email of someone whose check is still open.
 */
async function findContact(
  supabase: ReturnType<typeof createServiceClient>,
  name: string,
  data: Record<string, unknown>
): Promise<{ contact: Contact; by: string } | null> {
  const checkId = firstString(data, ["checkId", "check_id"]);
  const volunteerId = firstString(data, ["volunteerId", "volunteer_id"]);
  const applicationId = firstString(data, ["applicationId", "application_id"]);
  const email = firstString(data, ["email"]);

  const one = async (column: string, value: string) =>
    (await supabase.from("contacts").select(CONTACT).eq(column, value).maybeSingle()).data as Contact | null;

  if (checkId) {
    const c = await one("background_check_check_id", checkId);
    if (c) return { contact: c, by: "check id" };
  }
  if (volunteerId) {
    const c = await one("background_check_volunteer_id", volunteerId);
    if (c) return { contact: c, by: "volunteer id" };
  }
  if (applicationId) {
    const c = await one("background_check_id", applicationId);
    if (c) return { contact: c, by: "application id" };
    const { data: byUrl } = await supabase
      .from("contacts")
      .select(CONTACT)
      .like("background_check_url", `%${applicationId}%`)
      .maybeSingle();
    if (byUrl) return { contact: byUrl as Contact, by: "apply link" };
  }
  if (name === "volunteer.created" && email) {
    const { data: byEmail } = await supabase
      .from("contacts")
      .select(CONTACT)
      .ilike("email", email)
      .in("background_check_status", ["invited", "pending"])
      .maybeSingle();
    if (byEmail) return { contact: byEmail as Contact, by: "email" };
  }
  return null;
}

/** Applies an event to the contact it belongs to. Every outcome is logged by name. */
async function dispatch(name: string, event: Record<string, unknown>) {
  const data = (event.data ?? event) as Record<string, unknown>;
  const supabase = createServiceClient();

  const found = await findContact(supabase, name, data);
  if (!found) {
    // Expected for sandbox tests and anything created in their dashboard, but for a real
    // registrant it means a result we cannot place. Loud, with the ids, so it can be matched
    // by hand.
    console.error(
      `VolunteerBadge ${name}: NO CONTACT MATCHED. ids: ` +
        JSON.stringify({
          checkId: data.checkId ?? null,
          volunteerId: data.volunteerId ?? null,
          applicationId: data.applicationId ?? null,
          sandbox: data.sandbox ?? false,
        })
    );
    return;
  }
  const { contact, by } = found;
  const volunteerId = firstString(data, ["volunteerId", "volunteer_id"]);
  const checkId = firstString(data, ["checkId", "check_id"]);

  // Linking events: remember the volunteer id so the results that follow can find them.
  if (name === "application.submitted" || name === "volunteer.created") {
    const patch: Record<string, unknown> = {};
    if (volunteerId) patch.background_check_volunteer_id = volunteerId;
    // Submitted their form: no longer waiting on them, so reminders stop.
    if (name === "application.submitted" && contact.background_check_status === "invited") {
      patch.background_check_status = "pending";
      patch.background_check_alerted_at = null;
    }
    if (Object.keys(patch).length) {
      await supabase.from("contacts").update(patch).eq("id", contact.id);
    }
    console.log(`VolunteerBadge ${name}: contact ${contact.id} (by ${by}) linked ${JSON.stringify(patch)}`);
    return;
  }

  if (name === "check.complete" || name === "check.adjudicated" || name === "check.error") {
    const status =
      name === "check.error"
        ? "error"
        : checkOutcome({
            status: firstString(data, ["status"]),
            result: firstString(data, ["result"]),
          });

    // A decision already made here, or a result already in, is never walked back by a later
    // "still pending" message.
    const settled = ["clear", "flagged", "declined"].includes(contact.background_check_status);
    const patch: Record<string, unknown> = {};
    if (checkId) patch.background_check_check_id = checkId;
    if (volunteerId) patch.background_check_volunteer_id = volunteerId;

    if (status === "pending") {
      if (!settled) patch.background_check_status = "pending";
    } else if (contact.background_check_status !== "declined") {
      const completedAt = firstString(data, ["completedAt", "completed_at"]);
      const completed = completedAt ? new Date(completedAt) : new Date();
      patch.background_check_status = status;
      patch.background_check_completed_at = completed.toISOString();
      // Only a clear result earns an expiry. A flag or an error must not look like cover.
      patch.background_check_expires_at = status === "clear" ? expiryFrom(completed).toISOString() : null;
      // Status moved, so any earlier alert is about a state that no longer exists.
      patch.background_check_alerted_at = null;
    }

    await supabase.from("contacts").update(patch).eq("id", contact.id);
    console.log(
      `VolunteerBadge ${name}: contact ${contact.id} (by ${by}) ` +
        `${contact.background_check_status} -> ${patch.background_check_status ?? contact.background_check_status} ` +
        `(status "${data.status ?? ""}", result "${data.result ?? ""}")`
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

    // Refund now that the decision is final. VolunteerBadge only emits this event after the
    // pre-adverse notice, the five business day dispute window, and the final notice, so a
    // human decided several steps ago. This issues money already owed rather than deciding
    // anything. After the response, because they wait only 5 seconds and a Stripe refund can
    // take longer. Guarded against a replay inside, and a failure is logged to issue by hand.
    after(async () => {
      try {
        const { refundAfterAdverseAction } = await import("@/lib/background-check/refund");
        const outcomes = await refundAfterAdverseAction(contact.id);
        const done = outcomes.filter((o) => o.refunded);
        console.warn(
          `VolunteerBadge adverse action COMPLETED for contact ${contact.id} (${contact.email}). ` +
            `Marked declined. Refunds issued: ${done.length}. ` +
            outcomes.map((o) => (o.refunded ? `refunded ${o.amountCents}c` : `skipped: ${o.reason}`)).join("; ")
        );
      } catch (err) {
        console.error(
          `Adverse action refund failed for contact ${contact.id}; ISSUE IT BY HAND:`,
          err instanceof Error ? err.message : String(err)
        );
      }
    });
    return;
  }

  console.log(`VolunteerBadge ${name}: recorded for contact ${contact.id} (by ${by}), no action taken`);
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
