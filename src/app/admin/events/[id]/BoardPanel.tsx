"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  name: string;
  title: string | null;
  email: string | null;
  registration: { id: string; role: string | null; status: string } | null;
};

/**
 * Which board members are going to this camp, and as what. Mentor sends the normal
 * registration invite. Staff owes nothing and lands in Ready. Not going removes them.
 */
export default function BoardPanel({ eventId, onChanged }: { eventId: string; onChanged: () => void }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});

  // Bumped after every save to load the list again.
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/events/${eventId}/board`)
      .then((res) => res.json().then((data) => (res.ok ? data.members : [])))
      .catch(() => [])
      .then((list: Member[]) => {
        if (alive) setMembers(list);
      });
    return () => {
      alive = false;
    };
  }, [eventId, version]);

  async function post(sanityId: string, body: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(sanityId);
    const res = await fetch(`/api/admin/events/${eventId}/board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sanityId, ...body }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) alert(data?.error ?? "Could not save.");
    else if (data?.warning) alert(data.warning);
    setVersion((v) => v + 1);
    onChanged();
    setBusy(null);
  }

  if (!members) return null;

  return (
    <div className="rounded-lg border border-near-black/10 bg-white p-5">
      <h2 className="mb-1 text-xs font-bold uppercase tracking-[1px] text-near-black/40">Board</h2>
      <p className="mb-3 text-xs text-near-black/50">
        Mentor sends the registration invite. Staff needs nothing and goes straight to Ready.
      </p>
      <ul className="divide-y divide-near-black/5">
        {members.map((m) => {
          const current = m.registration?.role === "Staff" ? "Staff" : m.registration?.role === "Mentor" ? "Mentor" : "";
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-2">
              <div className="min-w-[180px] flex-1">
                <p className="text-sm font-medium text-near-black">{m.name}</p>
                <p className="text-[11px] text-near-black/45">
                  {m.email ?? "No email linked"}
                  {m.registration && ` · ${m.registration.status}`}
                </p>
              </div>
              {m.email ? (
                <select
                  aria-label={`${m.name} at this camp`}
                  value={current}
                  disabled={busy === m.id}
                  onChange={(e) => {
                    const as = e.target.value || null;
                    post(
                      m.id,
                      { action: "set", as },
                      as === "Mentor"
                        ? `Add ${m.name} as a mentor? This emails them the registration invite.`
                        : as === null
                          ? `Take ${m.name} off this camp?`
                          : undefined
                    );
                  }}
                  className="rounded border border-near-black/15 px-2 py-1 text-sm"
                >
                  <option value="">Not going</option>
                  <option value="Mentor">Mentor</option>
                  <option value="Staff">Staff</option>
                </select>
              ) : (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    post(m.id, { action: "link", email: emails[m.id] ?? "" });
                  }}
                >
                  <input
                    type="email"
                    placeholder="their email"
                    aria-label={`Email for ${m.name}`}
                    value={emails[m.id] ?? ""}
                    onChange={(e) => setEmails({ ...emails, [m.id]: e.target.value })}
                    className="w-52 rounded border border-near-black/15 px-2 py-1 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy === m.id}
                    className="rounded border border-dark-green/30 px-2 py-1 text-xs text-dark-green hover:bg-dark-green/5 disabled:opacity-40"
                  >
                    Link
                  </button>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
