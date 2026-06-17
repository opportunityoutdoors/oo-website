import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { NOTIFICATIONS_FROM } from "@/lib/email/from";
import { renderWelcomePacket } from "@/emails";

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

  // Check all mentees are matched. Minors (linked to a guardian) are excluded
  // from this check — they inherit their guardian's match state, so a minor
  // without a mentor means their *guardian* is unmatched, which will already
  // be caught when we count the guardian.
  const unmatchedMentees = registrations.filter(
    (r) => r.role === "Mentee" && !r.mentor_id && !r.guardian_registration_id
  );
  if (unmatchedMentees.length > 0 && !specificIds) {
    return NextResponse.json(
      { error: `${unmatchedMentees.length} mentee(s) are not matched to a mentor` },
      { status: 400 }
    );
  }

  // Fetch all registrations for this event to resolve mentor/mentee names
  // and guardian relationships.
  const { data: allRegs } = await supabase
    .from("registrations")
    .select("id, role, mentor_id, guardian_registration_id, contacts(first_name, last_name, email, phone)")
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
    // Skip minors explicitly — they are addressed via their guardian's email,
    // never sent their own. This is the principled rule (not the incidental
    // "no email on contact" check it replaces).
    if (reg.guardian_registration_id) continue;

    const contact = getContact(reg);
    if (!contact?.email) continue;

    const eventTitle = event.title;
    const isMentor = reg.role === "Mentor";

    // Find any minors linked to this registration — they're coming along
    // under this guardian and should be named in the greeting.
    const linkedMinors =
      allRegs?.filter((r) => r.guardian_registration_id === reg.id) || [];
    const minorFirstNames = linkedMinors
      .map((m) => getContact(m)?.first_name)
      .filter((n): n is string => !!n);

    // Greeting: "Hey Cory," or "Hey Cory & Wesley," or "Hey Cory, Wesley, & Alex,"
    const guardianFirst = contact.first_name || "there";
    let greetingName: string;
    if (minorFirstNames.length === 0) {
      greetingName = guardianFirst;
    } else if (minorFirstNames.length === 1) {
      greetingName = `${guardianFirst} & ${minorFirstNames[0]}`;
    } else {
      const last = minorFirstNames[minorFirstNames.length - 1];
      const rest = minorFirstNames.slice(0, -1);
      greetingName = `${guardianFirst}, ${rest.join(", ")}, & ${last}`;
    }

    // Build match info (structured for the email template).
    let mentees: Array<{ name: string; email: string; phone?: string | null }> = [];
    let mentor: { name: string; email: string; phone?: string | null } | null = null;
    if (isMentor) {
      // Find assigned mentees, excluding all minors. Minors are implicit via
      // their guardian (who is also a mentee of this mentor, or is this mentor
      // themselves) — we don't list them as peer mentees because they have no
      // contact info of their own and are already covered by the guardian's
      // greeting.
      const menteeRegs =
        allRegs?.filter(
          (r) => r.mentor_id === reg.id && !r.guardian_registration_id
        ) || [];
      mentees = menteeRegs
        .map((m) => {
          const mc = getContact(m);
          if (!mc) return null;
          const name = [mc.first_name, mc.last_name].filter(Boolean).join(" ");
          return { name, email: mc.email, phone: mc.phone };
        })
        .filter((m): m is { name: string; email: string; phone: string | null } => !!m);
    } else if (reg.mentor_id) {
      // Find assigned mentor
      const mentorReg = regMap.get(reg.mentor_id);
      if (mentorReg) {
        const mc = getContact(mentorReg);
        if (!mc) continue;
        const mentorName = [mc.first_name, mc.last_name].filter(Boolean).join(" ");
        mentor = { name: mentorName, email: mc.email, phone: mc.phone };
      }
    }

    // Build camp locations (structured for the email template).
    const campLocationViews = campLocations.map((loc) => {
      const coords = parseCoords(loc);
      const coordStr = coords ? `${coords.lat}, ${coords.lng}` : (loc.coordinates || "");
      const googleMapsUrl = coords
        ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}`
        : null;
      return {
        label: loc.label || "Camp Location",
        coordStr: coordStr || undefined,
        googleMapsUrl,
        onxLink: loc.onxLink || null,
      };
    });

    // Perks (role-specific)
    const perks: Array<{ title: string; link?: string }> = isMentor
      ? (event.mentor_perks || [])
      : (event.mentee_perks || []);

    // Short date format: "4/17/26" — uses UTC because Sanity stores date-only
    // values that Supabase persists as midnight UTC. Parsing without the UTC
    // hint would shift into the server's local timezone.
    const shortDate = (iso: string) =>
      new Date(iso).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
        timeZone: "UTC",
      });
    const eventDateStr = event.date_start
      ? event.date_end && event.date_end !== event.date_start
        ? `${shortDate(event.date_start)}-${shortDate(event.date_end)}`
        : shortDate(event.date_start)
      : null;

    await resend.emails.send({
      from: NOTIFICATIONS_FROM,
      to: contact.email,
      subject: `Welcome Packet: ${eventTitle}`,
      html: await renderWelcomePacket({
        greetingName,
        eventTitle,
        eventDateStr,
        location: event.location ?? null,
        isMentor,
        mentees,
        mentor,
        campLocations: campLocationViews,
        perks,
        eventUrl: `${baseUrl}/events/${event.slug}`,
      }),
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
