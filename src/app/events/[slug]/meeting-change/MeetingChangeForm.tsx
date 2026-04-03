"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface MeetingSlot {
  date?: string;
  label: string;
  meetingLink?: string;
}

interface RegistrationData {
  id: string;
  meeting_date_selected: string | null;
  contacts: { first_name: string | null; email: string };
  events: {
    title: string;
    slug: string;
    meeting_slots: MeetingSlot[];
    date_start: string | null;
  };
}

export default function MeetingChangeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [registration, setRegistration] = useState<RegistrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!token) {
        setError("Missing token");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/waitlist/change-meeting?token=${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid link");
        setLoading(false);
        return;
      }

      setRegistration(data);
      setSelectedMeeting(data.meeting_date_selected || "");
      setLoading(false);
    }

    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMeeting || selectedMeeting === registration?.meeting_date_selected) return;

    setSubmitting(true);
    const res = await fetch("/api/waitlist/change-meeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_meeting: selectedMeeting }),
    });

    if (res.ok) {
      setSuccess(true);
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong");
    }
    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-near-black/40">Loading...</p>
      </div>
    );
  }

  if (error && !registration) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
          Link Expired
        </h1>
        <p className="mb-8 text-near-black/60">{error}</p>
        <Link
          href="/events"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          View Events
        </Link>
      </div>
    );
  }

  if (success) {
    const newSlot = registration?.events.meeting_slots.find((s) => s.label === selectedMeeting);
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-dark-green">
          Meeting Updated
        </h1>
        <p className="mb-4 text-lg text-near-black/70">
          Your meeting for <strong>{registration?.events.title}</strong> has been changed to:
        </p>
        <div className="mx-auto mb-8 max-w-sm rounded border border-dark-green/20 bg-dark-green/5 p-4">
          <p className="text-lg font-bold text-near-black">{selectedMeeting}</p>
          {newSlot?.meetingLink && (
            <a
              href={newSlot.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-dark-green hover:underline"
            >
              Join Meeting Link
            </a>
          )}
        </div>
        <Link
          href="/"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const event = registration!.events;
  const firstName = registration!.contacts.first_name || "there";
  const slots = event.meeting_slots || [];

  return (
    <div className="mx-auto max-w-lg px-6 pb-20 pt-32">
      <h1 className="mb-2 font-heading text-[clamp(2rem,5vw,3rem)] font-[900] uppercase leading-tight tracking-tight text-near-black">
        Change Your Meeting
      </h1>
      <p className="mb-2 text-lg text-near-black/60">{event.title}</p>
      <p className="mb-8 text-near-black/50">
        Hey {firstName}, select a new meeting date below.
      </p>

      {registration!.meeting_date_selected && (
        <div className="mb-6 rounded border border-near-black/10 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[1px] text-near-black/40">Current Meeting</p>
          <p className="mt-1 font-medium text-near-black">{registration!.meeting_date_selected}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="mb-3 text-sm font-semibold text-near-black">Select a new meeting date:</p>
          <div className="space-y-2">
            {slots.map((slot) => {
              const isSelected = selectedMeeting === slot.label;
              const isCurrent = registration!.meeting_date_selected === slot.label;
              return (
                <label
                  key={slot.label}
                  className={`flex cursor-pointer items-center gap-3 rounded border p-4 transition-colors ${
                    isSelected
                      ? "border-dark-green bg-dark-green/5"
                      : "border-near-black/10 bg-white hover:bg-cream/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="meeting"
                    value={slot.label}
                    checked={isSelected}
                    onChange={() => setSelectedMeeting(slot.label)}
                    className="h-4 w-4 accent-dark-green"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-near-black">
                      {slot.label}
                      {isCurrent && <span className="ml-2 text-xs text-near-black/40">(current)</span>}
                    </p>
                  </div>
                  {slot.meetingLink && (
                    <a
                      href={slot.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-dark-green hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Meeting Link
                    </a>
                  )}
                </label>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !selectedMeeting || selectedMeeting === registration!.meeting_date_selected}
          className="w-full rounded bg-dark-green px-8 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
        >
          {submitting ? "Updating..." : "Update Meeting"}
        </button>
      </form>
    </div>
  );
}
