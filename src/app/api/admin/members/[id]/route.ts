import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireAdmin } from "@/lib/admin/auth";
import { isLastAdminError } from "@/lib/admin/errors";

// Change a member's role.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const role = body.role === "admin" ? "admin" : body.role === "editor" ? "editor" : null;
  if (!role) {
    return NextResponse.json({ error: "Role must be 'admin' or 'editor'" }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: target } = await svc
    .from("admin_users")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Last-admin guard enforced by enforce_last_admin trigger (migration 015).
  const { error: updateError } = await svc
    .from("admin_users")
    .update({ role })
    .eq("id", id);

  if (updateError) {
    if (isLastAdminError(updateError)) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Remove a member: deletes from admin_users AND the underlying auth user.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { member, error } = await apiRequireAdmin();
  if (error) return error;

  const { id } = await params;
  const svc = createServiceClient();

  const { data: target } = await svc
    .from("admin_users")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.user_id === member.user_id) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 409 });
  }

  // Delete the auth user — admin_users row cascades via FK, which fires the
  // last-admin trigger from migration 015.
  const { error: authError } = await svc.auth.admin.deleteUser(target.user_id);
  if (authError) {
    if (isLastAdminError(authError)) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
