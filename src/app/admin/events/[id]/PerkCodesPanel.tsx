"use client";

import { useCallback, useEffect, useState } from "react";

// Unique perk codes for the camp, such as OnX promo codes (lib/perk-codes.ts).
//
// Paste the batch once. Each adult mentee gets one code when their welcome packet is sent.
// The packet send refuses to run while a pool has fewer free codes than mentees need.

type Pool = { label: string; total: number; assigned: number };
type Assignment = { label: string; code: string; name: string };

export default function PerkCodesPanel({ eventId }: { eventId: string }) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mentees, setMentees] = useState(0);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("OnX");
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}/perk-codes`);
    if (!res.ok) return;
    const data = await res.json();
    setPools(data.pools ?? []);
    setAssignments(data.assignments ?? []);
    setMentees(data.mentees ?? 0);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/perk-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, codes: pasted }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Could not save the codes.");
        return;
      }
      alert(
        `Added ${data.added} ${label} code${data.added === 1 ? "" : "s"}.` +
          (data.skipped ? ` Skipped ${data.skipped} already loaded.` : "")
      );
      setPasted("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeUnused(pool: Pool) {
    const free = pool.total - pool.assigned;
    if (!confirm(`Remove the ${free} ${pool.label} code${free === 1 ? "" : "s"} nobody has yet? Codes already sent stay.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/events/${eventId}/perk-codes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: pool.label }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const summary = pools.length
    ? pools
        .map((p) => {
          const free = p.total - p.assigned;
          const holding = assignments.filter((a) => a.label === p.label).length;
          const stillNeed = Math.max(mentees - holding, 0);
          const shortBy = Math.max(stillNeed - free, 0);
          return `${p.label} codes: ${free} left, ${p.assigned} given out` +
            (shortBy ? `. ${shortBy} short for ${mentees} mentees` : "");
        })
        .join(" · ")
    : "No unique perk codes loaded.";

  return (
    <div className="mb-4 rounded-lg border border-near-black/10 bg-white px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-near-black/70">{summary}</p>
        <button
          onClick={() => setOpen(!open)}
          className="shrink-0 rounded border border-near-black/15 px-3 py-1.5 text-xs font-semibold text-near-black/70 hover:bg-near-black/5"
        >
          {open ? "Close" : pools.length ? "Manage codes" : "Add codes"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-near-black/10 pt-3">
          <p className="text-xs text-near-black/60">
            Paste one code per line. Each adult mentee gets one code in their welcome packet,
            and keeps the same code if the packet is sent again. {mentees} mentee
            {mentees === 1 ? "" : "s"} in this camp now.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-near-black/60" htmlFor="perk-label">
              Name
            </label>
            <input
              id="perk-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-32 rounded border border-near-black/15 px-2 py-1 text-sm"
            />
            <span className="text-xs text-near-black/40">Shows as &quot;Your {label || "OnX"} code&quot;</span>
          </div>
          <textarea
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            rows={5}
            placeholder={"CODE1\nCODE2\nCODE3"}
            className="w-full rounded border border-near-black/15 px-2 py-1 font-mono text-sm"
          />
          <button
            onClick={save}
            disabled={busy || !pasted.trim() || !label.trim()}
            className="rounded bg-dark-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-dark-green/90 disabled:opacity-40"
          >
            {busy ? "Saving..." : "Add codes"}
          </button>

          {pools.map((p) => (
            <div key={p.label} className="text-xs text-near-black/70">
              <div className="flex items-center justify-between">
                <span className="font-semibold">
                  {p.label}: {p.total} loaded, {p.assigned} given out
                </span>
                {p.total > p.assigned && (
                  <button
                    onClick={() => removeUnused(p)}
                    disabled={busy}
                    className="text-near-black/50 underline hover:text-near-black"
                  >
                    Remove unused codes
                  </button>
                )}
              </div>
              {assignments.filter((a) => a.label === p.label).length > 0 && (
                <ul className="mt-1 space-y-0.5">
                  {assignments
                    .filter((a) => a.label === p.label)
                    .map((a) => (
                      <li key={a.code}>
                        {a.name}: <span className="font-mono">{a.code}</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
