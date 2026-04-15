import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireAdmin } from "@/lib/admin/auth";

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
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Block demoting the last admin.
  if (target.role === "admin" && role === "editor") {
    const { count } = await svc
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot demote the last admin" },
        { status: 409 }
      );
    }
  }

  const { error: updateError } = await svc
    .from("admin_users")
    .update({ role })
    .eq("id", id);

  if (updateError) {
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
    .select("id, user_id, role")
    .eq("id", id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }
  if (target.user_id === member.user_id) {
    return NextResponse.json({ error: "You cannot remove yourself" }, { status: 409 });
  }
  if (target.role === "admin") {
    const { count } = await svc
      .from("admin_users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: "Cannot remove the last admin" },
        { status: 409 }
      );
    }
  }

  // Delete the auth user — admin_users row cascades via FK.
  const { error: authError } = await svc.auth.admin.deleteUser(target.user_id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
