"use client";

import { useState } from "react";
import Link from "next/link";
import {
  byPosition,
  nameOf,
  position,
  requirements,
  POSITIONS,
  EXIT_REASONS,
  type PipelineReg,
  type Position,
} from "@/lib/camp-pipeline";

// The camp board.
//
// Columns are POSITIONS: where a person is, one at a time, changed by a decision. Badges on
// the card are REQUIREMENTS: what they have satisfied, many at once, in any order, mostly
// resolving without anyone doing anything.
//
// The previous design modelled requirements as positions, which is what produced a pipeline
// you could only walk one way. "Payment" is not a place anyone stands.
//
// Drag only, no keyboard path. This is used by a handful of people on desktop with at most a
// couple of dozen cards. That is a deliberate trade, recorded here so nobody assumes it was
// an oversight.

type Props = {
  registrations: PipelineReg[];
  /** Past camps hide requirement badges: they describe readiness, which is about the future. */
  isPast: boolean;
  onMoved: () => void | Promise<void>;
  onReview: (contactId: string, name: string, status: string) => void;
};

export default function CampBoard({ registrations, isPast, onMoved, onReview }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Position | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A move out of the pipeline needs a reason, so the drop opens this instead of applying.
  const [exiting, setExiting] = useState<{
    reg: PipelineReg;
    to: Extract<Position, "turned_away" | "dropped_out">;
  } | null>(null);

  const columns = byPosition(registrations);

  async function move(registrationId: string, to: Position, exitReason?: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/registrations/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId, to, exitReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not move that card.");
        return false;
      }
      await onMoved();
      return true;
    } finally {
      setBusy(false);
    }
  }

  function onDrop(to: Position) {
    const reg = registrations.find((r) => r.id === dragging);
    setDragging(null);
    setOver(null);
    if (!reg) return;

    if (to === "turned_away" || to === "dropped_out") {
      setExiting({ reg, to });
      return;
    }
    move(reg.id, to);
  }

  return (
    <div className="mb-6">
      {error && (
        <p className="mb-3 rounded border border-[#b00]/25 bg-[#b00]/5 px-4 py-3 text-sm text-[#b00]">
          {error}
        </p>
      )}

      {/* Columns share the width rather than being fixed, so the board fills a wide screen
          and only scrolls once seven columns cannot fit at their minimum. Seven fixed
          190px columns needed 1402px, which overflows an ordinary laptop once the nav is
          accounted for. */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {POSITIONS.map((col) => {
          const cards = columns[col.key];
          // Ready is computed, never assigned. Refusing the drop here rather than letting the
          // server explain it keeps the board honest about what it can do.
          const droppable = col.key !== "ready" && !busy;
          const isOver = over === col.key && droppable;

          return (
            <div
              key={col.key}
              onDragOver={(e) => {
                if (!droppable) return;
                e.preventDefault();
                setOver(col.key);
              }}
              onDragLeave={() => setOver((c) => (c === col.key ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                if (droppable) onDrop(col.key);
              }}
              className={`min-w-[150px] flex-1 rounded-lg border p-1.5 transition-colors ${
                isOver
                  ? "border-dark-green bg-dark-green/5"
                  : "border-near-black/10 bg-cream/30"
              }`}
            >
              <div className="px-1 pb-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-near-black">{col.label}</span>
                  <span className="text-xs text-near-black/40">{cards.length}</span>
                </div>
                <p className="mt-0.5 text-[11px] leading-tight text-near-black/40">
                  {col.key === "ready" ? "arrives on its own" : col.blurb}
                </p>
              </div>

              <div className="space-y-1.5">
                {cards.map((reg) => (
                  <Card
                    key={reg.id}
                    reg={reg}
                    isPast={isPast}
                    dragging={dragging === reg.id}
                    onDragStart={() => setDragging(reg.id)}
                    onDragEnd={() => {
                      setDragging(null);
                      setOver(null);
                    }}
                    onReview={onReview}
                  />
                ))}
                {cards.length === 0 && (
                  <p className="px-1 py-3 text-center text-[11px] text-near-black/25">
                    empty
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {exiting && (
        <ExitDialog
          name={nameOf(exiting.reg)}
          to={exiting.to}
          onCancel={() => setExiting(null)}
          onConfirm={async (reason) => {
            const ok = await move(exiting.reg.id, exiting.to, reason);
            if (ok) setExiting(null);
          }}
        />
      )}
    </div>
  );
}

function Card({
  reg,
  isPast,
  dragging,
  onDragStart,
  onDragEnd,
  onReview,
}: {
  reg: PipelineReg;
  isPast: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onReview: (contactId: string, name: string, status: string) => void;
}) {
  const reqs = requirements(reg);
  const reason = EXIT_REASONS.find((x) => x.value === reg.exit_reason);
  // Anyone out of the pipeline, however they left. Keying this on exit_reason alone missed
  // people declined by screening, whose exit is recorded on the contact rather than here,
  // so a turned-away person still showed badges for requirements they will never meet.
  const gone = ["turned_away", "dropped_out"].includes(position(reg));

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded border border-near-black/10 bg-white p-2 active:cursor-grabbing ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[13px] font-medium leading-tight text-near-black">
          {nameOf(reg)}
        </span>
        {reg.role && (
          <span className="shrink-0 text-[10px] text-near-black/35">{reg.role}</span>
        )}
      </div>

      {/* Requirements describe readiness, which is a question about the future. A camp that
          ran before background checks existed did not fail one. */}
      {!isPast && !gone && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {reqs.map((r) => (
            <span
              key={r.label}
              className={`rounded px-1.5 py-0.5 text-[10px] ${
                r.met
                  ? "bg-dark-green/10 text-dark-green"
                  : "bg-[#b00]/10 text-[#b00]"
              }`}
            >
              {r.label}
            </span>
          ))}
        </div>
      )}

      {(reason || (gone && reg.contacts?.background_check_status === "declined")) && (
        <p className="mt-1 text-[10px] leading-tight text-near-black/45">
          {reason?.label ?? "Declined after a background check"}
        </p>
      )}

      <div className="mt-1.5 flex gap-2">
        {reg.contacts?.id && (
          <>
            <Link
              href={`/admin/contacts/${reg.contacts.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] text-near-black/40 hover:text-dark-green"
            >
              profile
            </Link>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview(
                  reg.contacts!.id!,
                  nameOf(reg),
                  reg.contacts!.background_check_status ?? "none"
                );
              }}
              className="text-[10px] text-near-black/40 hover:text-dark-green"
            >
              review
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ExitDialog({
  name,
  to,
  onCancel,
  onConfirm,
}: {
  name: string;
  to: "turned_away" | "dropped_out";
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const options = EXIT_REASONS.filter((r) => r.position === to);
  const [reason, setReason] = useState("");
  const chosen = options.find((o) => o.value === reason);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-near-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-near-black">
          {to === "turned_away" ? "Turning away" : "Marking as dropped out"}
        </h3>
        <p className="mt-1 text-sm text-near-black/60">{name}</p>

        {/* Required, because "not attending" without a reason is the thing that makes a camp
            impossible to learn anything from afterwards. */}
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
