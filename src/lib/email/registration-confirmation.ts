import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { evaluateEligibility, type BackgroundCheckStatus } from "@/lib/background-check/eligibility";

// The camp registration confirmation, with the signed waiver attached.
//
// Sent once, when the registration is complete: from the Stripe webhook after payment, or at
// form submit when there is nothing to pay. Until 2026-10-22 it went at submit, so someone who
// stopped at checkout was told "Registration Confirmed", and the background check invite was a
// second email after payment. Now, when a check is owed and has been ordered, this email
// carries its button, so a registrant gets one email, not two.
//
// Everything is read from the registration row, so either caller passes only an id.

export async function sendRegistrationConfirmation(registrationId: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set; registration confirmation not sent");
    return false;
  }

  const supabase = createServiceClient();
  const { data: reg } = await supabase
    .from("registrations")
    .select(
      "id, role, waiver_text, waiver_signature_name, waiver_signed_at, waiver_ip, " +
        "contacts(email, first_name, last_name, date_of_birth, background_check_status, " +
        "background_check_expires_at, background_check_url, background_check_url_expires_at), " +
        "events(title, date_start, date_end, location)"
    )
    .eq("id", registrationId)
    .single();
  if (!reg) {
    console.error(`Registration confirmation not sent: registration ${registrationId} not found`);
    return false;
  }

  type Contact = {
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    date_of_birth: string | null;
    background_check_status: string | null;
    background_check_expires_at: string | null;
    background_check_url: string | null;
    background_check_url_expires_at: string | null;
  };
  type Event = { title: string; date_start: string | null; date_end: string | null; location: string | null };
  const r = reg as unknown as {
    role: string | null;
    waiver_text: string | null;
    waiver_signature_name: string | null;
    waiver_signed_at: string | null;
    waiver_ip: string | null;
    contacts: Contact | Contact[] | null;
    events: Event | Event[] | null;
  };
  const contact = Array.isArray(r.contacts) ? r.contacts[0] : r.contacts;
  const event = Array.isArray(r.events) ? r.events[0] : r.events;
  if (!contact?.email) {
    console.error(`Registration confirmation not sent: registration ${registrationId} has no email`);
    return false;
  }

  const { count: minors } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("guardian_registration_id", registrationId);

  const firstName = contact.first_name || "there";
  const participantName = [contact.first_name, contact.last_name].filter(Boolean).join(" ");
  const eventTitle = event?.title || "the upcoming event";
  // Date-only, stored as midnight UTC: read in UTC or it prints the day before.
  const eventDate = event?.date_start
    ? new Date(event.date_start).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : null;

  // The background check part. A check ordered and still open: its button. A check owed but
  // not ordered (the order failed): say a link is coming. Neither: nothing.
  const status = (contact.background_check_status ?? "none") as BackgroundCheckStatus;
  const checkUrl = status === "invited" && contact.background_check_url ? contact.background_check_url : null;
  const eligibility = evaluateEligibility({
    dateOfBirth: contact.date_of_birth,
    status,
    expiresAt: contact.background_check_expires_at,
  });
  const checkComing = !checkUrl && eligibility.kind === "needs_check";
  const linkExpires = checkUrl && contact.background_check_url_expires_at
    ? new Date(contact.background_check_url_expires_at).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "America/New_York",
      })
    : null;

  const { generateWaiverPdf } = await import("@/lib/waiver-pdf");
  const signedAt = new Date(r.waiver_signed_at ?? Date.now()).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/New_York",
  });
  const pdf = generateWaiverPdf({
    participantName,
    participantEmail: contact.email,
    eventTitle,
    eventDate,
    eventLocation: event?.location || null,
    role: r.role,
    signatureName: r.waiver_signature_name || participantName,
    signedAt,
    ipAddress: r.waiver_ip || "Unknown",
    waiverText: r.waiver_text || "",
  });
  const filename = `OO-Waiver-${participantName.replace(/\s+/g, "-")}-${eventTitle.replace(/\s+/g, "-")}.pdf`;

  try {
    const { Resend } = await import("resend");
    const { renderRegistrationConfirmation } = await import("@/emails");
    const { error } = await new Resend(apiKey).emails.send({
      from: NOTIFICATIONS_FROM,
      replyTo: REPLY_TO,
      to: contact.email,
      // The check is in the subject when it is in the email, so a search for "background
      // check" finds it.
      subject: checkUrl
        ? `You're registered for ${eventTitle}: complete your background check`
        : `Registration Confirmed: ${eventTitle}`,
      attachments: [{ filename, content: pdf.toString("base64") }],
      html: await renderRegistrationConfirmation({
        firstName,
        eventTitle,
        hasMinor: (minors ?? 0) > 0,
        isMentor: r.role === "Mentor",
        eventDate,
        location: event?.location ?? null,
        checkUrl,
        checkLinkExpires: linkExpires,
        needsBackgroundCheck: checkComing,
      }),
    });
    if (error) {
      console.error(`Registration confirmation to ${contact.email} failed:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Registration confirmation to ${contact.email} failed:`, err);
    return false;
  }
}
