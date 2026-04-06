import { randomBytes } from "crypto";
import { after } from "next/server";
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

/* ─── Types ─── */

type FormType =
  | "newsletter"
  | "contact"
  | "mentee-signup"
  | "mentor-signup"
  | "event-registration"
  | "camp-waitlist"
  | "camp-registration"
  | "sponsorship";

interface SubmitPayload {
  formType: FormType;
  data: Record<string, string | string[] | boolean>;
}

/* ─── Validation helpers ─── */

const VALID_FORM_TYPES: FormType[] = [
  "newsletter",
  "contact",
  "mentee-signup",
  "mentor-signup",
  "event-registration",
  "camp-waitlist",
  "camp-registration",
  "sponsorship",
];

const REQUIRED_FIELDS: Record<FormType, string[]> = {
  newsletter: ["email"],
  contact: ["firstName", "lastName", "email", "subject", "message"],
  "mentee-signup": [
    "firstName", "lastName", "dateOfBirth", "sex", "email", "phone",
    "cityState", "outdoorInterests", "experienceLevel", "gearStatus", "howHeard",
  ],
  "mentor-signup": [
    "firstName", "lastName", "dateOfBirth", "sex", "email", "phone",
    "cityState", "outdoorSkills", "yearsExperience", "mentoredBefore", "howHeard",
  ],
  "event-registration": ["firstName", "lastName", "email", "phone", "cityState", "howHeard"],
  "camp-waitlist": ["firstName", "lastName", "email", "phone", "role"],
  "camp-registration": ["email", "tshirtSize", "emergencyContactName", "emergencyContactPhone", "transportation", "waiver"],
  sponsorship: ["companyName", "contactName", "email"],
};

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ─── Rate limiting (in-memory, per-process) ─── */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

/* ─── Supabase: upsert contact + create record ─── */

async function writeToSupabase(
  formType: FormType,
  data: Record<string, string | string[] | boolean>
): Promise<void> {
  const supabase = createServiceClient();
  const str = (key: string) => sanitize(data[key]);
  const arr = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as string[]) : [];

  const email = str("email");

  // Determine source label
  const sourceMap: Record<FormType, string> = {
    newsletter: "Newsletter Signup",
    contact: "Contact Form",
    "mentee-signup": "Mentee Application",
    "mentor-signup": "Mentor Application",
    "event-registration": str("eventName") || "Event Registration",
    "camp-waitlist": str("eventName") || "Camp Waitlist",
    "camp-registration": str("eventName") || "Camp Registration",
    sponsorship: "Sponsorship Inquiry",
  };

  // Build contact upsert data
  const contactData: Record<string, unknown> = {
    email,
    source: sourceMap[formType],
    updated_at: new Date().toISOString(),
  };

  // Add name/phone/city if available (don't overwrite with empty)
  if (str("firstName")) contactData.first_name = str("firstName");
  if (str("lastName")) contactData.last_name = str("lastName");
  if (str("phone")) contactData.phone = str("phone");
  if (str("cityState")) contactData.city_state = str("cityState");

  // Form-specific contact fields
  if (formType === "mentee-signup") {
    contactData.experience_level = str("experienceLevel");
    contactData.interests = arr("outdoorInterests");
    contactData.gear_status = str("gearStatus");
  } else if (formType === "mentor-signup") {
    contactData.interests = arr("outdoorSkills");
  } else if (formType === "camp-registration") {
    if (str("tshirtSize")) contactData.tshirt_size = str("tshirtSize");
  } else if (formType === "sponsorship") {
    // Parse contactName into first/last
    const fullName = str("contactName");
    const parts = fullName.split(" ");
    contactData.first_name = parts[0];
    contactData.last_name = parts.slice(1).join(" ");
  }

  // Find existing contact by email, or create new
  let contact: { id: string } | null = null;
  const { data: existing } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", email)
    .single();

  if (existing) {
    // Update existing contact
    const { data: updated, error: updateError } = await supabase
      .from("contacts")
      .update(contactData)
      .eq("id", existing.id)
      .select("id")
      .single();
    if (updateError) {
      console.error("Supabase contact update error:", updateError);
      throw new Error("Failed to save contact");
    }
    contact = updated;
  } else {
    // Insert new contact
    const { data: inserted, error: insertError } = await supabase
      .from("contacts")
      .insert(contactData)
      .select("id")
      .single();
    if (insertError) {
      console.error("Supabase contact insert error:", insertError);
      throw new Error("Failed to save contact");
    }
    contact = inserted;
  }

  if (!contact) throw new Error("Failed to save contact");

  const contactId = contact.id;

  // Create form-specific record
  switch (formType) {
    case "mentee-signup": {
      const { error } = await supabase.from("mentee_applications").insert({
        contact_id: contactId,
        date_of_birth: str("dateOfBirth") || null,
        sex: str("sex"),
        outdoor_interests: arr("outdoorInterests"),
        experience_level: str("experienceLevel"),
        gear_status: str("gearStatus"),
        how_heard: str("howHeard"),
        affiliations: str("affiliations"),
        about_yourself: str("aboutYourself"),
        parent_name: str("parentName") || null,
        parent_phone: str("parentPhone") || null,
        parent_email: str("parentEmail") || null,
      });
      if (error) console.error("Supabase mentee insert error:", error);
      break;
    }

    case "mentor-signup": {
      const { error } = await supabase.from("mentor_applications").insert({
        contact_id: contactId,
        date_of_birth: str("dateOfBirth") || null,
        sex: str("sex"),
        outdoor_skills: arr("outdoorSkills"),
        years_experience: str("yearsExperience"),
        mentored_before: str("mentoredBefore"),
        how_heard: str("howHeard"),
        certifications: Array.isArray(data.certifications) ? data.certifications as string[] : [],
        affiliations: str("affiliations"),
        why_mentor: str("whyMentor"),
      });
      if (error) console.error("Supabase mentor insert error:", error);
      break;
    }

    case "event-registration": {
      // Look up event by name, or create a placeholder
      const eventName = str("eventName");
      let eventId: string | null = null;
      if (eventName) {
        const { data: event } = await supabase
          .from("events")
          .select("id")
          .eq("title", eventName)
          .single();
        eventId = event?.id || null;
      }
      if (eventId) {
        const { error } = await supabase.from("registrations").insert({
          contact_id: contactId,
          event_id: eventId,
          status: "registered",
          role: "attendee",
        });
        if (error) console.error("Supabase event registration error:", error);
      }
      break;
    }

    case "camp-waitlist": {
      const eventName = str("eventName");
      let eventId: string | null = null;
      if (eventName) {
        const { data: event } = await supabase
          .from("events")
          .select("id")
          .eq("title", eventName)
          .single();
        eventId = event?.id || null;
      }
      if (eventId) {
        const meetingChangeToken = randomBytes(24).toString("hex");

        // Create parent/adult registration
        const { data: parentReg, error } = await supabase.from("registrations").insert({
          contact_id: contactId,
          event_id: eventId,
          status: "waitlist",
          role: str("role"),
          meeting_date_selected: str("meetingDate") || null,
          meeting_change_token: meetingChangeToken,
        }).select("id").single();
        if (error) console.error("Supabase camp waitlist error:", error);

        // If bringing a minor, create minor contact (no email) + linked registration
        if (data.bringingMinor && str("minorFirstName") && parentReg) {
          const { data: minorContact, error: minorContactError } = await supabase
            .from("contacts")
            .insert({
              email: null,
              first_name: str("minorFirstName"),
              last_name: str("minorLastName"),
              phone: str("phone"),
              city_state: str("cityState"),
              source: str("eventName") || "Camp Waitlist",
            })
            .select("id")
            .single();

          if (minorContactError) {
            console.error("Minor contact error:", minorContactError);
          } else if (minorContact) {
            const { error: minorRegError } = await supabase.from("registrations").insert({
              contact_id: minorContact.id,
              event_id: eventId,
              status: "waitlist",
              role: "Mentee",
              meeting_date_selected: str("meetingDate") || null,
              guardian_registration_id: parentReg.id,
            });
            if (minorRegError) console.error("Minor registration error:", minorRegError);
          }
        }

        // Send waitlist confirmation email
        if (parentReg) {
          const { data: eventData } = await supabase
            .from("events")
            .select("title, slug, meeting_slots")
            .eq("id", eventId)
            .single();

          const slots = eventData?.meeting_slots || [];

          try {
            await sendWaitlistConfirmation({
              email,
              firstName: str("firstName"),
              eventTitle: eventData?.title || eventName || "the event",
              slug: eventData?.slug || "",
              meetingLabel: str("meetingDate"),
              meetingSlots: slots,
              meetingChangeToken,
            });
          } catch (err) {
            console.error("Waitlist confirmation email error:", err);
          }

          // Add attendee to Google Calendar event
          const selectedSlot = slots.find((s: MeetingSlot) => s.label === str("meetingDate"));
          if (selectedSlot?.calendarEventId && email) {
            try {
              const { addAttendee } = await import("@/lib/google-calendar");
              await addAttendee(selectedSlot.calendarEventId, email);
            } catch (err) {
              console.error("Calendar add attendee error:", err);
            }
          }
        }
      }
      break;
    }

    case "camp-registration": {
      // Token-based registration updates an existing registration row
      // For now, just update contact profile fields
      const { error } = await supabase
        .from("contacts")
        .update({
          tshirt_size: str("tshirtSize"),
        })
        .eq("id", contactId);
      if (error) console.error("Supabase camp registration update error:", error);
      break;
    }

    case "sponsorship": {
      const { error } = await supabase.from("sponsorship_inquiries").insert({
        contact_id: contactId,
        company_name: str("companyName"),
        budget_range: str("budgetRange"),
        opportunity_interest: Array.isArray(data.opportunityInterest)
          ? (data.opportunityInterest as string[])
          : [],
        about_company: str("aboutCompany"),
      });
      if (error) console.error("Supabase sponsorship insert error:", error);
      break;
    }

    // newsletter and contact: contact upsert is enough, no extra table needed
    case "newsletter":
    case "contact":
      break;
  }
}

/* ─── Direct Mail: sync contact to mailing list ─── */

async function syncToDirectMail(
  formType: FormType,
  data: Record<string, string | string[] | boolean>
): Promise<void> {
  const apiKeyId = process.env.DIRECT_MAIL_API_KEY_ID;
  const apiKeySecret = process.env.DIRECT_MAIL_API_KEY_SECRET;
  const projectId = process.env.DIRECT_MAIL_PROJECT_ID;
  const groupId = process.env.DIRECT_MAIL_ADDRESS_GROUP_ID;

  if (!apiKeyId || !apiKeySecret || !projectId || !groupId) {
    console.warn("Direct Mail credentials not configured, skipping sync");
    return;
  }

  const str = (key: string) => sanitize(data[key]);

  const firstName = formType === "sponsorship"
    ? str("contactName").split(" ")[0]
    : str("firstName");
  const lastName = formType === "sponsorship"
    ? str("contactName").split(" ").slice(1).join(" ")
    : str("lastName");

  const sourceMap: Record<FormType, string> = {
    newsletter: "Newsletter Signup",
    contact: "Contact Form",
    "mentee-signup": "Mentee Application",
    "mentor-signup": "Mentor Application",
    "event-registration": str("eventName") || "Event Registration",
    "camp-waitlist": str("eventName") || "Camp Waitlist",
    "camp-registration": str("eventName") || "Camp Registration",
    sponsorship: "Sponsorship Inquiry",
  };

  const rawInterests = data.outdoorInterests ?? data.interests;
  const interests = Array.isArray(rawInterests)
    ? (rawInterests as string[]).join(", ")
    : str("outdoorInterests") || str("interests");

  const credentials = Buffer.from(`${apiKeyId}:${apiKeySecret}`).toString("base64");
  const apiHost = process.env.DIRECT_MAIL_API_HOST || "www.ethreemail.com";
  const baseUrl = `https://${apiHost}/api/v2/projects/${projectId}/address-groups/${groupId}/addresses`;
  const email = str("email");

  const addressData = {
    email,
    first_name: firstName,
    last_name: lastName,
    custom_1: str("cityState"),
    custom_2: sourceMap[formType],
    custom_3: interests,
  };

  const headers = {
    Authorization: `Basic ${credentials}`,
    "Content-Type": "application/json; charset=utf-8",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    // Try PATCH first (updates existing contact by email)
    const patchUrl = `${baseUrl}?email=${encodeURIComponent(email)}`;
    const patchRes = await fetch(patchUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify(addressData),
      signal: controller.signal,
    });

    if (patchRes.status === 404) {
      // Contact doesn't exist yet — create via POST
      const postRes = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(addressData),
        signal: controller.signal,
      });
      if (!postRes.ok) {
        const text = await postRes.text();
        console.error("Direct Mail POST error:", postRes.status, text);
      }
    } else if (!patchRes.ok) {
      const text = await patchRes.text();
      console.error("Direct Mail PATCH error:", patchRes.status, text);
    }
  } finally {
    clearTimeout(timeout);
  }
}

/* ─── Email notifications ─── */

async function sendNotificationEmail(
  formType: FormType,
  data: Record<string, string | string[] | boolean>
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const str = (key: string) => (typeof data[key] === "string" ? data[key] as string : "");
  const arr = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as string[]).join(", ") : str(key);

  let to: string | null = null;
  let subject = "";
  let html = "";

  if (formType === "contact") {
    to = "john.trice@opportunityoutdoors.org";
    subject = `New Contact Form: ${str("subject")}`;
    html = `
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${str("firstName")} ${str("lastName")}</p>
      <p><strong>Email:</strong> ${str("email")}</p>
      <p><strong>Subject:</strong> ${str("subject")}</p>
      <hr />
      <p>${str("message")}</p>
    `;
  } else if (formType === "sponsorship") {
    to = "evan.weiss@opportunityoutdoors.org";
    subject = `New Sponsorship Inquiry: ${str("companyName")}`;
    html = `
      <h2>New Sponsorship Inquiry</h2>
      <p><strong>Company:</strong> ${str("companyName")}</p>
      <p><strong>Contact:</strong> ${str("contactName")}</p>
      <p><strong>Email:</strong> ${str("email")}</p>
      <p><strong>Phone:</strong> ${str("phone")}</p>
      <p><strong>Budget Range:</strong> ${str("budgetRange")}</p>
      <p><strong>Interests:</strong> ${arr("opportunityInterest")}</p>
      ${str("aboutCompany") ? `<hr /><p>${str("aboutCompany")}</p>` : ""}
    `;
  }

  if (!to) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
    to,
    subject,
    html,
  });
}

/* ─── Handler ─── */

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body: SubmitPayload = await request.json();
    const { formType, data } = body;

    // Validate formType
    if (!VALID_FORM_TYPES.includes(formType)) {
      return NextResponse.json({ error: "Invalid form type" }, { status: 400 });
    }

    // Validate required fields
    const required = REQUIRED_FIELDS[formType];
    const missing = required.filter((field) => {
      const val = data[field];
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === "boolean") return false;
      return !val || (typeof val === "string" && val.trim() === "");
    });

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate email
    const email = typeof data.email === "string" ? data.email : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // 1. Write to Supabase (source of truth)
    await writeToSupabase(formType, data);

    // 2. Sync contact to Direct Mail mailing list (non-blocking, runs after response)
    after(async () => {
      try {
        await syncToDirectMail(formType, data);
      } catch (err) {
        console.error("Direct Mail sync error:", err);
      }
    });

    // 3. Send email notification (non-blocking, runs after response)
    after(async () => {
      try {
        await sendNotificationEmail(formType, data);
      } catch (err) {
        console.error("Email notification error:", err);
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ─── Waitlist Confirmation Email ─── */

interface MeetingSlot {
  date?: string;
  label?: string;
  meetingLink?: string;
}

async function sendWaitlistConfirmation({
  email,
  firstName,
  eventTitle,
  slug,
  meetingLabel,
  meetingSlots,
  meetingChangeToken,
}: {
  email: string;
  firstName: string;
  eventTitle: string;
  slug: string;
  meetingLabel: string;
  meetingSlots: MeetingSlot[];
  meetingChangeToken: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";
  const meetingChangeUrl = `${baseUrl}/events/${slug}/meeting-change?token=${meetingChangeToken}`;

  // Find the selected meeting slot's details
  const selectedSlot = meetingSlots.find((s) => s.label === meetingLabel);
  const meetLink = selectedSlot?.meetingLink;
  const meetingDate = selectedSlot?.date
    ? new Date(selectedSlot.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : meetingLabel;

  await resend.emails.send({
    from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
    to: email,
    subject: `You're on the Waitlist: ${eventTitle}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
        <p style="font-size: 16px; line-height: 1.6;">Hey ${firstName},</p>

        <p style="font-size: 16px; line-height: 1.6;">
          Thanks for signing up for the <strong>${eventTitle}</strong> waitlist! We're glad you're interested.
        </p>

        <p style="font-size: 16px; line-height: 1.6;">
          Here's what happens next:
        </p>

        <ol style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
          <li><strong>Attend your pre-camp virtual meeting</strong> (required)</li>
          <li>We review the waitlist and send invitations</li>
          <li>Complete your registration if invited</li>
        </ol>

        <div style="margin: 24px 0; padding: 16px; background: #f0ebe2; border-radius: 4px;">
          <p style="margin: 0 0 4px; font-size: 14px; font-weight: 600;">Your Meeting</p>
          <p style="margin: 0; font-size: 14px;">${meetingDate}</p>
          ${meetLink ? `<p style="margin: 8px 0 0; font-size: 14px;"><a href="${meetLink}" style="color: #2D5016; font-weight: 600;">Join Meeting</a></p>` : ""}
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #666;">
          <strong>Important:</strong> Attending a pre-camp meeting is required for all participants. This is where we cover safety protocols, camp logistics, what to expect, and answer your questions.
        </p>

        <p style="font-size: 14px; line-height: 1.6; color: #666;">
          Need to switch to a different meeting date? <a href="${meetingChangeUrl}" style="color: #2D5016; font-weight: 600;">Change your meeting</a>.
        </p>

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
}
