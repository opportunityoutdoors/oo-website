import { NextRequest, NextResponse } from "next/server";
import { apiRequireMember } from "@/lib/admin/auth";
import { orderBackgroundCheckIfNeeded } from "@/lib/background-check/order";

// Retry for background checks.
//
// Exists because ordering can fail after the money has already been taken. It did, on the
// first live run: a misnamed environment variable meant a paid registration ordered no
// check, released its claim back to 'none', and left the person with a confirmation page
// promising an email that was never sent. Everything behaved correctly and nothing was
// visible, which is the combination worth engineering against.
//
// POST orders a background check for one contact.
//
// The GET that listed everyone paid-and-unscreened was removed with the org-wide screening
// page: OO runs one camp at a time, so that question is answered on the event itself. The
// reconcile-on-read it performed moved to the event detail route rather than being dropped.

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
