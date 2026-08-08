"use client";

import { useState } from "react";
import { evaluateEligibility, mayParticipate } from "@/lib/background-check/eligibility";

// The camp pipeline, in the order it actually happens.
//
//   waitlist -> zoom -> approval -> registration -> payment -> background check
//            -> match -> welcome packet
//
// Every one of these was already visible somewhere: statuses in the pipeline tabs, matching
// in its own tab, screening in a column, packets buried inside matching. The admin was
// assembling the sequence in their head across three views. OO runs one camp at a time, so
// the event page is the whole job and this is the top of it.
//
// Read as a funnel: each stage's denominator is the stage before it. "5 of 7 cleared" means
// five of the seven who paid, not five of everyone who ever signed up. That is what makes
// the blocked count meaningful rather than alarming.

type Reg = {
  id: string;
  status: string;
  role: string | null;
  payment_status: string | null;
  waiver_signed: boolean;
  meeting_date_selected: string | null;
  welcome_packet_sent?: boolean;
  mentor_id?: string | null;
  guardian_registration_id?: string | null;
  contacts: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    date_of_birth: string | null;
    background_check_status: string | null;
    background_check_expires_at: string | null;
  } | null;
};

function nameOf(r: Reg) {
  const c = r.contacts;
  return [c?.first_name, c?.last_name].filter(Boolean).join(" ") || c?.email || "Unknown";
}

function isCleared(r: Reg) {
  const c = r.contacts;
  return mayParticipate(
    evaluateEligibility({
      dateOfBirth: c?.date_of_birth ?? null,
      status: (c?.background_check_status ?? "none") as never,
      expiresAt: c?.background_check_expires_at ?? null,
    })
  );
}

/** A mentor needs no mentor, and a minor is matched through the guardian they arrived with. */
function isMatched(r: Reg) {
  if (r.role !== "Mentee") return true;
  return Boolean(r.mentor_id || r.guardian_registration_id);
}

export default function ReadinessPanel({
  eventId,
  eventDate,
  registrations,
  onChanged,
}: {
  eventId: string;
  eventDate: string | null;
  registrations: Reg[];
  onChanged: () => void | Promise<void>;
}) {
  // A camp that has already run is history, not a to-do list. Turkey Camp shows all 18
  // registrants stuck at "background check" because it happened before screening existed;
  // presenting that as outstanding work would be alarming and wrong. The stages still
  // render, as a record of how it went.
  const isPast = Boolean(eventDate && new Date(eventDate) < new Date());
  const [sending, setSending] = useState(false);

  // Denied people have left the pipeline. Counting them as stuck would mean the funnel
  // never completes.
  const active = registrations.filter((r) => r.status !== "denied");

  const pastWaitlist = active.filter((r) => r.status !== "waitlist");
  const metOrScheduled = active.filter(
    (r) => r.meeting_date_selected || ["approved", "registered", "attended"].includes(r.status)
  );
  const approved = active.filter((r) =>
    ["approved", "registered", "attended"].includes(r.status)
  );
  const registered = active.filter((r) => ["registered", "attended"].includes(r.status));
  const signed = registered.filter((r) => r.waiver_signed);
  const paid = registered.filter((r) => r.payment_status === "paid");
  const cleared = paid.filter(isCleared);
  const matched = cleared.filter(isMatched);
  const sent = matched.filter((r) => r.welcome_packet_sent);

  // Only people who can actually receive one. Guardianed minors are addressed through their
  // guardian and never emailed directly.
  const sendable = matched.filter((r) => !r.welcome_packet_sent && !r.guardian_registration_id);

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

  type Stage = {
    label: string;
    done: number;
    of: number;
    /** Who has not cleared this stage. Named, because a count alone is not actionable. */
    stuck: string[];
    note?: string;
  };

  const stages: Stage[] = [
    {
      label: "Waitlist",
      done: pastWaitlist.length,
      of: active.length,
      stuck: active.filter((r) => r.status === "waitlist").map(nameOf),
      note: "waiting to be moved on",
    },
    {
      label: "Zoom meeting",
      done: metOrScheduled.length,
      of: pastWaitlist.length,
      stuck: pastWaitlist.filter((r) => !metOrScheduled.includes(r)).map(nameOf),
      note: "no meeting slot chosen",
    },
    {
      label: "Approved / invited",
      done: approved.length,
      of: metOrScheduled.length,
      stuck: metOrScheduled.filter((r) => !approved.includes(r)).map(nameOf),
      note: "met but not yet approved or invited",
    },
    {
      label: "Registered",
      done: registered.length,
      of: approved.length,
      stuck: approved.filter((r) => !registered.includes(r)).map(nameOf),
      note: "invited but has not completed the form",
    },
    {
      label: "Waiver signed",
      done: signed.length,
      of: registered.length,
      stuck: registered.filter((r) => !r.waiver_signed).map(nameOf),
    },
    {
      label: "Paid",
      done: paid.length,
      of: registered.length,
      stuck: registered.filter((r) => r.payment_status !== "paid").map(nameOf),
    },
    {
      label: "Background check",
      done: cleared.length,
      of: paid.length,
      stuck: paid.filter((r) => !isCleared(r)).map(nameOf),
      note: "not cleared to attend",
    },
    {
      label: "Matched",
      done: matched.length,
      of: cleared.length,
      stuck: cleared.filter((r) => !isMatched(r)).map(nameOf),
      note: "needs a mentor",
    },
  ];

  // DISTINCT people, not the sum of the stuck lists. Summing double counts: someone who has
  // not paid is also, necessarily, not screened and not matched, so they appear at three
  // stages. Turkey Camp reported "19 outstanding" for 18 registrants, which is the kind of
  // number that teaches people to distrust the panel.
  //
  // `matched` is the last gate, and reaching it means every earlier one was passed, so
  // anyone not in it is not through the pipeline.
  const notThrough = active.filter((r) => !matched.includes(r));
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
        {stages.map((s, i) => (
          <li
            key={s.label}
            className="flex items-start justify-between gap-4 border-b border-near-black/5 px-5 py-2.5"
          >
            <div className="min-w-0">
              <span className="mr-2 text-[10px] font-bold text-near-black/25">{i + 1}</span>
              <span className="text-sm text-near-black">{s.label}</span>
              {s.stuck.length > 0 && !isPast && (
                <p className="mt-0.5 truncate pl-5 text-xs text-near-black/50">
                  {s.note ? `${s.note}: ` : ""}
                  {s.stuck.slice(0, 4).join(", ")}
                  {s.stuck.length > 4 ? ` and ${s.stuck.length - 4} more` : ""}
                </p>
              )}
            </div>
            <span
              className={`shrink-0 text-xs font-semibold ${
                isPast
                  ? "text-near-black/40"
                  : s.stuck.length === 0
                    ? "text-dark-green"
                    : "text-[#8B6914]"
              }`}
            >
              {s.of === 0 ? "—" : `${s.done} of ${s.of}`}
            </span>
          </li>
        ))}

        <li className="flex items-center justify-between gap-4 bg-cream/40 px-5 py-3">
          <div>
            <span className="mr-2 text-[10px] font-bold text-near-black/25">9</span>
            <span className="text-sm text-near-black">Welcome packet</span>
            <p className="mt-0.5 pl-5 text-xs text-near-black/50">
              {sent.length} sent
              {sendable.length > 0 ? `, ${sendable.length} ready` : ""}
              {notThrough.length > 0
                ? `, ${notThrough.length} still working through the stages above`
                : ""}
            </p>
          </div>
          <button
            onClick={sendPackets}
            disabled={sending || sendable.length === 0}
            title={
              sendable.length === 0
                ? "Nobody has cleared every stage yet"
                : "Sends to everyone who has cleared every stage above"
            }
            className="shrink-0 rounded bg-dark-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-dark-green/90 disabled:opacity-40"
          >
            {sending ? "Sending..." : `Send${sendable.length > 0 ? ` (${sendable.length})` : ""}`}
          </button>
        </li>
      </ol>
    </div>
  );
}
