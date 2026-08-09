"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import MatchingTab from "./MatchingTab";
import StatsTab from "./StatsTab";
import ReviewModal from "./ReviewModal";
import ReadinessPanel from "./ReadinessPanel";
import CampBoard from "./CampBoard";
import ExitDialog from "./ExitDialog";
import { position, nameOf, POSITIONS, type Position } from "@/lib/camp-pipeline";
import { formatEventDateRange } from "@/lib/format-event-date";
import { describeCheck } from "@/lib/background-check/display";

interface Registration {
  id: string;
  status: string;
  role: string;
  payment_status: string;
  waiver_signed: boolean;
  token: string | null;
  meeting_date_selected: string | null;
  created_at: string;
  // Already returned by the API, which selects *. Declared here so the readiness panel can
  // answer "matched" and "packet sent" without a second request.
  welcome_packet_sent: boolean;
  mentor_id: string | null;
  guardian_registration_id: string | null;
  exit_reason: string | null;
  contacts: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    city: string | null;
    state: string | null;
    tshirt_size: string | null;
    date_of_birth: string | null;
    background_check_status: string | null;
    background_check_expires_at: string | null;
    background_check_invited_at: string | null;
    background_check_url: string | null;
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

// The status tabs are gone. Waitlist, approved, denied and registered were all filters on
// registration status, and every one of them is now a stage in the pipeline panel above,
// where clicking it filters this same table. Two ways to ask the same question is how the
// counts and the list drift apart. What remains are the two genuinely different views.
type PipelineTab = "all" | "matching" | "stats";

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

  // The table's own filter and sort. It answers a different question from the board ("sort
  // by this, act on these six") and needs its own controls rather than borrowing the
  // board's selection, which is why the stage-click filter it used to have is gone.
  const [posFilter, setPosFilter] = useState<Position | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionLoading, setActionLoading] = useState(false);

  // The contact whose background check is being adjudicated, if any.
  const [reviewing, setReviewing] = useState<{
    contactId: string;
    name: string;
    status: string;
  } | null>(null);

  const [orderingCheck, setOrderingCheck] = useState<string | null>(null);

  // A bulk exit, waiting on a reason. Same dialog the board uses.
  const [bulkExit, setBulkExit] = useState<"turned_away" | "dropped_out" | null>(null);

  /**
   * Moves everyone selected out of the pipeline, with a reason.
   *
   * Routed through the same endpoint a drag uses rather than the bulk status PATCH, so the
   * validation is identical. The old "Deny" button wrote status='denied' with no reason at
   * all, producing a card the board itself would have refused to create.
   */
  async function bulkMoveOut(to: "turned_away" | "dropped_out", exitReason: string) {
    setActionLoading(true);
    try {
      const failures: string[] = [];
      for (const id of selected) {
        const res = await fetch("/api/admin/registrations/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registrationId: id, to, exitReason }),
        });
        if (!res.ok) failures.push((await res.json()).error ?? "unknown error");
      }
      // Named rather than swallowed: a partial bulk that reports success is how somebody
      // ends up thinking a person was removed when they were not.
      if (failures.length) {
        alert(
          `${selected.size - failures.length} moved. ${failures.length} refused:\n` +
            [...new Set(failures)].join("\n")
        );
      }
      setSelected(new Set());
      await fetchEvent();
    } finally {
      setActionLoading(false);
      setBulkExit(null);
    }
  }

  /**
   * Orders a background check for someone who has none.
   *
   * Exists because ordering can fail after the money has been taken, and did: a misnamed
   * environment variable meant a paid registration ordered no check and left the person
   * with a confirmation page promising an email that never came. Idempotent server-side,
   * so pressing it twice cannot buy two checks.
   */
  async function orderCheck(contactId: string) {
    setOrderingCheck(contactId);
    try {
      const res = await fetch("/api/admin/background-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error ?? "Could not order the check.");
      else if (!data.ordered) alert(`Not ordered: ${data.reason}`);
      await fetchEvent();
    } finally {
      setOrderingCheck(null);
    }
  }

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

  /** Same column twice reverses it, which is what everyone expects a header click to do. */
  function sort(field: SortKey) {
    if (field === sortBy) setSortDesc((d) => !d);
    else {
      setSortBy(field);
      setSortDesc(false);
    }
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

  const filteredRegs = [...event.registrations]
    .filter((r) => posFilter === "all" || position(r) === posFilter)
    .sort((a, b) => {
      const dir = sortDesc ? -1 : 1;
      const val = (r: typeof a) => {
        switch (sortBy) {
          case "name":
            return nameOf(r).toLowerCase();
          case "role":
            return (r.role || "").toLowerCase();
          case "status":
            return position(r);
          case "paid":
            return r.payment_status === "paid" ? "1" : "0";
          case "waiver":
            return r.waiver_signed ? "1" : "0";
          case "check":
            return r.contacts?.background_check_status || "";
          default:
            return "";
        }
      };
      return val(a).localeCompare(val(b)) * dir;
    });

  const filteredIds = filteredRegs.map((r) => r.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const approvedAndRegistered = event.registrations.filter(
    (r) => r.status === "approved" || r.status === "registered" || r.status === "attended"
  );

  const counts = {
    matching: approvedAndRegistered.length,
    stats: event.registrations.length,
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
              {formatEventDateRange(event.date_start, event.date_end, "long")}
            </span>
          )}
          {event.location && <span>{event.location}</span>}
          {event.cost && <span>{event.cost}</span>}
          {event.spots_total && <span>{event.spots_total} spots</span>}
        </div>
      </div>

      {/* Overview across the top rather than down the side. The board is the widest thing
          on this page and the thing people came for; a sidebar was taking a quarter of the
          screen to show nine numbers that read fine in a row. */}
      <div className="space-y-4">
        <div className="space-y-4">
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
                <dl className="flex flex-wrap items-end gap-x-8 gap-y-3">
                  <Figure label="Signups" value={active.length} />
                  <Figure label="Mentees" value={mentees} />
                  <Figure label="Mentors" value={mentors} />
                  <Figure label="Ratio" value={ratio} />
                  <Figure label="Spots" value={event.spots_total || "Unlimited"} muted />
                  <Figure label="Status" value={event.status} muted />
                  {isCamp && (
                    <>
                      <span className="h-8 w-px self-center bg-near-black/10" />
                      <Figure label="Registered mentors" value={registeredMentors} />
                      <Figure label="Mentee slots (3:1)" value={maxMenteeSlots} />
                      <Figure
                        label="Available"
                        value={availableMenteeSlots}
                        tone={availableMenteeSlots > 0 ? "good" : "bad"}
                      />
                    </>
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
              <div className="flex flex-wrap gap-3">
                {event.meeting_slots.map((slot, i) => {
                  const rsvpCount = event.registrations.filter(
                    (r) => r.meeting_date_selected === slot.label || r.meeting_date_selected === slot.date
                  ).length;
                  return (
                    <div key={i} className="min-w-[190px] flex-1 rounded border border-near-black/5 p-3">
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
        <div>
          {/* Above the tabs, because "is this camp ready to run" is the question the whole
              page exists to answer and it should not require picking a tab first. Camps
              only: community events have no matching, screening, or welcome packet. */}
          {isCamp && (
            <>
            <ReadinessPanel
              eventId={eventId}
              eventDate={event.date_start}
              registrations={event.registrations}
              onChanged={fetchEvent}
            />

            {/* The board is the navigation now. Columns are where people ARE, so every one
                is openable whether or not anything is wrong, which is the thing the stage
                funnel could not do. */}
            <CampBoard
              eventId={eventId}
              registrations={event.registrations}
              isPast={Boolean(
                event.date_start && new Date(event.date_start) < new Date()
              )}
              onMoved={fetchEvent}
              onReview={(contactId, name, status) =>
                setReviewing({ contactId, name, status })
              }
            />
            </>
          )}

          {/* Tabs. Community and workshop events skip the camp pipeline stages but still
              get survey results, so they get a reduced bar rather than none. */}
          <div className="mb-4 flex gap-1 rounded-lg border border-near-black/10 bg-white p-1">
            {((isCamp ? ["all", "matching", "stats"] : ["all", "stats"]) as PipelineTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelected(new Set());
                }}
                className={`flex-1 rounded px-3 py-2 text-xs font-bold uppercase tracking-[0.5px] transition-colors ${
                  activeTab === tab
                    ? "bg-dark-green text-white"
                    : "text-near-black/40 hover:text-near-black"
                }`}
              >
                {tab === "all"
                  ? "All"
                  : tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === "stats" ? "" : ` (${counts[tab]})`}
              </button>
            ))}
          </div>

          {/* Matching Tab */}
          {activeTab === "matching" && (
            <MatchingTab eventId={eventId} />
          )}

          {/* Stats Tab */}
          {activeTab === "stats" && <StatsTab eventId={eventId} />}

          {/* Bulk Actions Bar */}
          {activeTab !== "matching" && activeTab !== "stats" && selected.size > 0 && (
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
                  onClick={() => setBulkExit("turned_away")}
                  disabled={actionLoading}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
                >
                  Turn Away
                </button>
                <button
                  onClick={() => setBulkExit("dropped_out")}
                  disabled={actionLoading}
                  className="rounded border border-near-black/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.5px] text-near-black/60 transition-colors hover:bg-near-black/5 disabled:opacity-50"
                >
                  Dropped Out
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

              </div>
            </div>
          )}

          {/* Screening summary. Sits above the table because "is this camp ready" is the
              question someone opens this page to answer in the week before an event, and it
              should not require reading every row to find out. */}
          {/* The table's own filter, mirroring the board's columns so the two describe the
              same world. Counts included, because a filter that might return nothing should
              say so before you pick it. */}
          {activeTab === "all" && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <FilterChip
                label="Everyone"
                count={event.registrations.length}
                active={posFilter === "all"}
                onClick={() => { setPosFilter("all"); setSelected(new Set()); }}
              />
              {POSITIONS.map((col) => {
                const n = event.registrations.filter((r) => position(r) === col.key).length;
                if (n === 0) return null;
                return (
                  <FilterChip
                    key={col.key}
                    label={col.label}
                    count={n}
                    active={posFilter === col.key}
                    onClick={() => { setPosFilter(col.key); setSelected(new Set()); }}
                  />
                );
              })}
            </div>
          )}

          {/* Registrations Table */}
          {activeTab !== "matching" && activeTab !== "stats" && <div className="rounded-lg border border-near-black/10 bg-white">
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
                    <SortHeader label="Name" field="name" sortBy={sortBy} sortDesc={sortDesc} onSort={sort} />
                    <th className="px-4 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <SortHeader label="Role" field="role" sortBy={sortBy} sortDesc={sortDesc} onSort={sort} />
                    {isCamp && <th className="px-4 py-3 font-semibold">Meeting</th>}
                    <SortHeader label="Status" field="status" sortBy={sortBy} sortDesc={sortDesc} onSort={sort} />
                    <SortHeader label="Waiver" field="waiver" sortBy={sortBy} sortDesc={sortDesc} onSort={sort} />
                    <SortHeader label="Check" field="check" sortBy={sortBy} sortDesc={sortDesc} onSort={sort} />
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

                    // Same describeCheck the alert emails use, so a row and an email never
                    // disagree about what state someone is in.
                    const check = describeCheck({
                      dateOfBirth: reg.contacts?.date_of_birth ?? null,
                      status: reg.contacts?.background_check_status ?? null,
                      expiresAt: reg.contacts?.background_check_expires_at ?? null,
                      invitedAt: reg.contacts?.background_check_invited_at ?? null,
                      paid: reg.payment_status === "paid",
                      eventDate: event.date_start,
                    });

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
                            href={`/admin/contacts/${reg.contacts?.id}?from=${eventId}`}
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
                          <span
                            title={check.detail}
                            className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                              check.tone === "ok"
                                ? "bg-dark-green/10 text-dark-green"
                                : check.tone === "act"
                                  ? "bg-[#b00]/10 text-[#b00]"
                                  : "bg-gold/15 text-[#8B6914]"
                            }`}
                          >
                            {check.label}
                          </span>
                          {reg.contacts?.background_check_url && check.tone !== "ok" && (
                            <a
                              href={reg.contacts.background_check_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-2 text-[10px] font-semibold text-dark-green hover:underline"
                            >
                              link
                            </a>
                          )}
                          {/* On every row with a contact, not only blocked ones. A cleared
                              person still needs to be reachable: screening policy 7.5 has
                              the panel deciding on someone charged DURING their term, and
                              that person is cleared by definition. It is also the only way
                              to read their review history. */}
                          {reg.contacts?.id &&
                            reg.payment_status === "paid" &&
                            ["none", "expired", "error"].includes(
                              reg.contacts.background_check_status ?? "none"
                            ) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  orderCheck(reg.contacts.id);
                                }}
                                disabled={orderingCheck === reg.contacts.id}
                                className="ml-2 text-[10px] font-semibold text-dark-green hover:underline disabled:opacity-40"
                              >
                                {orderingCheck === reg.contacts.id ? "ordering..." : "order check"}
                              </button>
                            )}
                          {reg.contacts?.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewing({
                                  contactId: reg.contacts.id,
                                  name: name === "—" ? reg.contacts.email : name,
                                  status: reg.contacts.background_check_status ?? "none",
                                });
                              }}
                              className="ml-2 text-[10px] font-semibold text-dark-green hover:underline"
                            >
                              review
                            </button>
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
                            {/* Remove is gone. Somebody who is not coming has a reason, and
                                the reason is the thing worth keeping: deleting the row threw
                                away that they were ever here. Select them and use Turn Away
                                or Dropped Out instead. */}
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

      {bulkExit && (
        <ExitDialog
          name={`${selected.size} ${selected.size === 1 ? "person" : "people"}`}
          to={bulkExit}
          onCancel={() => setBulkExit(null)}
          onConfirm={(reason) => bulkMoveOut(bulkExit, reason)}
        />
      )}

      {reviewing && (
        <ReviewModal
          contactId={reviewing.contactId}
          contactName={reviewing.name}
          currentStatus={reviewing.status}
          onClose={() => setReviewing(null)}
          onDone={async () => {
            setReviewing(null);
            // Refetch rather than patching local state: a decision can change the check
            // status, the expiry, and the payment status all at once, and the table should
            // show what is actually stored.
            await fetchEvent();
          }}
        />
      )}
    </>
  );
}

/**
 * One number in the overview strip.
 *
 * Label above value rather than beside it, so a row of these stays readable as the labels
 * vary in length. "Mentee slots (3:1)" and "Ratio" do not line up side by side.
 */
function Figure({
  label,
  value,
  tone,
  muted,
}: {
  label: string;
  value: string | number;
  tone?: "good" | "bad";
  muted?: boolean;
}) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.5px] text-near-black/35">
        {label}
      </dt>
      <dd
        className={`mt-0.5 text-lg font-semibold leading-none ${
          tone === "good"
            ? "text-dark-green"
            : tone === "bad"
              ? "text-[#b00]"
              : muted
                ? "text-near-black/60"
                : "text-near-black"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

type SortKey = "name" | "role" | "status" | "paid" | "waiver" | "check";

function SortHeader({
  label,
  field,
  sortBy,
  sortDesc,
  onSort,
}: {
  label: string;
  field: SortKey;
  sortBy: SortKey;
  sortDesc: boolean;
  onSort: (f: SortKey) => void;
}) {
  const active = sortBy === field;
  return (
    <th className="px-4 py-3 font-semibold">
      <button
        onClick={() => onSort(field)}
        className={`uppercase tracking-[1px] transition-colors hover:text-near-black ${
          active ? "text-near-black" : ""
        }`}
      >
        {label}
        <span className={`ml-1 ${active ? "" : "opacity-0"}`}>{sortDesc ? "\u2193" : "\u2191"}</span>
      </button>
    </th>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active
          ? "bg-dark-green text-white"
          : "bg-near-black/5 text-near-black/60 hover:bg-near-black/10"
      }`}
    >
      {label} <span className={active ? "text-white/60" : "text-near-black/35"}>{count}</span>
    </button>
  );
}
