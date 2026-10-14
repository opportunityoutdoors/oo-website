import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderApproval, renderDenial } from "@/emails";
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

  // For approvals, generate unique tokens + cascade to linked minors
  if (status === "approved") {
    const allApprovedIds = [...ids];

    for (const id of ids) {
      const token = randomBytes(24).toString("hex");
      await supabase
        .from("registrations")
        .update({ status, token })
        .eq("id", id);

      // Find linked minors (where guardian_registration_id = this id)
      const { data: linkedMinors } = await supabase
        .from("registrations")
        .select("id")
        .eq("guardian_registration_id", id);

      if (linkedMinors?.length) {
        for (const minor of linkedMinors) {
          const minorToken = randomBytes(24).toString("hex");
          await supabase
            .from("registrations")
            .update({ status, token: minorToken })
            .eq("id", minor.id);
          allApprovedIds.push(minor.id);
        }
      }
    }

    // Fetch updated registrations — only send emails to those with email (not minors)
    const { data } = await supabase
      .from("registrations")
      .select("*, contacts(email, first_name), events(title, slug, cost)")
      .in("id", ids); // Only parent IDs, not minors

    if (data?.length) {
      sendApprovalEmails(data).catch((err) =>
        console.error("Approval email error:", err)
      );
    }

    await logAll(allApprovedIds);
    return NextResponse.json({ updated: allApprovedIds.length });
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
    .in("id", ids)
    .select("*, contacts(email, first_name), events(title, slug)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Cascade status to linked minors
  for (const id of ids) {
    await supabase
      .from("registrations")
      .update(resetFields)
      .eq("guardian_registration_id", id);
  }

  await logAll(ids);

  // Send denial emails automatically
  if (status === "denied" && data?.length) {
    sendDenialEmails(data).catch((err) =>
      console.error("Denial email error:", err)
    );
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

// ─── Email: Approval ───

async function sendApprovalEmails(
  registrations: Array<{
    token: string | null;
    contacts: { email: string; first_name: string | null } | null;
    events: { title: string; slug: string | null; cost: string | null } | null;
  }>
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  for (const reg of registrations) {
    const email = reg.contacts?.email;
    if (!email || !reg.token) continue;

    const firstName = reg.contacts?.first_name || "there";
    const eventTitle = reg.events?.title || "our upcoming event";
    const slug = reg.events?.slug || "event";
    const cost = reg.events?.cost;
    const registerUrl = `${baseUrl}/events/${slug}/register?token=${reg.token}`;

    await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      replyTo: REPLY_TO,
      to: email,
      subject: `You're In! Complete Your ${eventTitle} Registration`,
      html: await renderApproval({ firstName, eventTitle, cost, registerUrl }),
    });
  }
}

// ─── Email: Denial ───

async function sendDenialEmails(
  registrations: Array<{
    contacts: { email: string; first_name: string | null } | null;
    events: { title: string } | null;
  }>
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  for (const reg of registrations) {
    const email = reg.contacts?.email;
    if (!email) continue;

    const firstName = reg.contacts?.first_name || "there";
    const eventTitle = reg.events?.title || "our upcoming event";

    await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      replyTo: REPLY_TO,
      to: email,
      subject: `Update on Your ${eventTitle} Registration`,
      html: await renderDenial({
        firstName,
        eventTitle,
        instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL,
      }),
    });
  }
}
