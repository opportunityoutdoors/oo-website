"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Registration {
  id: string;
  status: string;
  role: string;
  payment_status: string;
  waiver_signed: boolean;
  token: string | null;
  meeting_date_selected: string | null;
  created_at: string;
  contacts: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    city_state: string | null;
    tshirt_size: string | null;
  };
}

interface MeetingSlot {
  date: string;
  label: string;
  meetingLink?: string;
}

interface EventDetail {
  id: string;
  sanity_id: string;
  title: string;
  event_type: string;
  status: string;
  date_start: string | null;
  date_end: string | null;
  location: string | null;
  cost: string | null;
  spots_total: number | null;
  spots_remaining: number | null;
  meeting_slots: MeetingSlot[];
  registrations: Registration[];
}

type PipelineTab = "waitlist" | "approved" | "registered" | "all";

const STATUS_STYLES: Record<string, string> = {
  waitlist: "bg-gold/15 text-gold",
  meeting_rsvp: "bg-blue-100 text-blue-600",
  approved: "bg-dark-green/10 text-dark-green",
  denied: "bg-red-100 text-red-600",
  registered: "bg-dark-green/15 text-dark-green",
  attended: "bg-dark-green/20 text-dark-green",
};

export default function EventPipeline({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PipelineTab>("all");

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}`);
    if (res.ok) {
      setEvent(await res.json());
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (loading) {
    return <div className="py-16 text-center text-near-black/40">Loading...</div>;
  }

  if (!event) {
    return (
      <div className="py-16 text-center text-near-black/40">
        Event not found. <Link href="/admin/events" className="text-dark-green hover:underline">Back to Events</Link>
      </div>
    );
  }

  const isCamp = event.event_type === "hunt-camp" || event.event_type === "fish-camp";

  const filteredRegs = event.registrations.filter((r) => {
    if (activeTab === "all") return true;
    if (activeTab === "waitlist") return r.status === "waitlist" || r.status === "meeting_rsvp";
    if (activeTab === "approved") return r.status === "approved" || r.status === "denied";
    if (activeTab === "registered") return r.status === "registered" || r.status === "attended";
    return true;
  });

  const counts = {
    waitlist: event.registrations.filter((r) => r.status === "waitlist" || r.status === "meeting_rsvp").length,
    approved: event.registrations.filter((r) => r.status === "approved" || r.status === "denied").length,
    registered: event.registrations.filter((r) => r.status === "registered" || r.status === "attended").length,
    all: event.registrations.length,
  };

  return (
    <>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/events"
          className="mb-3 inline-block text-xs font-semibold uppercase tracking-[1px] text-near-black/40 transition-colors hover:text-near-black"
        >
          &larr; Back to Events
        </Link>
        <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          {event.title}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-near-black/50">
          {event.date_start && (
            <span>
              {new Date(event.date_start).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {event.date_end && ` – ${new Date(event.date_end).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`}
            </span>
          )}
          {event.location && <span>{event.location}</span>}
          {event.cost && <span>{event.cost}</span>}
          {event.spots_total && <span>{event.spots_total} spots</span>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Event Info Sidebar */}
        <div className="space-y-4 lg:col-span-1">
          {/* Stats */}
          <div className="rounded-lg border border-near-black/10 bg-white p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
              Overview
            </h2>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="font-semibold text-near-black/40">Total Signups</dt>
                <dd className="font-bold text-near-black">{event.registrations.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-semibold text-near-black/40">Spots</dt>
                <dd className="text-near-black">{event.spots_total || "Unlimited"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-semibold text-near-black/40">Status</dt>
                <dd className="text-near-black">{event.status}</dd>
              </div>
            </dl>
          </div>

          {/* Meeting Slots (read-only, managed in Sanity) */}
          {isCamp && event.meeting_slots && event.meeting_slots.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                Meeting Slots
              </h2>
              <div className="space-y-3">
                {event.meeting_slots.map((slot, i) => {
                  const rsvpCount = event.registrations.filter(
                    (r) => r.meeting_date_selected === slot.date
                  ).length;
                  return (
                    <div key={i} className="rounded border border-near-black/5 p-3">
                      <p className="text-xs font-medium text-near-black">
                        {slot.label || new Date(slot.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-near-black/40">
                          {rsvpCount} RSVP{rsvpCount !== 1 ? "s" : ""}
                        </span>
                        {slot.meetingLink && (
                          <a
                            href={slot.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-dark-green hover:underline"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[10px] text-near-black/30">
                Edit meeting slots in Content Studio
              </p>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          {isCamp && (
            <div className="mb-4 flex gap-1 rounded-lg border border-near-black/10 bg-white p-1">
              {(["all", "waitlist", "approved", "registered"] as PipelineTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                    activeTab === tab
                      ? "bg-dark-green text-white"
                      : "text-near-black/40 hover:text-near-black"
                  }`}
                >
                  {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)} ({counts[tab]})
                </button>
              ))}
            </div>
          )}

          {/* Registrations Table */}
          <div className="rounded-lg border border-near-black/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-5 py-3 font-semibold">Phone</th>
                    <th className="px-5 py-3 font-semibold">Role</th>
                    {isCamp && <th className="px-5 py-3 font-semibold">Meeting</th>}
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map((reg) => {
                    const name = [reg.contacts?.first_name, reg.contacts?.last_name]
                      .filter(Boolean)
                      .join(" ") || "—";

                    const meetingSlot = reg.meeting_date_selected
                      ? event.meeting_slots?.find((s) => s.date === reg.meeting_date_selected)
                      : null;

                    return (
                      <tr
                        key={reg.id}
                        className="border-b border-near-black/5 transition-colors last:border-0 hover:bg-cream/50"
                      >
                        <td className="px-5 py-3">
                          <Link
                            href={`/admin/contacts/${reg.contacts?.id}`}
                            className="font-medium text-near-black hover:text-dark-green"
                          >
                            {name}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-near-black/60">{reg.contacts?.email}</td>
                        <td className="px-5 py-3 text-near-black/60">{reg.contacts?.phone || "—"}</td>
                        <td className="px-5 py-3 text-near-black/60">{reg.role || "—"}</td>
                        {isCamp && (
                          <td className="px-5 py-3 text-xs text-near-black/50">
                            {meetingSlot?.label || (reg.meeting_date_selected ? "Selected" : "—")}
                          </td>
                        )}
                        <td className="px-5 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[reg.status] || "bg-near-black/5 text-near-black/50"}`}
                          >
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-near-black/40">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRegs.length === 0 && (
                    <tr>
                      <td colSpan={isCamp ? 7 : 6} className="px-5 py-10 text-center text-near-black/40">
                        {event.registrations.length === 0
                          ? "No signups yet"
                          : "No registrations in this stage"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
