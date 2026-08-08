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

/** How far ahead to warn about a clear result lapsing. */
const EXPIRY_HORIZON_DAYS = 60;

export async function GET(req: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const supabase = createServiceClient();
  const eventId = req.nextUrl.searchParams.get("eventId");

  // Reconcile before reading. The cron that would otherwise do this runs daily, because
  // Vercel's Hobby plan caps cron frequency at once per day, and 24 hours is far too long
  // to leave someone paid and unscreened. Doing it here means the answer is current the
  // moment an admin looks, which is exactly when it matters.
  //
  // Never fatal: if the provider is unreachable the list still renders from stored state,
  // which is stale rather than absent.
  try {
    const { reconcileStuckChecks } = await import(
      "@/app/api/cron/background-checks/route"
    );
    const result = await reconcileStuckChecks();
    if (result.updated > 0) {
      console.log(`Admin view reconciled ${result.updated} background check(s)`);
    }
  } catch (err) {
    console.error(
      "Admin view could not reconcile background checks:",
      err instanceof Error ? err.message : String(err)
    );
  }

  // Paid registrants, with the check state of the person behind each. Scoped to an event
  // when asked, because "is everyone coming to this camp screened" is the question that
  // actually gets asked, and it is asked per event.
  let query = supabase
    .from("registrations")
    .select(
      "id, role, payment_status, event_id, events(title, date_start), contacts(id, email, first_name, last_name, date_of_birth, background_check_status, background_check_expires_at, background_check_url, background_check_invited_at)"
    )
    .eq("payment_status", "paid");

  if (eventId) query = query.eq("event_id", eventId);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const now = new Date();

  const rows = (data ?? [])
    .map((r) => {
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
        eventId: r.event_id,
        event: ev?.title ?? null,
        eventDate: ev?.date_start ?? null,
        name: [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email,
        email: c?.email ?? null,
        role: r.role,
        dateOfBirth: c?.date_of_birth ?? null,
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
    })
    // Events that already happened are history, not a task. Screening someone for a camp
    // last spring is not work anyone should be shown.
    .filter((r) => !r.eventDate || new Date(r.eventDate) >= now)
    // Soonest event first: urgency is the only sensible order for a queue whose whole
    // purpose is "who is not ready in time".
    .sort((a, b) => {
      if (!a.eventDate) return 1;
      if (!b.eventDate) return -1;
      return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
    });

  // Clears about to lapse. Not a problem yet, which is the point: a returning mentor whose
  // cover runs out before the next camp is far cheaper to handle two months early than on
  // the day. Independent of registrations, because the question is about people, not events.
  const horizon = new Date(now);
  horizon.setUTCDate(horizon.getUTCDate() + EXPIRY_HORIZON_DAYS);

  const { data: expiring } = await supabase
    .from("contacts")
    .select("id, email, first_name, last_name, background_check_expires_at")
    .eq("background_check_status", "clear")
    .gte("background_check_expires_at", now.toISOString())
    .lte("background_check_expires_at", horizon.toISOString())
    .order("background_check_expires_at", { ascending: true });

  // The audit log, org wide. The screening policy requires these records exist; being able
  // to read them without already knowing which contact to look up is what makes them usable.
  const { data: decisions } = await supabase
    .from("background_check_reviews")
    .select(
      "id, decided_at, decision, panel_present, reason, status_before, status_after, contacts(id, first_name, last_name, email), admin_users(email)"
    )
    .order("decided_at", { ascending: false })
    .limit(25);

  return NextResponse.json({
    total: rows.length,
    needingAttention: rows.filter((r) => r.needsAttention).length,
    rows,
    expiringSoon: (expiring ?? []).map((c) => ({
      contactId: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email,
      email: c.email,
      expiresAt: c.background_check_expires_at,
    })),
    recentDecisions: (decisions ?? []).map((d) => {
      const c = Array.isArray(d.contacts) ? d.contacts[0] : d.contacts;
      const by = Array.isArray(d.admin_users) ? d.admin_users[0] : d.admin_users;
      return {
        id: d.id,
        decidedAt: d.decided_at,
        decision: d.decision,
        panelPresent: d.panel_present,
        reason: d.reason,
        statusBefore: d.status_before,
        statusAfter: d.status_after,
        contactId: c?.id ?? null,
        contactName:
          [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Unknown",
        by: by?.email ?? null,
      };
    }),
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
