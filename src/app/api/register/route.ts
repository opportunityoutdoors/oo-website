import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderRegistrationConfirmation } from "@/emails";
import {
  toResponseRow,
  validateSurveyAnswers,
  type SurveyAnswers,
} from "@/lib/surveys/questions";

// Validate a registration token and return event + contact info (including linked minor)
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*, contacts(id, email, first_name, last_name, phone, city, state, tshirt_size, date_of_birth, background_check_status, background_check_expires_at), events(id, title, slug, event_type, date_start, date_end, location, cost, registration_fee)")
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
    .select("id, role, status, contacts(id, first_name, last_name, tshirt_size, date_of_birth)")
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
    // Only sent when the contact has no date of birth on file. Most existing contacts
    // predate the field, so registration is the second chance to collect it rather than
    // making 592 people redo a waitlist form.
    date_of_birth,
    // Minor fields
    minor_tshirt_size,
    minor_dietary_medical,
    minor_date_of_birth,
    survey,
    minor_survey,
  } = body;

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  if (!waiver_signed || !signature_name?.trim()) {
    return NextResponse.json({ error: "Waiver must be signed" }, { status: 400 });
  }

  // Survey validation happens after the token lookup below, because the question wording
  // (and therefore the error messages) depends on the event type.

  // Get client IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  // Verify token and status
  const { data: registration } = await supabase
    .from("registrations")
    .select("id, contact_id, event_id, role, status, events(event_type)")
    .eq("token", token)
    .single();

  if (!registration) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  if (registration.status !== "approved") {
    return NextResponse.json({ error: "Not eligible for registration" }, { status: 403 });
  }

  const eventRel = registration.events as { event_type: string } | { event_type: string }[] | null;
  const eventKind =
    (Array.isArray(eventRel) ? eventRel[0]?.event_type : eventRel?.event_type) ||
    "community";

  // The baseline survey is mandatory. Enforced server side so it cannot be skipped by a
  // hand-crafted request: a registration with no baseline has nothing to pair its post
  // response against. Validated before any write so a bad payload cannot leave a
  // half-registered state.
  const surveyProblem = validateSurveyAnswers("pre", survey, eventKind);
  if (surveyProblem) {
    return NextResponse.json({ error: surveyProblem }, { status: 400 });
  }

  const { data: minorPreCheck } = await supabase
    .from("registrations")
    .select("id")
    .eq("guardian_registration_id", registration.id)
    .maybeSingle();

  if (minorPreCheck) {
    const minorProblem = validateSurveyAnswers("pre", minor_survey, eventKind);
    if (minorProblem) {
      return NextResponse.json(
        { error: `For the minor: ${minorProblem}` },
        { status: 400 }
      );
    }
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

  // Update parent contact with t-shirt size, and date of birth if it was missing.
  //
  // DOB is only overwritten when absent, never replaced. An existing value came from a
  // waitlist or application where the person entered it deliberately; letting a later form
  // silently change it would move someone across the adult/minor line, which decides
  // whether they are screened at all.
  const contactPatch: Record<string, unknown> = {};
  if (tshirt_size) contactPatch.tshirt_size = tshirt_size;
  if (date_of_birth) contactPatch.date_of_birth = date_of_birth;
  if (Object.keys(contactPatch).length > 0) {
    await supabase
      .from("contacts")
      .update(contactPatch)
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

    // Same for the minor. Their DOB matters most of all: it is what guarantees a consumer
    // report is never run on a child.
    const minorPatch: Record<string, unknown> = {};
    if (minor_tshirt_size) minorPatch.tshirt_size = minor_tshirt_size;
    if (minor_date_of_birth) minorPatch.date_of_birth = minor_date_of_birth;
    if (Object.keys(minorPatch).length > 0) {
      await supabase
        .from("contacts")
        .update(minorPatch)
        .eq("id", linkedMinor.contact_id);
    }
  }

  // Store the baselines. One row per participant, so a guardian and their minor each get
  // their own pre response to pair against their own post response later.
  const preRows = [
    {
      registration_id: registration.id,
      contact_id: registration.contact_id,
      event_id: registration.event_id,
      ...toResponseRow("pre", survey as SurveyAnswers),
    },
  ];

  if (linkedMinor && minor_survey) {
    preRows.push({
      registration_id: linkedMinor.id,
      contact_id: linkedMinor.contact_id,
      event_id: registration.event_id,
      ...toResponseRow("pre", minor_survey as SurveyAnswers),
    });
  }

  // upsert on the (registration_id, kind) unique constraint so a resubmit updates rather
  // than erroring out and blocking the rest of the flow.
  const { error: surveyError } = await supabase
    .from("survey_responses")
    .upsert(preRows, { onConflict: "registration_id,kind" });

  if (surveyError) {
    console.error("Pre-survey insert error:", surveyError);
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

  // Payment comes last, and deliberately does NOT gate the registration.
  //
  // By this point the waiver is signed and stored, the surveys are recorded, and the
  // confirmation has gone out. Making any of that conditional on a card clearing would mean
  // a declined card throws away a signed legal document and a completed baseline survey,
  // and the person has to do it all again. Instead the registration stands, payment_status
  // stays 'pending', and they get a link back to checkout.
  //
  // A failure here is therefore logged, not returned as an error: the registration
  // succeeded even when the handoff to Stripe did not.
  let checkoutUrl: string | null = null;
  try {
    const { createCampCheckoutSession } = await import("@/lib/stripe/camp-checkout");
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;

    const result = await createCampCheckoutSession({
      registrationId: registration.id,
      origin,
    });
    if (result.kind === "checkout") checkoutUrl = result.url;
  } catch (err) {
    console.error("Camp checkout session creation failed (registration stands):", err);
  }

  return NextResponse.json({ success: true, checkoutUrl });
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
    from: NOTIFICATIONS_FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `Registration Confirmed: ${eventTitle}`,
    attachments: [
      {
        filename,
        content: pdfBuffer.toString("base64"),
      },
    ],
    html: await renderRegistrationConfirmation({
      firstName,
      eventTitle,
      hasMinor,
      isMentor: registration.role === "Mentor",
      eventDate,
      location: registration.events?.location ?? null,
    }),
  });
}
