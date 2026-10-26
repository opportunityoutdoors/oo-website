"use client";

import { useState } from "react";
import { computePipeline, byPosition, type PipelineReg } from "@/lib/camp-pipeline";

// A one-line readout, plus the welcome packet send.
//
// This used to be a nine-stage funnel that was also the page's navigation. It was adequate
// at telling you the state of the camp and bad at getting you to the people in it, because
// stages went dead once nobody was stuck at them and clicking one showed who was stuck
// BEFORE it rather than who was in it. The board does the navigating now.
//
// What survives is the summary, which was the half that worked, and the send, which needs to
// live next to a count of who it will reach.

export default function ReadinessPanel({
  eventId,
  eventDate,
  registrations,
  onChanged,
}: {
  eventId: string;
  eventDate: string | null;
  registrations: PipelineReg[];
  onChanged: () => void | Promise<void>;
}) {
  const [sending, setSending] = useState(false);

  const isPast = Boolean(eventDate && new Date(eventDate) < new Date());
  const { sendable, sent } = computePipeline(registrations);
  const cols = byPosition(registrations);

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

  if (registrations.length === 0) return null;

  // A finished camp is a different question. "0 ready" is meaningless once it has run, and
  // readiness counts on a past camp read as failures rather than history.
  const bits = isPast
    ? [
        `${cols.attended.length} attended`,
        ...(cols.turned_away.length ? [`${cols.turned_away.length} turned away`] : []),
        ...(cols.dropped_out.length ? [`${cols.dropped_out.length} dropped out`] : []),
      ]
    : [
        `${cols.registered.length + cols.ready.length} registered`,
        `${cols.ready.length} ready`,
        ...(cols.invited.length ? [`${cols.invited.length} yet to register`] : []),
        ...(cols.waitlist.length ? [`${cols.waitlist.length} on the waitlist`] : []),
        ...(sent.length ? [`${sent.length} packet${sent.length === 1 ? "" : "s"} sent`] : []),
      ];

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-near-black/10 bg-white px-4 py-2.5">
      <p className="text-sm text-near-black/70">
        {isPast && (
          <span className="mr-2 text-xs font-semibold text-near-black/40">
            This camp has already run.{" "}
          </span>
        )}
        {bits.join(" · ") || "Nobody recorded."}
      </p>

      {!isPast && (
        <button
          onClick={sendPackets}
          disabled={sending || sendable.length === 0}
          title={
            sendable.length === 0
              ? "Nobody in Ready is matched yet"
              : "Sends to everyone in Ready who is matched and has not had one"
          }
          className="shrink-0 rounded bg-dark-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-dark-green/90 disabled:opacity-40"
        >
          {sending
            ? "Sending..."
            : `Send welcome packets${sendable.length > 0 ? ` (${sendable.length})` : ""}`}
        </button>
      )}
    </div>
  );
}
