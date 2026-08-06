import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Admin surface: reject anyone without an admin_users row. Middleware only matches
  // /admin/:path*, so it never protected these API routes.
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;


  const { id } = await params;
  const supabase = createServiceClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();

  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const { data: registrations } = await supabase
    .from("registrations")
    .select(
      "*, contacts(id, email, first_name, last_name, phone, city, state, tshirt_size, date_of_birth, background_check_status, background_check_expires_at, background_check_invited_at, background_check_url)"
    )
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...event,
    registrations: registrations || [],
  });
}
