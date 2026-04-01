import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    .select("*, contacts(id, email, first_name, last_name, phone, city_state, tshirt_size)")
    .eq("event_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    ...event,
    registrations: registrations || [],
  });
}
