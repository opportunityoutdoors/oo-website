import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface ContactInfo {
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getContact(reg: any): ContactInfo | null {
  const c = reg.contacts;
  if (!c) return null;
  if (Array.isArray(c)) return c[0] || null;
  return c;
}

interface CampLocation {
  label: string;
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  onxLink?: string;
}

function parseCoords(loc: CampLocation): { lat: number; lng: number } | null {
  if (loc.latitude && loc.longitude) return { lat: loc.latitude, lng: loc.longitude };
  if (loc.coordinates) {
    const parts = loc.coordinates.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { lat: parts[0], lng: parts[1] };
    }
  }
  return null;
}

// POST: Send welcome packets
// body: { registration_ids?: string[] } — if empty, sends to all matched & registered who haven't received it
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = createServiceClient();
  const body = await request.json();
  const specificIds: string[] | undefined = body.registration_ids;

  // Fetch event
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Check camp locations
  const campLocations: CampLocation[] = event.camp_locations || [];
  if (campLocations.length === 0) {
    return NextResponse.json(
      { error: "Camp locations must be set in Content Studio before sending welcome packets" },
      { status: 400 }
    );
  }

  // Fetch registrations to send to
  let query = supabase
    .from("registrations")
    .select("*, contacts(id, email, first_name, last_name, phone)")
    .eq("event_id", eventId)
    .in("status", ["registered", "attended"]);

  if (specificIds?.length) {
    query = query.in("id", specificIds);
  } else {
    query = query.eq("welcome_packet_sent", false);
  }

  const { data: registrations } = await query;

  if (!registrations?.length) {
    return NextResponse.json({ error: "No eligible recipients", sent: 0 }, { status: 400 });
  }

  // Check all mentees are matched
  const unmatchedMentees = registrations.filter(
    (r) => r.role === "Mentee" && !r.mentor_id
  );
  if (unmatchedMentees.length > 0 && !specificIds) {
    return NextResponse.json(
      { error: `${unmatchedMentees.length} mentee(s) are not matched to a mentor` },
      { status: 400 }
    );
  }

  // Fetch all registrations for this event to resolve mentor/mentee names
  const { data: allRegs } = await supabase
    .from("registrations")
    .select("id, role, mentor_id, contacts(first_name, last_name, email, phone)")
    .eq("event_id", eventId);

  const regMap = new Map(allRegs?.map((r) => [r.id, r]) || []);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org";
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Email not configured" }, { status: 500 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  let sentCount = 0;

  for (const reg of registrations) {
    const contact = getContact(reg);
    if (!contact?.email) continue;

    const firstName = contact.first_name || "there";
    const eventTitle = event.title;
    const isMentor = reg.role === "Mentor";

    // Build match info
    let matchHtml = "";
    if (isMentor) {
      // Find assigned mentees
      const mentees = allRegs?.filter((r) => r.mentor_id === reg.id) || [];
      if (mentees.length > 0) {
        const menteeList = mentees.map((m) => {
          const mc = getContact(m);
          if (!mc) return "";
          const name = [mc.first_name, mc.last_name].filter(Boolean).join(" ");
          return `<li><strong>${name}</strong> — ${mc.email}${mc.phone ? ` — ${mc.phone}` : ""}</li>`;
        }).join("");
        matchHtml = `
          <p style="font-size: 16px; line-height: 1.6;"><strong>Your assigned mentee${mentees.length > 1 ? "s" : ""}:</strong></p>
          <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px;">${menteeList}</ul>
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            We encourage you to reach out to your mentee${mentees.length > 1 ? "s" : ""} before camp to introduce yourself. A quick text or email goes a long way.
          </p>
        `;
      }
    } else {
      // Find assigned mentor
      if (reg.mentor_id) {
        const mentor = regMap.get(reg.mentor_id);
        if (mentor) {
          const mc = getContact(mentor);
          if (!mc) continue;
          const mentorName = [mc.first_name, mc.last_name].filter(Boolean).join(" ");
          matchHtml = `
            <p style="font-size: 16px; line-height: 1.6;"><strong>Your assigned mentor:</strong></p>
            <p style="font-size: 15px; line-height: 1.6; padding-left: 20px;">
              <strong>${mentorName}</strong> — ${mc.email}${mc.phone ? ` — ${mc.phone}` : ""}
            </p>
            <p style="font-size: 14px; line-height: 1.6; color: #666;">
              Your mentor is a volunteer who will be your buddy at camp. Feel free to reach out before the event to introduce yourself.
            </p>
          `;
        }
      }
    }

    // Build camp locations HTML
    const locationsHtml = campLocations.map((loc) => {
      const coords = parseCoords(loc);
      const coordStr = coords ? `${coords.lat}, ${coords.lng}` : (loc.coordinates || "");
      const googleMapsUrl = coords
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
        : null;
      return `
        <div style="margin-bottom: 12px; padding: 12px; background: #f0ebe2; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; font-weight: 600;">${loc.label || "Camp Location"}</p>
          ${coordStr ? `<p style="margin: 4px 0 0; font-size: 13px; color: #666;">${coordStr}</p>` : ""}
          <p style="margin: 8px 0 0; font-size: 13px;">
            ${googleMapsUrl ? `<a href="${googleMapsUrl}" style="color: #2D5016; font-weight: 600;">Google Maps Directions</a>` : ""}
            ${loc.onxLink ? `${googleMapsUrl ? " · " : ""}<a href="${loc.onxLink}" style="color: #2D5016; font-weight: 600;">View on OnX</a>` : ""}
          </p>
        </div>
      `;
    }).join("");

    // Build perks HTML (role-specific)
    const perks: Array<{ title: string; link?: string }> = isMentor
      ? (event.mentor_perks || [])
      : (event.mentee_perks || []);

    const perksHtml = perks.length > 0 ? `
      <hr style="border: none; border-top: 1px solid #e8e3db; margin: 24px 0;" />
      <p style="font-size: 16px; line-height: 1.6; font-weight: 600;">Your Perks</p>
      <ul style="font-size: 15px; line-height: 1.8; padding-left: 20px;">
        ${perks.map((p) => `<li>${p.link ? `<a href="${p.link}" style="color: #2D5016; font-weight: 600;">${p.title}</a>` : p.title}</li>`).join("")}
      </ul>
    ` : "";

    const eventDate = event.date_start
      ? new Date(event.date_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;
    const eventEndDate = event.date_end
      ? new Date(event.date_end).toLocaleDateString("en-US", { month: "long", day: "numeric" })
      : null;

    await resend.emails.send({
      from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
      to: contact.email,
      subject: `Welcome Packet: ${eventTitle}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p style="font-size: 16px; line-height: 1.6;">Hey ${firstName},</p>

          <p style="font-size: 16px; line-height: 1.6;">
            We're counting down to <strong>${eventTitle}</strong>! Here's everything you need to know.
          </p>

          ${eventDate ? `
          <div style="margin: 20px 0; padding: 16px; background: #f0ebe2; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px;"><strong>When:</strong> ${eventDate}${eventEndDate ? ` – ${eventEndDate}` : ""}</p>
            ${event.location ? `<p style="margin: 4px 0 0; font-size: 14px;"><strong>Where:</strong> ${event.location}</p>` : ""}
          </div>
          ` : ""}

          ${matchHtml}

          <hr style="border: none; border-top: 1px solid #e8e3db; margin: 24px 0;" />

          <p style="font-size: 16px; line-height: 1.6; font-weight: 600;">Camp Location${campLocations.length > 1 ? "s" : ""}</p>
          <p style="font-size: 14px; line-height: 1.6; color: #666; margin-bottom: 12px;">
            Please keep these coordinates private and do not share publicly.
          </p>
          ${locationsHtml}

          ${perksHtml}

          <hr style="border: none; border-top: 1px solid #e8e3db; margin: 24px 0;" />

          <p style="font-size: 16px; line-height: 1.6;">
            Check the event page for the full schedule, gear list, and other details:
          </p>
          <div style="margin: 16px 0; text-align: center;">
            <a href="${baseUrl}/events/${event.slug}" style="display: inline-block; background-color: #2D5016; color: #ffffff; padding: 12px 28px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
              View Event Details
            </a>
          </div>

          <p style="font-size: 16px; line-height: 1.6;">
            Questions? Reply to this email or reach out at
            <a href="mailto:info@opportunityoutdoors.org" style="color: #2D5016; font-weight: 600;">info@opportunityoutdoors.org</a>.
          </p>

          <p style="font-size: 16px; line-height: 1.6;">
            See you in the field!<br/>
            — The Opportunity Outdoors Team
          </p>
        </div>
      `,
    });

    // Mark as sent
    await supabase
      .from("registrations")
      .update({
        welcome_packet_sent: true,
        welcome_packet_sent_at: new Date().toISOString(),
      })
      .eq("id", reg.id);

    sentCount++;
  }

  return NextResponse.json({ sent: sentCount });
}
