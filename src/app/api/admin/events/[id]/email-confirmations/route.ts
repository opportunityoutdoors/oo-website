import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderConfirmEmail } from "@/emails";
import { apiRequireMember } from "@/lib/admin/auth";
import { confirmationUrl } from "@/lib/email-confirmation";
import { EMAIL_CONFIRMATION_STARTS } from "@/lib/camp-pipeline";

// POST: email a confirm link again to every adult on this camp's waitlist whose address is not
// yet confirmed, for anyone who lost or never opened the first one. Signups from before
// confirmation existed are excluded. Safe to press twice: a person who confirmed in between
// is skipped, and the link in a repeat is the same link.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const { id: eventId } = await params;
  const supabase = createServiceClient();

  const { data: event } = await supabase.from("events").select("title").eq("id", eventId).single();
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

  const { data: regs, error } = await supabase
    .from("registrations")
    .select("contact_id, contacts(email, first_name, email_confirmed_at)")
    .eq("event_id", eventId)
    .in("status", ["waitlist", "meeting_rsvp"])
    .is("guardian_registration_id", null)
    // Signups from before confirmation existed are not asked. See EMAIL_CONFIRMATION_STARTS.
    .gte("created_at", EMAIL_CONFIRMATION_STARTS);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  type C = { email: string | null; first_name: string | null; email_confirmed_at: string | null };
  const seen = new Set<string>();
  let sent = 0;
  const failed: string[] = [];

  for (const r of regs ?? []) {
    const c = (Array.isArray(r.contacts) ? r.contacts[0] : r.contacts) as C | null;
    if (!c?.email || c.email_confirmed_at || seen.has(r.contact_id)) continue;
    seen.add(r.contact_id);
    try {
      const url = await confirmationUrl(supabase, r.contact_id);
      if (!url) continue;
      const { error: sendError } = await resend.emails.send({
        from: NOTIFICATIONS_FROM,
        replyTo: REPLY_TO,
        to: c.email,
        subject: `Confirm your email for ${event.title}`,
        html: await renderConfirmEmail({
          firstName: c.first_name ?? undefined,
          eventTitle: event.title,
          confirmUrl: url,
        }),
      });
      if (sendError) throw new Error(sendError.message);
      sent += 1;
    } catch (err) {
      console.error("Confirm request send error:", c.email, err);
      failed.push(c.email);
    }
  }

  return NextResponse.json({ sent, failed });
}
