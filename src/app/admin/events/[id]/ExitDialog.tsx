"use client";

import { useState } from "react";
import { EXIT_REASONS } from "@/lib/camp-pipeline";

// Asking why somebody is no longer coming.
//
// Shared by the board and by the table's bulk action deliberately. They used to disagree:
// dragging a card out demanded a reason, while the table's "Deny" button set a status with
// none, producing a person in Turned away that the board itself would have refused to
// create. Two routes to the same state is how a rule becomes optional.

export default function ExitDialog({
  name,
  to,
  onCancel,
  onConfirm,
}: {
  /** Who is leaving. A count reads fine here too, e.g. "3 people". */
  name: string;
  to: "turned_away" | "dropped_out";
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const options = EXIT_REASONS.filter((r) => r.position === to);
  const [reason, setReason] = useState("");
  const chosen = options.find((o) => o.value === reason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-near-black/40 p-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-near-black">
          {to === "turned_away" ? "Turning away" : "Marking as dropped out"}
        </h3>
        <p className="mt-1 text-sm text-near-black/60">{name}</p>

        {/* Required, because "not attending" with no reason is what makes a camp impossible
            to learn anything from afterwards. */}
        <div className="mt-4 space-y-1.5">
          {options.map((o) => (
            <label
              key={o.value}
              className={`flex cursor-pointer gap-2 rounded border p-2.5 ${
                reason === o.value
                  ? "border-dark-green bg-dark-green/5"
                  : "border-near-black/15 hover:border-near-black/30"
              }`}
            >
              <input
                type="radio"
                name="exit-reason"
                checked={reason === o.value}
                onChange={() => setReason(o.value)}
                className="mt-0.5 accent-dark-green"
              />
              <span className="text-sm text-near-black">{o.label}</span>
            </label>
          ))}
        </div>

        {chosen?.consequence && (
          <p className="mt-3 rounded bg-cream/60 px-3 py-2 text-xs leading-relaxed text-near-black/60">
            {chosen.consequence}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason}
            className="rounded bg-dark-green px-4 py-2 text-sm font-semibold text-white hover:bg-dark-green/90 disabled:opacity-40"
          >
            Move
          </button>
          <button
            onClick={onCancel}
            className="rounded px-4 py-2 text-sm font-semibold text-near-black/60 hover:bg-near-black/5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
