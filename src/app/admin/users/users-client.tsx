"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export type MemberRow = {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "editor";
  created_at: string;
};

export type InviteRow = {
  id: string;
  email: string;
  role: "admin" | "editor";
  created_at: string;
  expires_at: string;
};

export function UsersClient({
  members,
  invites,
  currentUserId,
  adminCount,
}: {
  members: MemberRow[];
  invites: InviteRow[];
  currentUserId: string;
  adminCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor">("editor");
  const [inviting, setInviting] = useState(false);

  function flashError(msg: string) {
    setError(msg);
    setNotice(null);
  }
  function flashNotice(msg: string) {
    setNotice(msg);
    setError(null);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setNotice(null);

    const res = await fetch("/api/admin/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const body = await res.json().catch(() => ({}));
    setInviting(false);

    if (!res.ok) {
      flashError(body.error || "Failed to send invite");
      return;
    }
    setInviteEmail("");
    setInviteRole("editor");
    flashNotice(`Invite sent to ${body.invite.email}`);
    startTransition(() => router.refresh());
  }

  async function handleRoleChange(member: MemberRow, nextRole: "admin" | "editor") {
    if (member.role === nextRole) return;
    if (member.role === "admin" && nextRole === "editor" && adminCount <= 1) {
      flashError("Cannot demote the last admin");
      return;
    }

    setError(null);
    setNotice(null);

    const res = await fetch(`/api/admin/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      flashError(body.error || "Failed to update role");
      return;
    }
    flashNotice(`Updated ${member.email} to ${nextRole}`);
    startTransition(() => router.refresh());
  }

  async function handleRemoveMember(member: MemberRow) {
    if (!confirm(`Remove ${member.email}? They'll lose access immediately.`)) return;

    const res = await fetch(`/api/admin/members/${member.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      flashError(body.error || "Failed to remove member");
      return;
    }
    flashNotice(`Removed ${member.email}`);
    startTransition(() => router.refresh());
  }

  async function handleResendInvite(invite: InviteRow) {
    const res = await fetch(`/api/admin/invites/${invite.id}`, { method: "POST" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      flashError(body.error || "Failed to resend invite");
      return;
    }
    flashNotice(`Invite resent to ${invite.email}`);
    startTransition(() => router.refresh());
  }

  async function handleRevokeInvite(invite: InviteRow) {
    if (!confirm(`Revoke the invite for ${invite.email}?`)) return;

    const res = await fetch(`/api/admin/invites/${invite.id}`, { method: "DELETE" });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      flashError(body.error || "Failed to revoke invite");
      return;
    }
    flashNotice(`Revoked invite for ${invite.email}`);
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-8">
      {/* Invite form */}
      <section className="rounded-lg border border-near-black/10 bg-white">
        <div className="border-b border-near-black/10 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
            Invite a user
          </h2>
          <p className="mt-1 text-xs text-near-black/50">
            They&rsquo;ll receive an email with a link to set their password. Invites expire in 7 days.
          </p>
        </div>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="invite-email" className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
              Email
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="person@opportunityoutdoors.org"
              className="w-full rounded border border-near-black/20 bg-white px-4 py-2.5 text-sm text-near-black placeholder:text-near-black/40 focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
            />
          </div>
          <div className="sm:w-40">
            <label htmlFor="invite-role" className="mb-1 block text-xs font-semibold uppercase tracking-[1px] text-near-black/70">
              Role
            </label>
            <select
              id="invite-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "admin" | "editor")}
              className="w-full rounded border border-near-black/20 bg-white px-3 py-2.5 text-sm text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green"
            >
              <option value="editor">Editor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={inviting}
            className="rounded bg-dark-green px-4 py-2.5 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
          >
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </form>
      </section>

      {(error || notice) && (
        <div
          className={
            error
              ? "rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              : "rounded border border-dark-green/20 bg-dark-green/5 px-4 py-3 text-sm text-dark-green"
          }
        >
          {error || notice}
        </div>
      )}

      {/* Members */}
      <section className="rounded-lg border border-near-black/10 bg-white">
        <div className="border-b border-near-black/10 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
            Members ({members.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Joined</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isSelf = m.user_id === currentUserId;
                const lastAdmin = m.role === "admin" && adminCount <= 1;
                return (
                  <tr key={m.id} className="border-b border-near-black/5 last:border-0">
                    <td className="px-5 py-3 font-medium text-near-black">
                      {m.email}
                      {isSelf && <span className="ml-2 text-xs text-near-black/40">(you)</span>}
                    </td>
                    <td className="px-5 py-3">
                      <select
                        value={m.role}
                        onChange={(e) => handleRoleChange(m, e.target.value as "admin" | "editor")}
                        disabled={isPending || (isSelf && lastAdmin)}
                        className="rounded border border-near-black/20 bg-white px-2 py-1 text-xs text-near-black focus:border-dark-green focus:outline-none focus:ring-1 focus:ring-dark-green disabled:opacity-60"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                      </select>
                    </td>
                    <td className="px-5 py-3 text-near-black/40">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {isSelf ? (
                        <span className="text-xs text-near-black/30">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m)}
                          disabled={isPending}
                          className="text-xs font-semibold text-red-700 transition-colors hover:text-red-900 disabled:opacity-50"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-near-black/40">
                    No members yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending invites */}
      <section className="rounded-lg border border-near-black/10 bg-white">
        <div className="border-b border-near-black/10 px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-[1px] text-near-black">
            Pending Invites ({invites.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Sent</th>
                <th className="px-5 py-3 font-semibold">Expires</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => {
                const expired = new Date(inv.expires_at).getTime() < Date.now();
                return (
                  <tr key={inv.id} className="border-b border-near-black/5 last:border-0">
                    <td className="px-5 py-3 font-medium text-near-black">{inv.email}</td>
                    <td className="px-5 py-3 capitalize text-near-black/60">{inv.role}</td>
                    <td className="px-5 py-3 text-near-black/40">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className={expired ? "text-red-700" : "text-near-black/40"}>
                        {expired ? "Expired" : new Date(inv.expires_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleResendInvite(inv)}
                        disabled={isPending}
                        className="text-xs font-semibold text-dark-green transition-colors hover:text-dark-green/70 disabled:opacity-50"
                      >
                        Resend
                      </button>
                      <span className="mx-2 text-near-black/20">·</span>
                      <button
                        type="button"
                        onClick={() => handleRevokeInvite(inv)}
                        disabled={isPending}
                        className="text-xs font-semibold text-red-700 transition-colors hover:text-red-900 disabled:opacity-50"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                );
              })}
              {invites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-near-black/40">
                    No pending invites
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
