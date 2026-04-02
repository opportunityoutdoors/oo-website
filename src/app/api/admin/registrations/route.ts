import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Bulk update registration statuses
export async function PATCH(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids, status } = body as { ids: string[]; status: string };

  if (!ids?.length || !status) {
    return NextResponse.json({ error: "Missing ids or status" }, { status: 400 });
  }

  const validStatuses = ["waitlist", "meeting_rsvp", "approved", "denied", "registered", "attended"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("registrations")
    .update({ status })
    .in("id", ids)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length || 0 });
}

// Bulk delete registrations
export async function DELETE(request: NextRequest) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { ids } = body as { ids: string[] };

  if (!ids?.length) {
    return NextResponse.json({ error: "Missing ids" }, { status: 400 });
  }

  const { error } = await supabase
    .from("registrations")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}
