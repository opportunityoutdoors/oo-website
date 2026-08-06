import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

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

  // TODO: dispatch. check.complete updates contacts.background_check_status and stamps
  // expires_at; adverse_action.completed triggers the partial refund. Logging the shape
  // first, because the payloads have not been seen yet and guessing at field names is how
  // the first real result gets dropped.
  console.log(
    `VolunteerBadge event ${name}:`,
    JSON.stringify(event).slice(0, 2000)
  );

  return NextResponse.json({ received: true });
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
