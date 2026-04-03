import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const supabase = createServiceClient();
  const body = await request.json();
  const { email, first_name, last_name, phone, role, is_board_member } = body;

  if (!email || !role) {
    return NextResponse.json({ error: "Email and role are required" }, { status: 400 });
  }

  // Find existing contact or create new
  let contact: { id: string } | null = null;

  const { data: existing_contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("email", email)
    .single();

  if (existing_contact) {
    const { data: updated, error: updateError } = await supabase
      .from("contacts")
      .update({
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        source: is_board_member ? "Board Member" : "Admin Added",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing_contact.id)
      .select("id")
      .single();
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    contact = updated;
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from("contacts")
      .insert({
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        source: is_board_member ? "Board Member" : "Admin Added",
      })
      .select("id")
      .single();
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    contact = inserted;
  }

  if (!contact) {
    return NextResponse.json({ error: "Failed to create contact" }, { status: 500 });
  }

  // Check if already registered for this event
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("contact_id", contact.id)
    .eq("event_id", eventId)
    .single();

  if (existing) {
    return NextResponse.json({ error: "Already registered for this event" }, { status: 409 });
  }

  // Create registration (skip straight to approved/registered)
  const { data: registration, error: regError } = await supabase
    .from("registrations")
    .insert({
      contact_id: contact.id,
      event_id: eventId,
      status: "registered",
      role,
      is_board_member: is_board_member || false,
    })
    .select()
    .single();

  if (regError) {
    return NextResponse.json({ error: regError.message }, { status: 500 });
  }

  return NextResponse.json(registration);
}
