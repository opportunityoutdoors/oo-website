import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";

// Sends the background check invite from us, with the person's VolunteerBadge link.
//
// The check is ordered link-only (volunteerbadge.ts), so VolunteerBadge sends nothing and this
// is the only email carrying the link. A failure is reported, never thrown: the order already
// succeeded, the link is saved, the after-payment page shows it, and the reminders carry it.

export async function sendBackgroundCheckInvite(
  contactId: string,
  checkUrl: string,
  expiresAt: Date | null
): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; background check invite not sent");
    return false;
  }

  const supabase = createServiceClient();
  const { data: contact } = await supabase
    .from("contacts")
    .select("email, first_name")
    .eq("id", contactId)
    .single();
  if (!contact?.email) {
    console.error(`Background check invite not sent: contact ${contactId} has no email`);
    return false;
  }

  // The camp they just paid for, for the subject line. The soonest upcoming paid one.
  const { data: regs } = await supabase
    .from("registrations")
    .select("events(title, date_start)")
    .eq("contact_id", contactId)
    .eq("payment_status", "paid");
  const upcoming = (regs ?? [])
    .map((r) => (Array.isArray(r.events) ? r.events[0] : r.events) as { title: string; date_start: string | null } | null)
    .filter((e): e is { title: string; date_start: string | null } => !!e && (!e.date_start || new Date(e.date_start) >= new Date()))
    .sort((a, b) => Date.parse(a.date_start ?? "") - Date.parse(b.date_start ?? ""));
  const eventTitle = upcoming[0]?.title ?? "camp";

  try {
    const { Resend } = await import("resend");
    const { renderBackgroundCheckInvite } = await import("@/emails");
    const { error } = await new Resend(apiKey).emails.send({
      from: NOTIFICATIONS_FROM,
      to: contact.email,
      replyTo: REPLY_TO,
      subject: `Complete your background check for ${eventTitle}`,
      html: await renderBackgroundCheckInvite({
        firstName: contact.first_name ?? undefined,
        eventTitle,
        checkUrl,
        linkExpires: expiresAt
          ? expiresAt.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "America/New_York",
            })
          : null,
      }),
    });
    if (error) {
      console.error(`Background check invite to ${contact.email} failed:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Background check invite to ${contact.email} failed:`, err);
    return false;
  }
}
