"use client";

import { useCallback, useEffect, useState } from "react";

// Unique perk codes for the camp, such as OnX promo codes (lib/perk-codes.ts).
//
// Read only. Codes are entered in Sanity (Camp tab, Mentee Perk Codes) like the rest of the
// camp, and this shows how many are left and who holds which. Each adult mentee gets one when
// their welcome packet is sent. The send refuses while a list has too few free codes.

type Pool = { label: string; total: number; assigned: number };
type Assignment = { label: string; code: string; name: string };

export default function PerkCodesPanel({ eventId }: { eventId: string }) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [mentees, setMentees] = useState(0);
  const [open, setOpen] = useState(false);

  // State is set in the fetch callback, never in the effect body.
  const load = useCallback(() => {
    fetch(`/api/admin/events/${eventId}/perk-codes`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setPools(data.pools ?? []);
        setAssignments(data.assignments ?? []);
        setMentees(data.mentees ?? 0);
      })
      .catch(() => {});
  }, [eventId]);

  useEffect(load, [load]);

  const summary = pools.length
    ? pools
        .map((p) => {
          const free = p.total - p.assigned;
          const holding = assignments.filter((a) => a.label === p.label).length;
          const shortBy = Math.max(Math.max(mentees - holding, 0) - free, 0);
          return (
            `${p.label} codes: ${free} left, ${p.assigned} given out` +
            (shortBy ? `. ${shortBy} short for ${mentees} mentees` : "")
          );
        })
        .join(" · ")
    : "No mentee perk codes. Add them in Content Studio, Camp tab, Mentee Perk Codes.";

  return (
    <div className="mb-4 rounded-lg border border-near-black/10 bg-white px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-near-black/70">{summary}</p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={load}
            className="rounded border border-near-black/15 px-3 py-1.5 text-xs font-semibold text-near-black/70 hover:bg-near-black/5"
          >
            Refresh
          </button>
          {assignments.length > 0 && (
            <button
              onClick={() => setOpen(!open)}
              className="rounded border border-near-black/15 px-3 py-1.5 text-xs font-semibold text-near-black/70 hover:bg-near-black/5"
            >
              {open ? "Hide" : "Who has which code"}
            </button>
          )}
        </div>
      </div>

      {open && (
        <ul className="mt-3 space-y-0.5 border-t border-near-black/10 pt-3 text-xs text-near-black/70">
          {assignments.map((a) => (
            <li key={`${a.label}-${a.code}`}>
              {a.name}: {a.label} <span className="font-mono">{a.code}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
