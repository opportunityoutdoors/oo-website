import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { apiRequireAdmin } from "@/lib/admin/auth";
import { generateInviteToken, inviteExpiresAt } from "@/lib/admin/invite-token";
import { sendInviteEmail } from "@/lib/admin/invite-email";

// Revoke a pending invite.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await apiRequireAdmin();
  if (error) return error;

  const { id } = await params;
  const svc = createServiceClient();

  const { error: updateError } = await svc
    .from("admin_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("accepted_at", null);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Resend an invite: regenerate token + extend expiry + re-email.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { member, error } = await apiRequireAdmin();
  if (error) return error;

  const { id } = await params;
  const svc = createServiceClient();

  const { data: invite } = await svc
    .from("admin_invites")
    .select("id, email, role, accepted_at, revoked_at")
    .eq("id", id)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.accepted_at) {
    return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
  }

  const { token, tokenHash } = generateInviteToken();

  const { error: updateError } = await svc
    .from("admin_invites")
    .update({
      token_hash: tokenHash,
      expires_at: inviteExpiresAt(),
      revoked_at: null,
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const inviteUrl = `${baseUrl}/admin/accept-invite?token=${token}`;

  try {
    await sendInviteEmail({
      to: invite.email,
      role: invite.role,
      inviteUrl,
      inviterEmail: member.email,
    });
  } catch (err) {
    console.error("Invite resend email error:", err);
  }

  return NextResponse.json({ ok: true });
}
