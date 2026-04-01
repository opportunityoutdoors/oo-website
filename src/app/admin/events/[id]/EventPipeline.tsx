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
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
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
  meeting_date: string | null;
  meeting_link: string | null;
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
  const [editingSettings, setEditingSettings] = useState(false);
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}`);
    if (res.ok) {
      const data = await res.json();
      setEvent(data);
      setMeetingDate(data.meeting_date ? data.meeting_date.slice(0, 16) : "");
      setMeetingLink(data.meeting_link || "");
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  async function saveSettings() {
    setSavingSettings(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_date: meetingDate || null,
        meeting_link: meetingLink || null,
      }),
    });
    setSavingSettings(false);
    setEditingSettings(false);
    fetchEvent();
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
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Settings Card */}
        <div className="rounded-lg border border-near-black/10 bg-white p-5 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-[1px] text-near-black/40">
              {isCamp ? "Meeting Settings" : "Event Settings"}
            </h2>
            {!editingSettings ? (
              <button
                onClick={() => setEditingSettings(true)}
                className="text-xs font-semibold text-dark-green hover:text-dark-green/70"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  className="text-xs font-semibold text-dark-green hover:text-dark-green/70 disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => setEditingSettings(false)}
                  className="text-xs font-semibold text-near-black/40 hover:text-near-black"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {editingSettings ? (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">
                  Meeting Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="mt-0.5 w-full rounded border border-near-black/15 px-2.5 py-1.5 text-xs text-near-black focus:border-dark-green focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/40">
                  Google Meet Link
                </label>
                <input
                  type="url"
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  className="mt-0.5 w-full rounded border border-near-black/15 px-2.5 py-1.5 text-xs text-near-black focus:border-dark-green focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="font-semibold text-near-black/40">Spots</dt>
                <dd className="text-near-black">{event.spots_total || "Unlimited"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-semibold text-near-black/40">Signups</dt>
                <dd className="text-near-black">{event.registrations.length}</dd>
              </div>
              {isCamp && (
                <>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Meeting</dt>
                    <dd className="text-near-black">
                      {event.meeting_date
                        ? new Date(event.meeting_date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "Not set"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-semibold text-near-black/40">Meet Link</dt>
                    <dd className="truncate text-near-black">
                      {event.meeting_link ? (
                        <a
                          href={event.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-dark-green hover:underline"
                        >
                          Open
                        </a>
                      ) : (
                        "Not set"
                      )}
                    </dd>
                  </div>
                </>
              )}
            </dl>
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
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRegs.map((reg) => {
                    const name = [reg.contacts?.first_name, reg.contacts?.last_name]
                      .filter(Boolean)
                      .join(" ") || "—";

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
                      <td colSpan={6} className="px-5 py-10 text-center text-near-black/40">
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
