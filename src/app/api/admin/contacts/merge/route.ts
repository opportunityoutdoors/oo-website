import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireAdmin } from "@/lib/admin/auth";

// POST { keepId, dropId }: merge one contact into another. Admins only, because the dropped
// contact is deleted and cannot be brought back. The work is merge_contacts() in migration
// 036, one transaction, so a failure leaves both contacts exactly as they were.
export async function POST(request: NextRequest) {
  const { error: authError } = await apiRequireAdmin();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const keepId = typeof body?.keepId === "string" ? body.keepId : "";
  const dropId = typeof body?.dropId === "string" ? body.dropId : "";
  if (!keepId || !dropId) {
    return NextResponse.json({ error: "keepId and dropId are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.rpc("merge_contacts", { keep_id: keepId, drop_id: dropId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ merged: true });
}
