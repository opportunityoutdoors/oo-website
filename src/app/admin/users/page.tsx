import { createServiceClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { UsersClient, type InviteRow, type MemberRow } from "./users-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentMember = await requireAdmin();

  const svc = createServiceClient();

  const [membersRes, invitesRes] = await Promise.all([
    svc
      .from("admin_users")
      .select("id, user_id, email, role, created_at")
      .order("created_at", { ascending: true }),
    svc
      .from("admin_invites")
      .select("id, email, role, created_at, expires_at")
      .is("accepted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ]);

  const members = (membersRes.data ?? []) as MemberRow[];
  const invites = (invitesRes.data ?? []) as InviteRow[];
  const adminCount = members.filter((m) => m.role === "admin").length;

  return (
    <>
      <h1 className="mb-8 font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
        Users
      </h1>
      <UsersClient
        members={members}
        invites={invites}
        currentUserId={currentMember.user_id}
        adminCount={adminCount}
      />
    </>
  );
}
