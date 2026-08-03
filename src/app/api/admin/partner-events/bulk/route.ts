import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";

// Bulk status changes.
//
// Ten of fifteen pending events in a typical sync are habitat workdays and nature walks
// from one source. Requiring ten individual clicks every week is how a review queue stops
// getting used, so rejecting a whole source at once is a first-class action.

const VALID_STATUSES = ["pending", "approved", "rejected", "hidden"];

export async function POST(request: NextRequest) {
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const status = body?.status;

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const patch = {
    status,
    reviewed_by: member?.id || null,
    reviewed_at: new Date().toISOString(),
  };

  let query = supabase.from("partner_events").update(patch);

  if (Array.isArray(body.ids) && body.ids.length > 0) {
    query = query.in("id", body.ids);
  } else if (typeof body.source === "string") {
    // Only ever acts on what is still pending, so this cannot silently undo an earlier
    // approval for the same source.
    query = query.eq("source", body.source).eq("status", "pending");
  } else {
    return NextResponse.json(
      { error: "Provide ids or a source" },
      { status: 400 }
    );
  }

  const { data, error } = await query.select("id");

  if (error) {
    console.error("Bulk partner event update failed:", error);
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
}
