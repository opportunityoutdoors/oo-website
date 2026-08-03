"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatEventDateRange } from "@/lib/format-event-date";

interface EventItem {
  id: string;
  sanity_id: string;
  /** No matching Sanity document: deleted in the Studio but stranded here. */
  orphaned?: boolean;
  title: string;
  slug: string | null;
  event_type: string;
  status: string;
  date: string;
  end_date: string | null;
  location: string;
  cost: string | null;
  spots_total: number | null;
  meeting_date: string | null;
  meeting_link: string | null;
  counts: {
    waitlist: number;
    meeting_rsvp: number;
    approved: number;
    denied: number;
    registered: number;
    attended: number;
    total: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  "hunt-camp": "Hunt Camp",
  "fish-camp": "Fish Camp",
  community: "Community",
  workshop: "Workshop",
};

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-near-black/5 text-near-black/50",
  "waitlist-open": "bg-gold/15 text-gold",
  "registration-open": "bg-dark-green/10 text-dark-green",
  "sold-out": "bg-red-100 text-red-600",
  completed: "bg-near-black/10 text-near-black/60",
  archived: "bg-near-black/5 text-near-black/30",
};

export default function EventsList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "past">("active");
  const [deleting, setDeleting] = useState<EventItem | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      const res = await fetch("/api/admin/events");
      const data = await res.json();
      setEvents(data);
      setLoading(false);
    }
    fetchEvents();
  }, []);

  const isCamp = (type: string) => type === "hunt-camp" || type === "fish-camp";
  const pastStatuses = ["completed", "archived"];

  const filteredEvents = events.filter((e) => {
    if (filter === "active") return !pastStatuses.includes(e.status);
    if (filter === "past") return pastStatuses.includes(e.status);
    return true;
  });

  if (loading) {
    return (
      <>
        <h1 className="mb-8 font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Events
        </h1>
        <div className="py-16 text-center text-near-black/40">Loading events...</div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Events
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-lg border border-near-black/10 bg-white p-1">
            {(["active", "all", "past"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded px-3 py-1.5 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                  filter === f
                    ? "bg-dark-green text-white"
                    : "text-near-black/40 hover:text-near-black"
                }`}
              >
                {f === "active" ? "Active" : f === "past" ? "Archived" : "All"} ({
                  f === "active" ? events.filter((e) => !pastStatuses.includes(e.status)).length
                  : f === "past" ? events.filter((e) => pastStatuses.includes(e.status)).length
                  : events.length
                })
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border border-near-black/10 bg-white"
          >
            <div className="flex items-start justify-between p-5">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-bold text-near-black">{event.title}</h2>
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[event.status] || STATUS_STYLES.draft}`}>
                    {event.status}
                  </span>
                  <span className="rounded bg-near-black/5 px-2 py-0.5 text-[10px] font-semibold uppercase text-near-black/50">
                    {TYPE_LABELS[event.event_type] || event.event_type}
                  </span>
                  {event.orphaned && (
                    <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/70">
                      deleted in Studio
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-near-black/50">
                  {event.date && (
                    <span>
                      {formatEventDateRange(event.date, event.end_date, "short")}
                    </span>
                  )}
                  {event.location && <span>{event.location}</span>}
                  {event.cost && <span>{event.cost}</span>}
                  {event.spots_total && <span>{event.spots_total} spots</span>}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/admin/events/${event.id}`}
                  className="rounded bg-dark-green px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
                >
                  Manage
                </Link>
                <button
                  onClick={() => setDeleting(event)}
                  className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Registration stats */}
            {event.counts.total > 0 && (
              <div className="flex gap-4 border-t border-near-black/5 px-5 py-3">
                {isCamp(event.event_type) ? (
                  <>
                    <Stat label="Waitlist" value={event.counts.waitlist} />
                    <Stat label="RSVP" value={event.counts.meeting_rsvp} />
                    <Stat label="Approved" value={event.counts.approved} />
                    <Stat label="Registered" value={event.counts.registered} />
                    <Stat label="Attended" value={event.counts.attended} />
                    {event.counts.denied > 0 && <Stat label="Denied" value={event.counts.denied} />}
                  </>
                ) : (
                  <>
                    <Stat label="Registered" value={event.counts.registered} />
                    <Stat label="Attended" value={event.counts.attended} />
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredEvents.length === 0 && (
          <div className="rounded-lg border border-near-black/10 bg-white px-5 py-16 text-center text-near-black/40">
            {filter === "active" ? "No active events." : filter === "past" ? "No archived events." : "No events found. Create one in the Content Studio."}
          </div>
        )}
      </div>

      {deleting && (
        <DeleteEventDialog
          event={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={async () => {
            setDeleting(null);
            setLoading(true);
            const res = await fetch("/api/admin/events");
            setEvents(await res.json());
            setLoading(false);
          }}
        />
      )}
    </>
  );
}

/**
 * Confirmation for a destructive delete.
 *
 * Registrations cascade from events and survey responses cascade from registrations, so
 * removing an event with attendance also erases its impact history. The dialog fetches
 * the real counts first and states them plainly, rather than asking "are you sure?" about
 * consequences the admin cannot see.
 */
function DeleteEventDialog({
  event,
  onClose,
  onDeleted,
}: {
  event: EventItem;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [info, setInfo] = useState<{
    existsInSanity: boolean;
    registrations: number;
    attended: number;
    surveyResponses: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/admin/events/${event.id}/delete`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("failed"))))
      .then((d) => {
        if (active) setInfo(d);
      })
      .catch(() => {
        if (active) setError("Could not check what this would delete.");
      });
    return () => {
      active = false;
    };
  }, [event.id]);

  const destructive = (info?.registrations ?? 0) > 0;
  const canDelete = info && (!destructive || confirmText.trim() === "DELETE");

  async function handleDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${event.id}/delete`, {
      method: "POST",
    });
    if (res.ok) {
      onDeleted();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Delete failed.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-near-black/40 p-6">
      <div className="w-full max-w-lg rounded-lg border border-near-black/10 bg-white p-6">
        <h2 className="text-lg font-bold text-near-black">
          Delete &ldquo;{event.title}&rdquo;?
        </h2>

        {!info && !error && (
          <p className="mt-3 text-sm text-near-black/50">Checking...</p>
        )}

        {info && (
          <>
            <p className="mt-3 text-sm text-near-black/70">
              This removes the event from{" "}
              {info.existsInSanity
                ? "the Content Studio and the database"
                : "the database. It is already gone from the Content Studio"}
              .
            </p>

            {destructive ? (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm">
                <p className="font-semibold text-red-700">
                  This also permanently deletes:
                </p>
                <ul className="mt-2 space-y-1 text-red-700/90">
                  <li>
                    {info.registrations} registration
                    {info.registrations === 1 ? "" : "s"}
                    {info.attended > 0 && ` (${info.attended} attended)`}
                  </li>
                  {info.surveyResponses > 0 && (
                    <li>
                      {info.surveyResponses} survey response
                      {info.surveyResponses === 1 ? "" : "s"}, and this
                      event&apos;s impact reporting with them
                    </li>
                  )}
                </ul>
                <label className="mt-3 block">
                  <span className="text-xs font-semibold text-red-700">
                    Type DELETE to confirm
                  </span>
                  <input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    className="mt-1 w-full rounded border border-red-300 bg-white px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                  />
                </label>
              </div>
            ) : (
              <p className="mt-3 text-sm text-near-black/50">
                No registrations are attached, so nothing else is lost.
              </p>
            )}
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border border-near-black/20 px-4 py-2 text-xs font-semibold text-near-black/60 hover:bg-near-black/5"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={!canDelete || busy}
            className="rounded bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-red-700 disabled:opacity-40"
          >
            {busy ? "Deleting..." : "Delete Everywhere"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-near-black">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">{label}</p>
    </div>
  );
}
