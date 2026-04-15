import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hashInviteToken } from "@/lib/admin/invite-token";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const svc = createServiceClient();
  const tokenHash = hashInviteToken(token);

  const { data: invite } = await svc
    .from("admin_invites")
    .select("id, email, role, expires_at, accepted_at, revoked_at, invited_by")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite" }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: "This invite has already been used" }, { status: 409 });
  }
  if (invite.revoked_at) {
    return NextResponse.json({ error: "This invite has been revoked" }, { status: 409 });
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 409 });
  }

  // If the email is somehow already a member, fail rather than create a second auth user.
  const { data: existingMember } = await svc
    .from("admin_users")
    .select("id")
    .ilike("email", invite.email)
    .maybeSingle();
  if (existingMember) {
    return NextResponse.json({ error: "This email is already a member" }, { status: 409 });
  }

  // Create the auth user (confirmed so they can sign in immediately).
  const { data: created, error: createError } = await svc.auth.admin.createUser({
    email: invite.email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Failed to create user" },
      { status: 500 }
    );
  }

  const { error: memberError } = await svc.from("admin_users").insert({
    user_id: created.user.id,
    email: invite.email,
    role: invite.role,
    invited_by: invite.invited_by,
  });
  if (memberError) {
    // Roll back the auth user so the invite can be retried.
    await svc.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  await svc
    .from("admin_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, email: invite.email });
}
