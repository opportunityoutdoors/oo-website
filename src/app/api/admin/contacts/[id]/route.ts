import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const [
    { data: contact },
    { data: menteeApps },
    { data: mentorApps },
    { data: registrations },
    { data: sponsorships },
  ] = await Promise.all([
    supabase.from("contacts").select("*").eq("id", id).single(),
    supabase.from("mentee_applications").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("mentor_applications").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("registrations").select("*, events(title, event_type, date_start)").eq("contact_id", id).order("created_at", { ascending: false }),
    supabase.from("sponsorship_inquiries").select("*").eq("contact_id", id).order("created_at", { ascending: false }),
  ]);

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...contact,
    mentee_applications: menteeApps || [],
    mentor_applications: mentorApps || [],
    registrations: registrations || [],
    sponsorship_inquiries: sponsorships || [],
  });
}
