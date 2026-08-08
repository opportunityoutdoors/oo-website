"use client";

import { useState } from "react";
import {
  computePipeline,
  nameOf,
  type PipelineReg,
  type StageKey,
} from "@/lib/camp-pipeline";

// The camp pipeline, and the page's navigation.
//
// Clicking a stage filters the registrant table below to the people stuck at it. That is the
// point: the panel says how many, the table says who, and getting from one to the other
// should not mean picking a tab that happens to correlate. It also makes the old status tabs
// redundant, because waitlist, approved and registered are all stages here.
//
// Read as a funnel: each stage's denominator is the stage before it, so "5 of 7 cleared"
// means five of the seven who paid.

export default function ReadinessPanel({
  eventId,
  eventDate,
  registrations,
  activeStage,
  onSelectStage,
  onChanged,
}: {
  eventId: string;
  eventDate: string | null;
  registrations: PipelineReg[];
  activeStage: StageKey | null;
  onSelectStage: (stage: StageKey | null) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [sending, setSending] = useState(false);

  // A camp that has already run is history, not a to-do list. Turkey Camp shows everyone
  // stuck at the background check stage because it happened before screening existed;
  // presenting that as outstanding work would be alarming and wrong.
  const isPast = Boolean(eventDate && new Date(eventDate) < new Date());

  const { stages, active, sendable, sent, notThrough } = computePipeline(registrations);

  async function sendPackets() {
    if (
      !confirm(
        `Send welcome packets to ${sendable.length} participant${sendable.length === 1 ? "" : "s"}?`
      )
    )
      return;

    setSending(true);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/welcome-packet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();

      // Held-back people are named whether the send succeeded or not. "Sent 8" for a camp of
      // ten reads as success unless the other two are spelled out.
      const held = data.withheld?.length
        ? "\n\nHeld back, not cleared to attend:\n" +
          data.withheld
            .map((w: { name: string; reason: string }) => `  ${w.name}: ${w.reason}`)
            .join("\n")
        : "";

      alert(
        res.ok
          ? `Welcome packets sent to ${data.sent} participant${data.sent === 1 ? "" : "s"}.${held}`
          : `${data.error || "Failed to send"}${held}`
      );
      await onChanged();
    } finally {
      setSending(false);
    }
  }

  if (active.length === 0) {
    return (
      <div className="mb-6 rounded-lg border border-near-black/10 bg-white px-5 py-4 text-sm text-near-black/50">
        Nobody has signed up yet. The pipeline appears as people join the waitlist.
      </div>
    );
  }

  const everyoneThrough = notThrough.length === 0;

  return (
    <div className="mb-6 overflow-hidden rounded-lg border border-near-black/10 bg-white">
      <div className="flex items-baseline justify-between border-b border-near-black/10 px-5 py-3">
        <h2 className="text-sm font-semibold text-near-black">Camp pipeline</h2>
        <span
          className={`text-xs font-semibold ${
            isPast
              ? "text-near-black/40"
              : everyoneThrough
                ? "text-dark-green"
                : "text-[#8B6914]"
          }`}
        >
          {isPast
            ? "This camp has already run"
            : everyoneThrough
              ? "Ready to run"
              : `${notThrough.length} of ${active.length} not through yet`}
        </span>
      </div>

      <ol>
        {stages.map((s, i) => {
          const isPacket = s.key === "packet";
          const selected = activeStage === s.key;
          const clickable = s.stuck.length > 0;

          return (
            <li
              key={s.key}
              className={`flex items-start justify-between gap-3 border-b border-near-black/5 last:border-0 ${
                isPacket ? "bg-cream/40" : ""
              } ${selected ? "bg-dark-green/5" : ""}`}
            >
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelectStage(selected ? null : s.key)}
                className={`min-w-0 flex-1 px-5 py-2.5 text-left ${
                  clickable ? "cursor-pointer hover:bg-near-black/[0.03]" : "cursor-default"
                }`}
                title={clickable ? `Show the ${s.stuck.length} waiting here` : undefined}
              >
                <span className="mr-2 text-[10px] font-bold text-near-black/25">{i + 1}</span>
                <span
                  className={`text-sm ${
                    selected ? "font-semibold text-dark-green" : "text-near-black"
                  }`}
                >
                  {s.label}
                </span>
                {s.stuck.length > 0 && !isPast && (
                  <p className="mt-0.5 truncate pl-5 text-xs text-near-black/50">
                    {s.note ? `${s.note}: ` : ""}
                    {s.stuck.slice(0, 4).map(nameOf).join(", ")}
                    {s.stuck.length > 4 ? ` and ${s.stuck.length - 4} more` : ""}
                  </p>
                )}
              </button>

              <div className="flex shrink-0 items-center gap-3 py-2.5 pr-5">
                <span
                  className={`text-xs font-semibold ${
                    isPast
                      ? "text-near-black/40"
                      : s.stuck.length === 0
                        ? "text-dark-green"
                        : "text-[#8B6914]"
                  }`}
                >
                  {s.of === 0 ? "—" : `${s.done} of ${s.of}`}
                </span>

                {isPacket && (
                  <button
                    onClick={sendPackets}
                    disabled={sending || sendable.length === 0}
                    title={
                      sendable.length === 0
                        ? "Nobody has cleared every stage yet"
                        : "Sends to everyone who has cleared every stage above"
                    }
                    className="rounded bg-dark-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-dark-green/90 disabled:opacity-40"
                  >
                    {sending
                      ? "Sending..."
                      : `Send${sendable.length > 0 ? ` (${sendable.length})` : ""}`}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {sent.length > 0 && (
        <p className="border-t border-near-black/5 px-5 py-2 text-xs text-near-black/50">
          {sent.length} welcome packet{sent.length === 1 ? "" : "s"} already sent.
        </p>
      )}
    </div>
  );
}
