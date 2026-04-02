"use client";

import { useState, useEffect, useCallback } from "react";

interface MatchRegistration {
  id: string;
  role: string;
  status: string;
  mentor_id: string | null;
  guardian_registration_id: string | null;
  is_board_member: boolean;
  contacts: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    interests: string[] | null;
  };
}

export default function MatchingTab({ eventId }: { eventId: string }) {
  const [registrations, setRegistrations] = useState<MatchRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoMatching, setAutoMatching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchMatching = useCallback(async () => {
    const res = await fetch(`/api/admin/events/${eventId}/matching`);
    if (res.ok) {
      setRegistrations(await res.json());
    }
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    fetchMatching();
  }, [fetchMatching]);

  const mentors = registrations.filter((r) => r.role === "Mentor");
  const mentees = registrations.filter((r) => r.role === "Mentee");
  const unmatchedMentees = mentees.filter((m) => !m.mentor_id);
  const allMatched = mentees.length > 0 && unmatchedMentees.length === 0;

  async function handleManualMatch(menteeId: string, mentorId: string | null) {
    await fetch(`/api/admin/events/${eventId}/matching`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "manual", mentee_id: menteeId, mentor_id: mentorId }),
    });
    fetchMatching();
  }

  async function handleAutoMatch() {
    setAutoMatching(true);
    const res = await fetch(`/api/admin/events/${eventId}/matching`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "auto" }),
    });
    const data = await res.json();
    setAutoMatching(false);
    fetchMatching();
    if (data.matched === 0) {
      alert("No additional matches could be made. Check that you have available mentors.");
    }
  }

  function getName(r: MatchRegistration) {
    return [r.contacts?.first_name, r.contacts?.last_name].filter(Boolean).join(" ") || r.contacts?.email || "Unknown";
  }

  function getGuardianLabel(r: MatchRegistration) {
    if (!r.guardian_registration_id) return null;
    const guardian = registrations.find((reg) => reg.id === r.guardian_registration_id);
    if (!guardian) return null;
    return `(with ${getName(guardian)})`;
  }

  if (loading) {
    return <div className="py-10 text-center text-near-black/40">Loading matching data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleAutoMatch}
            disabled={autoMatching || unmatchedMentees.length === 0}
            className="rounded bg-dark-green px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
          >
            {autoMatching ? "Matching..." : "Auto-Match Remaining"}
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded border border-near-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[1px] text-near-black/60 transition-colors hover:bg-near-black/5"
          >
            Add Participant
          </button>
        </div>
        <div className="text-xs text-near-black/40">
          {unmatchedMentees.length === 0 ? (
            <span className="font-semibold text-dark-green">All mentees matched</span>
          ) : (
            <span>{unmatchedMentees.length} unmatched mentee{unmatchedMentees.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Add Participant Form */}
      {showAddForm && (
        <AddParticipantForm
          eventId={eventId}
          onAdded={() => { setShowAddForm(false); fetchMatching(); }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Mentors with their assigned mentees */}
      <div className="space-y-4">
        {mentors.map((mentor) => {
          const assigned = mentees.filter((m) => m.mentor_id === mentor.id);
          return (
            <div key={mentor.id} className="rounded-lg border border-near-black/10 bg-white">
              <div className="flex items-center gap-3 border-b border-near-black/5 px-5 py-3">
                <span className="rounded bg-dark-green/10 px-2 py-0.5 text-[10px] font-bold uppercase text-dark-green">
                  Mentor
                </span>
                <span className="font-medium text-near-black">{getName(mentor)}</span>
                {mentor.is_board_member && (
                  <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                    Board
                  </span>
                )}
                {mentor.contacts?.interests && mentor.contacts.interests.length > 0 && (
                  <div className="ml-auto flex gap-1">
                    {mentor.contacts.interests.slice(0, 5).map((i) => (
                      <span key={i} className="rounded bg-near-black/5 px-1.5 py-0.5 text-[9px] text-near-black/40">
                        {i}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-5 py-3">
                {assigned.length > 0 ? (
                  <div className="space-y-2">
                    {assigned.map((mentee) => (
                      <div key={mentee.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-near-black">{getName(mentee)}</span>
                          {getGuardianLabel(mentee) && (
                            <span className="text-[10px] text-near-black/40">{getGuardianLabel(mentee)}</span>
                          )}
                          {mentee.contacts?.interests && mentee.contacts.interests.length > 0 && (
                            <div className="flex gap-1">
                              {mentee.contacts.interests.slice(0, 3).map((i) => (
                                <span key={i} className="rounded bg-near-black/5 px-1.5 py-0.5 text-[9px] text-near-black/40">
                                  {i}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handleManualMatch(mentee.id, null)}
                          className="text-[10px] font-semibold text-near-black/30 hover:text-red-500"
                        >
                          Unmatch
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-near-black/30">No mentees assigned</p>
                )}
              </div>
            </div>
          );
        })}

        {mentors.length === 0 && (
          <div className="rounded-lg border border-near-black/10 bg-white px-5 py-8 text-center text-xs text-near-black/40">
            No mentors registered yet
          </div>
        )}
      </div>

      {/* Unmatched Mentees */}
      {unmatchedMentees.length > 0 && (
        <div className="rounded-lg border border-gold/20 bg-gold/5">
          <div className="border-b border-gold/10 px-5 py-3">
            <h3 className="text-xs font-bold uppercase tracking-[1px] text-gold">
              Unmatched Mentees ({unmatchedMentees.length})
            </h3>
          </div>
          <div className="divide-y divide-gold/10">
            {unmatchedMentees.map((mentee) => (
              <div key={mentee.id} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-near-black">{getName(mentee)}</span>
                  {getGuardianLabel(mentee) && (
                    <span className="text-[10px] text-near-black/40">{getGuardianLabel(mentee)}</span>
                  )}
                  {mentee.contacts?.interests && mentee.contacts.interests.length > 0 && (
                    <div className="flex gap-1">
                      {mentee.contacts.interests.slice(0, 3).map((i) => (
                        <span key={i} className="rounded bg-near-black/5 px-1.5 py-0.5 text-[9px] text-near-black/40">
                          {i}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleManualMatch(mentee.id, e.target.value);
                  }}
                  className="rounded border border-near-black/15 bg-white px-2 py-1 text-xs text-near-black focus:border-dark-green focus:outline-none"
                >
                  <option value="">Assign mentor...</option>
                  {mentors.map((m) => {
                    const load = mentees.filter((me) => me.mentor_id === m.id).length;
                    return (
                      <option key={m.id} value={m.id} disabled={load >= 3}>
                        {getName(m)} ({load}/3)
                      </option>
                    );
                  })}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Add Participant Form ─── */

function AddParticipantForm({
  eventId,
  onAdded,
  onCancel,
}: {
  eventId: string;
  onAdded: () => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Mentor");
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/admin/events/${eventId}/add-participant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: lastName,
        phone,
        role,
        is_board_member: isBoardMember,
      }),
    });

    if (res.ok) {
      onAdded();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to add participant");
    }
    setSaving(false);
  }

  return (
    <div className="rounded-lg border border-near-black/10 bg-white p-5">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[1px] text-near-black/40">
        Add Participant
      </h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="rounded border border-near-black/15 px-3 py-2 text-xs text-near-black placeholder:text-near-black/30 focus:border-dark-green focus:outline-none"
          />
          <input
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded border border-near-black/15 px-3 py-2 text-xs text-near-black placeholder:text-near-black/30 focus:border-dark-green focus:outline-none"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded border border-near-black/15 px-3 py-2 text-xs text-near-black placeholder:text-near-black/30 focus:border-dark-green focus:outline-none"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (optional)"
            className="rounded border border-near-black/15 px-3 py-2 text-xs text-near-black placeholder:text-near-black/30 focus:border-dark-green focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-4">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded border border-near-black/15 px-3 py-2 text-xs text-near-black focus:border-dark-green focus:outline-none"
          >
            <option value="Mentor">Mentor</option>
            <option value="Mentee">Mentee</option>
          </select>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={isBoardMember}
              onChange={(e) => setIsBoardMember(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-near-black/30 accent-dark-green"
            />
            <span className="text-xs text-near-black/60">Board member</span>
          </label>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-dark-green px-4 py-2 text-xs font-bold uppercase tracking-[0.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
          >
            {saving ? "Adding..." : "Add"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-near-black/20 px-4 py-2 text-xs font-semibold text-near-black/60 hover:bg-near-black/5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
