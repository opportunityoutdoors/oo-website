import { NextRequest, NextResponse } from "next/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { orderBackgroundCheckIfNeeded } from "@/lib/background-check/order";
import { evaluateEligibility } from "@/lib/background-check/eligibility";

// Admin view of, and retry for, background checks.
//
// Exists because ordering can fail after the money has already been taken. It did, on the
// first live run: a misnamed environment variable meant a paid registration ordered no
// check, released its claim back to 'none', and left the person with a confirmation page
// promising an email that was never sent. Everything behaved correctly and nothing was
// visible, which is the combination worth engineering against.
//
// GET lists people who have paid and are not screened. POST retries one.

export async function GET(req: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const supabase = createServiceClient();
  const eventId = req.nextUrl.searchParams.get("eventId");

  // Paid registrants, with the check state of the person behind each. Scoped to an event
  // when asked, because "is everyone coming to this camp screened" is the question that
  // actually gets asked, and it is asked per event.
  let query = supabase
    .from("registrations")
    .select(
      "id, role, payment_status, event_id, events(title), contacts(id, email, first_name, last_name, date_of_birth, background_check_status, background_check_expires_at, background_check_url, background_check_invited_at)"
    )
    .eq("payment_status", "paid");

  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((r) => {
    const c = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
    const ev = Array.isArray(r.events) ? r.events[0] : r.events;
    const eligibility = evaluateEligibility({
      dateOfBirth: c?.date_of_birth ?? null,
      status: c?.background_check_status ?? "none",
      expiresAt: c?.background_check_expires_at ?? null,
    });

    return {
      registrationId: r.id,
      contactId: c?.id ?? null,
      event: ev?.title ?? null,
      name: [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email,
      email: c?.email ?? null,
      role: r.role,
      status: c?.background_check_status ?? "none",
      expiresAt: c?.background_check_expires_at ?? null,
      invitedAt: c?.background_check_invited_at ?? null,
      applicantUrl: c?.background_check_url ?? null,
      eligibility: eligibility.kind,
      // The whole point of the endpoint: paid, and not cleared to attend.
      needsAttention:
        eligibility.kind === "needs_check" ||
        eligibility.kind === "unknown_age" ||
        eligibility.kind === "blocked" ||
        c?.background_check_status === "flagged" ||
        c?.background_check_status === "error",
    };
  });

  return NextResponse.json({
    total: rows.length,
    needingAttention: rows.filter((r) => r.needsAttention).length,
    rows,
  });
}

export async function POST(req: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  let contactId: string | undefined;
  try {
    contactId = (await req.json())?.contactId;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  // Idempotent by design: re-evaluates eligibility and declines to order a second check for
  // someone already covered or already in progress. Safe to click twice.
  const outcome = await orderBackgroundCheckIfNeeded(contactId);

  if (!outcome.ordered) {
    return NextResponse.json(
      { ordered: false, reason: outcome.reason },
      // Not an error status: "already covered" and "is a minor" are correct answers, and a
      // 4xx would make the admin UI shout about a non-problem.
      { status: 200 }
    );
  }

  return NextResponse.json({
    ordered: true,
    providerCheckId: outcome.providerCheckId,
    applicantUrl: outcome.applicantUrl,
  });
}
