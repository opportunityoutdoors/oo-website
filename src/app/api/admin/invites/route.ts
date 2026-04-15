import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireAdmin } from "@/lib/admin/auth";
import { generateInviteToken, inviteExpiresAt } from "@/lib/admin/invite-token";
import { sendInviteEmail } from "@/lib/admin/invite-email";

export async function POST(request: NextRequest) {
  const { member, error } = await apiRequireAdmin();
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = body.role === "admin" ? "admin" : body.role === "editor" ? "editor" : null;

  if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!role) {
    return NextResponse.json({ error: "Role must be 'admin' or 'editor'" }, { status: 400 });
  }

  const svc = createServiceClient();

  const { data: existingMember } = await svc
    .from("admin_users")
    .select("id")
    .ilike("email", rawEmail)
    .maybeSingle();
  if (existingMember) {
    return NextResponse.json({ error: "That email is already a member" }, { status: 409 });
  }

  // Revoke any outstanding unexpired, unaccepted invites for this email so there's
  // only ever one active token.
  await svc
    .from("admin_invites")
    .update({ revoked_at: new Date().toISOString() })
    .ilike("email", rawEmail)
    .is("accepted_at", null)
    .is("revoked_at", null);

  const { token, tokenHash } = generateInviteToken();

  const { data: invite, error: insertError } = await svc
    .from("admin_invites")
    .insert({
      email: rawEmail,
      role,
      token_hash: tokenHash,
      invited_by: member.user_id,
      expires_at: inviteExpiresAt(),
    })
    .select("id, email, role, created_at, expires_at")
    .single();

  if (insertError || !invite) {
    return NextResponse.json({ error: insertError?.message || "Failed to create invite" }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const inviteUrl = `${baseUrl}/admin/accept-invite?token=${token}`;

  try {
    await sendInviteEmail({
      to: rawEmail,
      role,
      inviteUrl,
      inviterEmail: member.email,
    });
  } catch (err) {
    console.error("Invite email error:", err);
  }

  return NextResponse.json({ invite });
}
