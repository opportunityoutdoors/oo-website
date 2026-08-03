import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireMember } from "@/lib/admin/auth";

// Approve, reject, hide, or edit a single partner event.

const VALID_STATUSES = ["pending", "approved", "rejected", "hidden"];

const EDITABLE = [
  "title",
  "url",
  "starts_at",
  "ends_at",
  "location",
  "city",
  "state",
  "cost",
  "description",
  "organizer",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { member, error: authError } = await apiRequireMember();
  if (authError) return authError;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const patch: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    patch.status = body.status;
    patch.reviewed_by = member?.id || null;
    patch.reviewed_at = new Date().toISOString();
  }

  let touchedContent = false;
  for (const field of EDITABLE) {
    if (body[field] !== undefined) {
      const value = typeof body[field] === "string" ? body[field].trim() : body[field];
      patch[field] = value === "" ? null : value;
      touchedContent = true;
    }
  }

  if (!touchedContent && patch.status === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  // Editing any content field takes ownership of the row: later syncs refresh liveness
  // but stop rewriting the wording, so a cleaned-up title survives the next Monday.
  if (touchedContent) patch.manually_edited = true;

  const { error } = await supabase
    .from("partner_events")
    .update(patch)
    .eq("id", id);

  if (error) {
    console.error("Partner event update failed:", error);
    return NextResponse.json({ error: "Could not update" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Hard delete, for manual rows entered by mistake. Scraped rows should be rejected rather
 * than deleted, otherwise the next sync simply recreates them as pending.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error: authError } = await apiRequireMember();
  if (authError) return authError;

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: row } = await supabase
    .from("partner_events")
    .select("source")
    .eq("id", id)
    .single();

  if (row && row.source !== "manual") {
    return NextResponse.json(
      { error: "Reject scraped events instead of deleting; a sync would recreate them." },
      { status: 400 }
    );
  }

  await supabase.from("partner_events").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
