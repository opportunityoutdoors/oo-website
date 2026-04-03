import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Bulk update registration statuses
export async function PATCH(request: NextRequest) {
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
      from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
      to: email,
      subject: `You're In! Complete Your ${eventTitle} Registration`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p style="font-size: 16px; line-height: 1.6;">Hey ${firstName},</p>

          <p style="font-size: 16px; line-height: 1.6;">
            Great news! You're officially invited to <strong>${eventTitle}</strong>. We're excited to have you join us.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            To lock in your spot, you need to complete your registration. This includes signing the waiver${cost ? ` and paying the registration fee (${cost})` : ""}.
          </p>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${registerUrl}" style="display: inline-block; background-color: #2D5016; color: #ffffff; padding: 14px 32px; border-radius: 4px; text-decoration: none; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
              Complete Registration
            </a>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            This link is unique to you. Please don't share it with anyone else.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            If you have any questions, reply to this email or reach out at
            <a href="mailto:info@opportunityoutdoors.org" style="color: #2D5016; font-weight: 600;">info@opportunityoutdoors.org</a>.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            See you in the field!<br />
            — The Opportunity Outdoors Team
          </p>
        </div>
      `,
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
      from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
      to: email,
      subject: `Update on Your ${eventTitle} Registration`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p style="font-size: 16px; line-height: 1.6;">Hey ${firstName},</p>

          <p style="font-size: 16px; line-height: 1.6;">
            Thank you for signing up for <strong>${eventTitle}</strong>. We really appreciate your interest in Opportunity Outdoors and getting involved with the community.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            Unfortunately, we're only able to accommodate a certain number of participants for this event, and we weren't able to include everyone this time around. We know that's not the news you were hoping for, and we're sorry.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            But this isn't the end of the road. We have events throughout the year, and we'd love to see you at the next one. Here are some ways to stay involved in the meantime:
          </p>

          <ul style="font-size: 16px; line-height: 1.8; padding-left: 20px;">
            <li><a href="https://opportunityoutdoors.org/events" style="color: #2D5016; font-weight: 600;">Check out upcoming events</a></li>
            <li><a href="https://opportunityoutdoors.org/get-involved" style="color: #2D5016; font-weight: 600;">Other ways to get involved</a></li>
            <li>Follow us on <a href="${process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/opportunityoutdoors/"}" style="color: #2D5016; font-weight: 600;">Instagram</a> for updates</li>
          </ul>

          <p style="font-size: 16px; line-height: 1.6;">
            Thanks for being part of the OO community. We'll see you out there.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            — The Opportunity Outdoors Team
          </p>
        </div>
      `,
    });
  }
}
