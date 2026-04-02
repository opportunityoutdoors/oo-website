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

  const { data, error } = await supabase
    .from("registrations")
    .update({ status })
    .in("id", ids)
    .select("*, contacts(email, first_name), events(title)");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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

// Send denial notification emails
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
