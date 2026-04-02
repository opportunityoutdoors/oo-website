import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateWaiverPdf } from "@/lib/waiver-pdf";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: registration } = await supabase
    .from("registrations")
    .select("*, contacts(email, first_name, last_name), events(title, date_start, location)")
    .eq("id", id)
    .single();

  if (!registration || !registration.waiver_signed) {
    return NextResponse.json({ error: "Waiver not found" }, { status: 404 });
  }

  const contact = registration.contacts as { email: string; first_name: string | null; last_name: string | null };
  const event = registration.events as { title: string; date_start: string | null; location: string | null };

  const participantName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unknown";

  const pdf = generateWaiverPdf({
    participantName,
    participantEmail: contact.email,
    eventTitle: event.title,
    eventDate: event.date_start
      ? new Date(event.date_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null,
    eventLocation: event.location,
    role: registration.role,
    signatureName: registration.waiver_signature_name || participantName,
    signedAt: registration.waiver_signed_at
      ? new Date(registration.waiver_signed_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
      : "Unknown",
    ipAddress: registration.waiver_ip || "Unknown",
    waiverText: registration.waiver_text || "Waiver text not available",
  });

  const filename = `waiver-${participantName.replace(/\s+/g, "-").toLowerCase()}-${event.title.replace(/\s+/g, "-").toLowerCase()}.pdf`;

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=" + filename,
    },
  });
}
