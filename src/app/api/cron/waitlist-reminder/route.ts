import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderWaitlistReminder } from "@/emails";
import { formatMeetingTime, daysUntil } from "@/lib/format-event-date";

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

    // The waitlist closes at the end of its day in Eastern. Remind in the 2 days after that.
    const sinceClose = -daysUntil(waitlistCloses, now);
    if (sinceClose < 1 || sinceClose > 2) continue;

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
        ? formatMeetingTime(selectedSlot.date)
        : reg.meeting_date_selected || "TBD";

      const meetLink = selectedSlot?.meetingLink;
      const changeUrl = reg.meeting_change_token
        ? `${baseUrl}/events/${event.slug}/meeting-change?token=${reg.meeting_change_token}`
        : null;

      try {
        await resend.emails.send({
          from: NOTIFICATIONS_FROM,
          replyTo: REPLY_TO,
          to: contact.email,
          subject: `Reminder: Your ${event.title} Meeting is Coming Up`,
          html: await renderWaitlistReminder({
            firstName,
            eventTitle: event.title,
            meetingDate,
            meetLink,
            changeUrl,
          }),
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
