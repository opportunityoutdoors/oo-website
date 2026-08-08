import { NextRequest, NextResponse } from "next/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { recordReview, listReviews, type ReviewDecision } from "@/lib/background-check/review";

// Recording a Review Panel decision about a background check.
//
// GET returns a contact's review history. POST records a new decision.
//
// Deliberately NOT admin-only. The screening policy seats the whole board on the panel, and
// requiring the 'admin' role would mean an officer who is an 'editor' cannot record the
// decision they took part in. The audit row names who entered it either way.

export async function GET(req: NextRequest) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const contactId = req.nextUrl.searchParams.get("contactId");
  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }

  return NextResponse.json({ reviews: await listReviews(contactId) });
}

const DECISIONS: ReviewDecision[] = [
  "cleared",
  "adverse_action",
  "disqualified",
  "outside_check",
];

export async function POST(req: NextRequest) {
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const contactId = typeof body.contactId === "string" ? body.contactId : null;
  const decision = body.decision as ReviewDecision;

  if (!contactId) {
    return NextResponse.json({ error: "contactId is required" }, { status: 400 });
  }
  if (!DECISIONS.includes(decision)) {
    return NextResponse.json({ error: "Unknown decision." }, { status: 400 });
  }

  const outcome = await recordReview({
    contactId,
    decidedBy: member.id,
    decision,
    panelPresent: String(body.panelPresent ?? ""),
    reason: String(body.reason ?? ""),
    outsideProvider:
      typeof body.outsideProvider === "string" ? body.outsideProvider : null,
    outsideCompletedAt:
      typeof body.outsideCompletedAt === "string" ? body.outsideCompletedAt : null,
  });

  if (!outcome.ok) {
    // 400 rather than 500: every failure recordReview returns is something the person can
    // read and act on, not a server fault. Including the "logged but not applied" case,
    // which the admin needs to see rather than have swallowed as an error.
    return NextResponse.json({ error: outcome.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    statusAfter: outcome.statusAfter,
    reviewId: outcome.reviewId,
    refunds: outcome.refunds ?? null,
  });
}
