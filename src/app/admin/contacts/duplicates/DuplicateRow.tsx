"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type DuplicatePair = {
  reason: string;
  a_id: string; a_name: string; a_email: string | null; a_created: string; a_registrations: number;
  b_id: string; b_name: string; b_email: string | null; b_created: string; b_registrations: number;
};

export default function DuplicateRow({ pair }: { pair: DuplicatePair }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function keep(keepId: string, dropId: string, keepEmail: string | null, dropEmail: string | null) {
    const ok = confirm(
      `Keep ${keepEmail ?? "(no email)"} and delete ${dropEmail ?? "(no email)"}?\n\n` +
        "Everything on the deleted contact moves to the kept one. This cannot be undone."
    );
    if (!ok) return;
    setBusy(true);
    const res = await fetch("/api/admin/contacts/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, dropId }),
    });
    const data = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) alert(data?.error ?? "Could not merge.");
    router.refresh();
  }

  const side = (id: string, name: string, email: string | null, created: string, regs: number) => (
    <div className="min-w-0 flex-1">
      <Link href={`/admin/contacts/${id}`} className="text-sm font-medium text-near-black hover:underline">
        {name || "(no name)"}
      </Link>
      <p className="truncate text-xs text-near-black/60">{email ?? "(no email)"}</p>
      <p className="text-[11px] text-near-black/40">
        added {created} · {regs} registration{regs === 1 ? "" : "s"}
      </p>
    </div>
  );

  return (
    <div className="flex flex-wrap items-center gap-4 rounded border border-near-black/10 bg-white p-3">
      <span className="w-36 shrink-0 text-[11px] uppercase tracking-wide text-near-black/40">{pair.reason}</span>
      {side(pair.a_id, pair.a_name, pair.a_email, pair.a_created, pair.a_registrations)}
      {side(pair.b_id, pair.b_name, pair.b_email, pair.b_created, pair.b_registrations)}
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => keep(pair.a_id, pair.b_id, pair.a_email, pair.b_email)}
          className="rounded border border-dark-green/30 px-2 py-1 text-xs text-dark-green hover:bg-dark-green/5 disabled:opacity-40"
        >
          Keep left
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => keep(pair.b_id, pair.a_id, pair.b_email, pair.a_email)}
          className="rounded border border-dark-green/30 px-2 py-1 text-xs text-dark-green hover:bg-dark-green/5 disabled:opacity-40"
        >
          Keep right
        </button>
      </div>
    </div>
  );
}
