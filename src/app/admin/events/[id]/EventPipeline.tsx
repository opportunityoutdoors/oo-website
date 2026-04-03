"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MatchingTab from "./MatchingTab";

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

type PipelineTab = "waitlist" | "approved" | "denied" | "registered" | "matching" | "all";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    const allSelected = ids.every((id) => selected.has(id));
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(ids));
    }
  }

  async function bulkUpdateStatus(status: string) {
    if (selected.size === 0) return;
    setActionLoading(true);
    await fetch("/api/admin/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], status }),
    });
    setSelected(new Set());
    await fetchEvent();
    setActionLoading(false);
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Remove ${selected.size} camper${selected.size > 1 ? "s" : ""} from this event?`)) return;
    setActionLoading(true);
    await fetch("/api/admin/registrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setSelected(new Set());
    await fetchEvent();
    setActionLoading(false);
  }

  async function updateSingle(id: string, status: string) {
    setActionLoading(true);
    await fetch("/api/admin/registrations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id], status }),
    });
    await fetchEvent();
    setActionLoading(false);
  }

  async function deleteSingle(id: string) {
    if (!confirm("Remove this camper from the event?")) return;
    setActionLoading(true);
    await fetch("/api/admin/registrations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    await fetchEvent();
    setActionLoading(false);
  }

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
    if (activeTab === "approved") return r.status === "approved";
    if (activeTab === "denied") return r.status === "denied";
    if (activeTab === "registered") return r.status === "registered" || r.status === "attended";
    return true;
  });

  const filteredIds = filteredRegs.map((r) => r.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const approvedAndRegistered = event.registrations.filter(
    (r) => r.status === "approved" || r.status === "registered" || r.status === "attended"
  );

  const counts = {
    waitlist: event.registrations.filter((r) => r.status === "waitlist" || r.status === "meeting_rsvp").length,
    approved: event.registrations.filter((r) => r.status === "approved").length,
    denied: event.registrations.filter((r) => r.status === "denied").length,
    registered: event.registrations.filter((r) => r.status === "registered" || r.status === "attended").length,
    matching: approvedAndRegistered.length,
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
          <div className="rounded-lg border border-near-black/10 bg-white p-5">
            <h2 className="mb-3 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
              Overview
            </h2>
            {(() => {
              const active = event.registrations.filter((r) => r.status !== "denied");
              const mentees = active.filter((r) => r.role === "Mentee").length;
              const mentors = active.filter((r) => r.role === "Mentor").length;
              const registeredMentors = event.registrations.filter((r) => r.role === "Mentor" && r.status === "registered").length;
              const approvedMentees = event.registrations.filter((r) => r.role === "Mentee" && (r.status === "approved" || r.status === "registered")).length;
              const maxMenteeSlots = registeredMentors * 3;
              const availableMenteeSlots = Math.max(0, maxMenteeSlots - approvedMentees);
              const ratio = mentors > 0 ? `${(mentees / mentors).toFixed(1)}:1` : mentees > 0 ? "No mentors" : "—";

              return (
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Total Signups</dt>
                    <dd className="font-bold text-near-black">{active.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Mentees</dt>
                    <dd className="font-bold text-near-black">{mentees}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Mentors</dt>
                    <dd className="font-bold text-near-black">{mentors}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Ratio</dt>
                    <dd className="font-bold text-near-black">{ratio}</dd>
                  </div>
                  <div className="mt-1 border-t border-near-black/5 pt-2">
                    <div className="flex justify-between">
                      <dt className="font-semibold text-near-black/40">Spots</dt>
                      <dd className="text-near-black">{event.spots_total || "Unlimited"}</dd>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Status</dt>
                    <dd className="text-near-black">{event.status}</dd>
                  </div>
                  {isCamp && (
                    <div className="mt-1 border-t border-near-black/5 pt-2">
                      <div className="flex justify-between">
                        <dt className="font-semibold text-near-black/40">Registered Mentors</dt>
                        <dd className="font-bold text-near-black">{registeredMentors}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-semibold text-near-black/40">Mentee Slots (3:1)</dt>
                        <dd className="font-bold text-near-black">{maxMenteeSlots}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="font-semibold text-near-black/40">Available</dt>
                        <dd className={`font-bold ${availableMenteeSlots > 0 ? "text-dark-green" : "text-red-500"}`}>
                          {availableMenteeSlots}
                        </dd>
                      </div>
                    </div>
                  )}
                </dl>
              );
            })()}
          </div>

          {isCamp && event.meeting_slots && event.meeting_slots.length > 0 && (
            <div className="rounded-lg border border-near-black/10 bg-white p-5">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
                Meeting Slots
              </h2>
              <div className="space-y-3">
                {event.meeting_slots.map((slot, i) => {
                  const rsvpCount = event.registrations.filter(
                    (r) => r.meeting_date_selected === slot.label || r.meeting_date_selected === slot.date
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
                Edit in Content Studio
              </p>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="lg:col-span-3">
          {/* Tabs */}
          {isCamp && (
            <div className="mb-4 flex gap-1 rounded-lg border border-near-black/10 bg-white p-1">
              {(["all", "waitlist", "approved", "denied", "registered", "matching"] as PipelineTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelected(new Set()); }}
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

          {/* Matching Tab */}
          {activeTab === "matching" && (
            <MatchingTab eventId={eventId} />
          )}

          {/* Bulk Actions Bar */}
          {activeTab !== "matching" && selected.size > 0 && (
            <div className="mb-3 flex items-center gap-3 rounded-lg border border-dark-green/20 bg-dark-green/5 px-4 py-2.5">
              <span className="text-xs font-semibold text-dark-green">
                {selected.size} selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => bulkUpdateStatus("approved")}
                  disabled={actionLoading}
                  className="rounded bg-dark-green px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => bulkUpdateStatus("denied")}
                  disabled={actionLoading}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
                >
                  Deny
                </button>
                <button
                  onClick={() => bulkUpdateStatus("waitlist")}
                  disabled={actionLoading}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
                >
                  Move to Waitlist
                </button>
                <button
                  onClick={() => bulkUpdateStatus("registered")}
                  disabled={actionLoading}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
                >
                  Mark Registered
                </button>
                <button
                  onClick={() => bulkUpdateStatus("attended")}
                  disabled={actionLoading}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
                >
                  Mark Attended
                </button>
                <div className="mx-1 h-5 w-px bg-near-black/10" />
                <button
                  onClick={bulkDelete}
                  disabled={actionLoading}
                  className="rounded border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  Remove
                </button>
              </div>
            </div>
          )}

          {/* Registrations Table */}
          {activeTab !== "matching" && <div className="rounded-lg border border-near-black/10 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-near-black/5 text-xs uppercase tracking-[1px] text-near-black/40">
                    <th className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={() => toggleSelectAll(filteredIds)}
                        className="h-3.5 w-3.5 rounded border-near-black/30 accent-dark-green"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Name</th>
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    {isCamp && <th className="px-4 py-3 font-semibold">Meeting</th>}
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Waiver</th>
                    <th className="w-24 px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map((reg) => {
                    const name = [reg.contacts?.first_name, reg.contacts?.last_name]
                      .filter(Boolean)
                      .join(" ") || "—";

                    const meetingSlot = reg.meeting_date_selected
                      ? event.meeting_slots?.find((s) => s.label === reg.meeting_date_selected || s.date === reg.meeting_date_selected)
                      : null;

                    return (
                      <tr
                        key={reg.id}
                        className={`border-b border-near-black/5 transition-colors last:border-0 hover:bg-cream/50 ${selected.has(reg.id) ? "bg-dark-green/5" : ""}`}
                      >
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(reg.id)}
                            onChange={() => toggleSelect(reg.id)}
                            className="h-3.5 w-3.5 rounded border-near-black/30 accent-dark-green"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/contacts/${reg.contacts?.id}`}
                            className="font-medium text-near-black hover:text-dark-green"
                          >
                            {name}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-near-black/60">{reg.contacts?.email}</td>
                        <td className="px-4 py-3 text-near-black/60">{reg.contacts?.phone || "—"}</td>
                        <td className="px-4 py-3 text-near-black/60">{reg.role || "—"}</td>
                        {isCamp && (
                          <td className="px-4 py-3 text-xs text-near-black/50">
                            {meetingSlot?.label || (reg.meeting_date_selected ? "Selected" : "—")}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[reg.status] || "bg-near-black/5 text-near-black/50"}`}
                          >
                            {reg.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {reg.waiver_signed ? (
                            <a
                              href={`/api/admin/registrations/${reg.id}/waiver`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded bg-dark-green/10 px-2 py-1 text-[10px] font-semibold text-dark-green transition-colors hover:bg-dark-green/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              PDF
                            </a>
                          ) : (
                            <span className="text-[10px] text-near-black/30">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {reg.status === "waitlist" && (
                              <button
                                onClick={() => updateSingle(reg.id, "approved")}
                                disabled={actionLoading}
                                className="rounded bg-dark-green/10 px-2 py-1 text-[10px] font-semibold text-dark-green transition-colors hover:bg-dark-green/20 disabled:opacity-50"
                                title="Approve"
                              >
                                Approve
                              </button>
                            )}
                            {reg.status === "approved" && (
                              <button
                                onClick={() => updateSingle(reg.id, "registered")}
                                disabled={actionLoading}
                                className="rounded bg-dark-green/10 px-2 py-1 text-[10px] font-semibold text-dark-green transition-colors hover:bg-dark-green/20 disabled:opacity-50"
                                title="Mark Registered"
                              >
                                Register
                              </button>
                            )}
                            <button
                              onClick={() => deleteSingle(reg.id)}
                              disabled={actionLoading}
                              className="rounded px-2 py-1 text-[10px] font-semibold text-red-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              title="Remove from event"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRegs.length === 0 && (
                    <tr>
                      <td colSpan={isCamp ? 9 : 8} className="px-5 py-10 text-center text-near-black/40">
                        {event.registrations.length === 0
                          ? "No signups yet"
                          : "No registrations in this stage"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>}
        </div>
      </div>
    </>
  );
}
