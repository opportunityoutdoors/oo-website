import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Validate a registration token and return event + contact info (including linked minor)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*, contacts(id, email, first_name, last_name, phone, city_state, tshirt_size), events(id, title, slug, event_type, date_start, date_end, location, cost)")
    .eq("token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  if (registration.status === "registered" || registration.status === "attended") {
    return NextResponse.json({ error: "already_registered", registration }, { status: 400 });
  }

  if (registration.status !== "approved") {
    return NextResponse.json({ error: "Registration not approved" }, { status: 403 });
  }

  // Check for linked minor
  const { data: linkedMinor } = await supabase
    .from("registrations")
    .select("id, role, status, contacts(id, first_name, last_name, tshirt_size)")
    .eq("guardian_registration_id", registration.id)
    .single();

  return NextResponse.json({
    ...registration,
    linked_minor: linkedMinor || null,
  });
}

// Complete registration (parent + optional minor)
export async function POST(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const {
    token,
    tshirt_size,
    emergency_contact_name,
    emergency_contact_phone,
    transportation,
    dietary_medical,
    waiver_signed,
    waiver_text,
    signature_name,
    // Minor fields
    minor_tshirt_size,
    minor_dietary_medical,
  } = body;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (!waiver_signed || !signature_name?.trim()) {
    return NextResponse.json({ error: "Waiver must be signed" }, { status: 400 });
  }

  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // Verify token and status
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, contact_id, event_id, role, status")
    .eq("token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (registration.status !== "approved") {
    return NextResponse.json({ error: "Not eligible for registration" }, { status: 403 });
  }

  const now = new Date().toISOString();

  // Update parent registration with waiver audit trail
  const { error: regError } = await supabase
    .from("registrations")
    .update({
      status: "registered",
      waiver_signed: true,
      waiver_text: waiver_text || null,
      waiver_signature_name: signature_name,
      waiver_signed_at: now,
      waiver_ip: ip,
      payment_status: "pending",
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      transportation: transportation || null,
      dietary_medical: dietary_medical || null,
    })
    .eq("id", registration.id);

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }

  // Update parent contact with t-shirt size
  if (tshirt_size) {
    await supabase
      .from("contacts")
      .update({ tshirt_size })
      .eq("id", registration.contact_id);
  }

  // Handle linked minor
  const { data: linkedMinor } = await supabase
    .from("registrations")
    .select("id, contact_id")
    .eq("guardian_registration_id", registration.id)
    .single();

  if (linkedMinor) {
    // Update minor registration (waiver signed by parent on behalf of minor)
    await supabase
      .from("registrations")
      .update({
        status: "registered",
        waiver_signed: true,
        waiver_text: waiver_text || null,
        waiver_signature_name: `${signature_name} (on behalf of minor)`,
        waiver_signed_at: now,
        waiver_ip: ip,
        payment_status: "pending",
        emergency_contact_name: emergency_contact_name || null,
        emergency_contact_phone: emergency_contact_phone || null,
        transportation: transportation || null,
        dietary_medical: minor_dietary_medical || null,
      })
      .eq("id", linkedMinor.id);

    // Update minor contact with t-shirt size
    if (minor_tshirt_size) {
      await supabase
        .from("contacts")
        .update({ tshirt_size: minor_tshirt_size })
        .eq("id", linkedMinor.contact_id);
    }
  }

  // Fetch full info for confirmation email
  const { data: fullReg } = await supabase
    .from("registrations")
    .select("*, contacts(email, first_name, last_name), events(title, date_start, date_end, location)")
    .eq("id", registration.id)
    .single();

  if (fullReg) {
    try {
      await sendRegistrationConfirmation(fullReg, signature_name, waiver_text, linkedMinor ? true : false);
    } catch (err) {
      console.error("Registration confirmation email error:", err);
    }

    // Add camp calendar invite for the registrant
    const eventInfo = fullReg.events as { title: string; date_start: string | null; date_end: string | null; location: string | null } | null;
    const contactEmail = (fullReg.contacts as { email: string } | null)?.email;

    if (eventInfo?.date_start && contactEmail && process.env.GOOGLE_CALENDAR_ID) {
      try {
        const { createCalendarEvent } = await import("@/lib/google-calendar");
        const endDate = eventInfo.date_end || new Date(new Date(eventInfo.date_start).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

        await createCalendarEvent({
          summary: eventInfo.title,
          description: `You're registered for ${eventInfo.title}!${eventInfo.location ? ` Location details will be shared in your welcome packet.` : ""}`,
          start: eventInfo.date_start,
          end: endDate,
          attendees: [contactEmail],
        });
      } catch (err) {
        console.error("Camp calendar invite error:", err);
      }
    }
  }

  return NextResponse.json({ success: true });
}

// Send registration confirmation with waiver PDF attachment
async function sendRegistrationConfirmation(
  registration: {
    contacts: { email: string; first_name: string | null; last_name: string | null } | null;
    events: { title: string; date_start: string | null; date_end: string | null; location: string | null } | null;
    role: string | null;
    waiver_signed_at: string | null;
    waiver_ip: string | null;
  },
  signatureName: string,
  waiverText: string,
  hasMinor: boolean
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const email = registration.contacts?.email;
  if (!email) return;

  const { Resend } = await import("resend");
  const { generateWaiverPdf } = await import("@/lib/waiver-pdf");
  const resend = new Resend(apiKey);

  const firstName = registration.contacts?.first_name || "there";
  const lastName = registration.contacts?.last_name || "";
  const participantName = [firstName, lastName].filter(Boolean).join(" ");
  const eventTitle = registration.events?.title || "the upcoming event";

  const signedAt = registration.waiver_signed_at
    ? new Date(registration.waiver_signed_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : new Date().toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });

  const eventDate = registration.events?.date_start
    ? new Date(registration.events.date_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  // Generate waiver PDF
  const pdfBuffer = generateWaiverPdf({
    participantName,
    participantEmail: email,
    eventTitle,
    eventDate,
    eventLocation: registration.events?.location || null,
    role: registration.role,
    signatureName,
    signedAt,
    ipAddress: registration.waiver_ip || "Unknown",
    waiverText,
  });

  const filename = `OO-Waiver-${participantName.replace(/\s+/g, "-")}-${eventTitle.replace(/\s+/g, "-")}.pdf`;

  await resend.emails.send({
    from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
    to: email,
    subject: `Registration Confirmed: ${eventTitle}`,
    attachments: [
      {
        filename,
        content: pdfBuffer.toString("base64"),
      },
    ],
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <p style="font-size: 16px; line-height: 1.6;">Hey ${firstName},</p>

        <p style="font-size: 16px; line-height: 1.6;">
          Your registration for <strong>${eventTitle}</strong> is confirmed${hasMinor ? " for you and your minor" : ""}! We're looking forward to having you${registration.role === "Mentor" ? " as a mentor" : ""}.
        </p>

        ${eventDate || registration.events?.location ? `
        <div style="margin: 20px 0; padding: 16px; background: #f0ebe2; border-radius: 4px;">
          ${eventDate ? `<p style="margin: 0; font-size: 14px;"><strong>When:</strong> ${eventDate}</p>` : ""}
          ${registration.events?.location ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>Where:</strong> ${registration.events.location}</p>` : ""}
        </div>
        ` : ""}

        <p style="font-size: 16px; line-height: 1.6;">
          A copy of your signed waiver is attached to this email for your records.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          We'll send you a welcome packet closer to the event with your mentor/mentee assignment, camp schedule, gear list, and everything else you need.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          If you have any questions in the meantime, reach out at
          <a href="mailto:info@opportunityoutdoors.org" style="color: #2D5016; font-weight: 600;">info@opportunityoutdoors.org</a>.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          See you in the field!<br/>
          — The Opportunity Outdoors Team
        </p>
      </div>
    `,
  });
}
