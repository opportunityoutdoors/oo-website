import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendDenialEmails } from "@/lib/email/denial";
import { approveRegistrations } from "@/lib/email/approval";
import { unconfirmedNames, unconfirmedRefusal } from "@/lib/email-confirmation";
import { apiRequireMember } from "@/lib/admin/auth";
import { logRegistrationEvent } from "@/lib/registration-log";

// Bulk update registration statuses
export async function PATCH(request: NextRequest) {
  // Admin surface: reject anyone without an admin_users row. Middleware only matches
  // /admin/:path*, so it never protected these API routes.
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;

  const supabase = createServiceClient();
  const body = await request.json();
  const { ids, status } = body as { ids: string[]; status: string };

  if (!ids?.length || !status) {
    return NextResponse.json({ error: "Missing ids or status" }, { status: 400 });
  }

  const validStatuses = ["waitlist", "meeting_rsvp", "approved", "denied", "registered", "attended"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // Nobody is approved until the address their invitation goes to is proven. Refused whole
  // rather than approving the rest, so a bulk approve never half-happens without anyone
  // noticing which half.
  if (status === "approved") {
    const names = await unconfirmedNames(supabase, ids);
    if (names.length) {
      return NextResponse.json({ error: unconfirmedRefusal(names) }, { status: 400 });
    }
  }

  // Captured before the update, because afterwards there is nothing left to read.
  const { data: before } = await supabase
    .from("registrations")
    .select("id, status")
    .in("id", ids);
  const previous = new Map((before ?? []).map((r) => [r.id, r.status as string]));

  // Anyone already in this status is left alone. A repeated request, such as a double-click
  // on 2026-10-22 that sent three denial emails twice, must not log, email or re-token again.
  // Re-approving would issue a new token and kill the link in the first invite.
  const changing = ids.filter((id) => previous.get(id) !== status);
  if (!changing.length) {
    return NextResponse.json({ updated: 0, emailed: 0, failed: [], unchanged: ids.length });
  }

  /**
   * Records the transition for every id given.
   *
   * Marking somebody attended is its own kind rather than a status change, because it is the
   * thing the post-survey waits on and "attended" buried in a list of status changes is
   * harder to find than it deserves to be.
   */
  const logAll = (touched: string[]) =>
    Promise.all(
      touched.map((id) =>
        logRegistrationEvent({
          registrationId: id,
          kind: status === "attended" ? "attended" : "status_change",
          source: "admin",
          actorId: member.id,
          // Per id, not shared: a bulk approve of nine people leaves nine different rows
          // behind, and "from" is the half that says what actually changed.
          fromStatus: previous.get(id) ?? null,
          toStatus: status,
        })
      )
    ).catch(() => {});

  // Tokens, linked minors and the invite email, all awaited. `failed` names anyone whose
  // invite did not send, so the admin can see who has to be contacted by hand.
  if (status === "approved") {
    const { approvedIds, emailed, failed } = await approveRegistrations(supabase, changing);
    await logAll(approvedIds);
    return NextResponse.json({ updated: approvedIds.length, emailed, failed });
  }

  // When moving back to waitlist, clear waiver and token data
  const resetFields = status === "waitlist" ? {
    status,
    token: null,
    waiver_signed: false,
    waiver_text: null,
    waiver_signature_name: null,
    waiver_signed_at: null,
    waiver_ip: null,
    payment_status: "none",
  } : { status };

  // For all other status changes, bulk update + cascade to linked minors
  const { data, error } = await supabase
    .from("registrations")
    .update(resetFields)
    .in("id", changing)
    .select("*, contacts(email, first_name, last_name), events(title, slug)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cascade status to linked minors
  for (const id of changing) {
    await supabase
      .from("registrations")
      .update(resetFields)
      .eq("guardian_registration_id", id);
  }

  await logAll(changing);

  // Denial emails, awaited, with anyone not reached named back to the admin.
  if (status === "denied" && data?.length) {
    const { emailed, failed } = await sendDenialEmails(data);
    return NextResponse.json({ updated: data.length, emailed, failed });
  }

  return NextResponse.json({ updated: data?.length || 0 });
}

// Bulk delete registrations
export async function DELETE(request: NextRequest) {
  // Admin surface: reject anyone without an admin_users row. Middleware only matches
  // /admin/:path*, so it never protected these API routes.
  //
  // NOTE: this destroys the registration and, by cascade, its entire timeline. With the board
  // offering proper exits (turned away, dropped out, each with a reason), deleting is now
  // almost always the wrong tool: it removes the record of somebody having been here at all.
  // See task 40.
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const supabase = createServiceClient();
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids?.length) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const { error } = await supabase
    .from("registrations")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}
