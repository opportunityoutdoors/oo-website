"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface EventItem {
  sanity_id: string;
  supabase_id: string | null;
  title: string;
  slug: string;
  event_type: string;
  status: string;
  date: string;
  end_date: string | null;
  location: string;
  cost: string | null;
  spots_total: number | null;
  synced: boolean;
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
  const [syncing, setSyncing] = useState<string | null>(null);

  async function fetchEvents() {
    setLoading(true);
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    setEvents(data);
    setLoading(false);
  }

  useEffect(() => {
    fetchEvents();
  }, []);

  async function syncEvent(event: EventItem) {
    setSyncing(event.sanity_id);
    await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sanity_id: event.sanity_id,
        title: event.title,
        event_type: event.event_type,
        status: event.status,
        date: event.date,
        end_date: event.end_date,
        location: event.location,
        cost: event.cost,
        spots_total: event.spots_total,
      }),
    });
    setSyncing(null);
    fetchEvents();
  }

  const isCamp = (type: string) => type === "hunt-camp" || type === "fish-camp";

  if (loading) {
    return (
      <>
        <h1 className="mb-8 font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Events
        </h1>
        <div className="py-16 text-center text-near-black/40">Loading events from Sanity...</div>
      </>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Events
        </h1>
        <span className="text-sm text-near-black/40">{events.length} events</span>
      </div>

      <p className="mb-6 text-sm text-near-black/50">
        Events are created in Sanity. Click &ldquo;Enable Registration&rdquo; to start tracking signups in the admin.
      </p>

      <div className="space-y-4">
        {events.map((event) => (
          <div
            key={event.sanity_id}
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
                </div>

                <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-near-black/50">
                  {event.date && (
                    <span>
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {event.end_date && ` – ${new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                    </span>
                  )}
                  {event.location && <span>{event.location}</span>}
                  {event.cost && <span>{event.cost}</span>}
                  {event.spots_total && <span>{event.spots_total} spots</span>}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {event.synced && event.supabase_id ? (
                  <Link
                    href={`/admin/events/${event.supabase_id}`}
                    className="rounded bg-dark-green px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
                  >
                    Manage
                  </Link>
                ) : (
                  <button
                    onClick={() => syncEvent(event)}
                    disabled={syncing === event.sanity_id}
                    className="rounded border border-dark-green px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-dark-green transition-colors hover:bg-dark-green hover:text-white disabled:opacity-50"
                  >
                    {syncing === event.sanity_id ? "Syncing..." : "Enable Registration"}
                  </button>
                )}
              </div>
            </div>

            {/* Registration stats (only for synced events) */}
            {event.synced && event.counts.total > 0 && (
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

        {events.length === 0 && (
          <div className="rounded-lg border border-near-black/10 bg-white px-5 py-16 text-center text-near-black/40">
            No events found in Sanity. Create one in the Content Studio.
          </div>
        )}
      </div>
    </>
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
