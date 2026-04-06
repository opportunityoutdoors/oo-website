import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find events where waitlistCloses was within the last 48 hours
  // and reminder hasn't been sent yet
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug, date_start, date_end, location, meeting_slots")
    .eq("waitlist_reminder_sent", false)
    .not("status", "in", '("archived","completed")')
    .lte("date_start", now.toISOString()); // Has a date set

  if (!events?.length) {
    return NextResponse.json({ message: "No reminders to send", sent: 0 });
  }

  // We need to check waitlistCloses from Sanity data synced to Supabase
  // But waitlistCloses isn't in the events table — it's in Sanity only
  // Let's fetch from Sanity to check
  const { client } = await import("@/lib/sanity");

  let totalSent = 0;

  for (const event of events) {
    // Fetch waitlistCloses from Sanity
    const sanityEvent = await client.fetch(
      `*[_type == "event" && _id == $id][0] { waitlistCloses }`,
      { id: event.id }
    );

    // Try matching by title if sanity_id lookup fails
    let waitlistCloses: string | null = sanityEvent?.waitlistCloses || null;

    if (!waitlistCloses) {
      // Look up by sanity_id stored on the event
      const { data: dbEvent } = await supabase
        .from("events")
        .select("sanity_id")
        .eq("id", event.id)
        .single();

      if (dbEvent?.sanity_id) {
        const sanityData = await client.fetch(
          `*[_type == "event" && _id == $id][0] { waitlistCloses }`,
          { id: dbEvent.sanity_id }
        );
        waitlistCloses = sanityData?.waitlistCloses || null;
      }
    }

    if (!waitlistCloses) continue;

    const closeDate = new Date(waitlistCloses);

    // Check if waitlist closed within the last 48 hours
    if (closeDate > now || closeDate < twoDaysAgo) continue;

    // Get all waitlisted registrations for this event
    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, meeting_date_selected, meeting_change_token, contacts(email, first_name)")
      .eq("event_id", event.id)
      .in("status", ["waitlist", "meeting_rsvp"]);

    if (!registrations?.length) {
      // No one to notify — mark as sent
      await supabase
        .from("events")
        .update({ waitlist_reminder_sent: true })
        .eq("id", event.id);
      continue;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) continue;

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";

    const meetingSlots = (event.meeting_slots || []) as Array<{
      date?: string;
      label: string;
      meetingLink?: string;
    }>;

    for (const reg of registrations) {
      const contact = Array.isArray(reg.contacts)
        ? reg.contacts[0]
        : reg.contacts;
      if (!contact?.email) continue;

      const firstName = contact.first_name || "there";
      const selectedSlot = meetingSlots.find((s) => s.label === reg.meeting_date_selected);

      const meetingDate = selectedSlot?.date
        ? new Date(selectedSlot.date).toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : reg.meeting_date_selected || "TBD";

      const meetLink = selectedSlot?.meetingLink;
      const changeUrl = reg.meeting_change_token
        ? `${baseUrl}/events/${event.slug}/meeting-change?token=${reg.meeting_change_token}`
        : null;

      try {
        await resend.emails.send({
          from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
          to: contact.email,
          subject: `Reminder: Your ${event.title} Meeting is Coming Up`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <p style="font-size: 16px; line-height: 1.6;">Hey ${firstName},</p>

              <p style="font-size: 16px; line-height: 1.6;">
                Just a quick reminder that your pre-camp meeting for <strong>${event.title}</strong> is coming up. Attending a meeting is required for all camp participants.
              </p>

              <div style="margin: 24px 0; padding: 16px; background: #f0ebe2; border-radius: 4px;">
                <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600;">Your Meeting</p>
                <p style="margin: 0; font-size: 14px;">${meetingDate}</p>
                ${meetLink ? `<p style="margin: 8px 0 0; font-size: 14px;"><a href="${meetLink}" style="color: #2D5016; font-weight: 600;">Join Meeting</a></p>` : ""}
              </div>

              <p style="font-size: 16px; line-height: 1.6;">
                During the meeting, we'll cover safety protocols, camp logistics, what to expect, and answer any questions you have. It's an important step before camp, so please make sure to attend.
              </p>

              ${changeUrl ? `
              <p style="font-size: 14px; line-height: 1.6; color: #666;">
                Can't make this date? <a href="${changeUrl}" style="color: #2D5016; font-weight: 600;">Switch to a different meeting</a>.
              </p>
              ` : ""}

              <p style="font-size: 16px; line-height: 1.6;">
                Questions? Reply to this email or reach out at
                <a href="mailto:info@opportunityoutdoors.org" style="color: #2D5016; font-weight: 600;">info@opportunityoutdoors.org</a>.
              </p>

              <p style="font-size: 16px; line-height: 1.6;">
                — The Opportunity Outdoors Team
              </p>
            </div>
          `,
        });
        totalSent++;
      } catch (err) {
        console.error(`Failed to send reminder to ${contact.email}:`, err);
      }
    }

    // Mark event as reminder sent
    await supabase
      .from("events")
      .update({ waitlist_reminder_sent: true })
      .eq("id", event.id);
  }

  return NextResponse.json({ message: "Reminders processed", sent: totalSent });
}
