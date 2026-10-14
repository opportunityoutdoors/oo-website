import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderApproval } from "@/emails";

// The registration invite, sent when someone is approved for a camp. Shared by the bulk
// approve in /api/admin/registrations and the board panel, which approves board mentors.

export async function sendApprovalEmails(
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
