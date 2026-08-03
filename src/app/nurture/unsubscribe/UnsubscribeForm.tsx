"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

// Confirm-then-act rather than unsubscribing on page load. Email clients and security
// scanners prefetch links, and a GET that silently opted people out would unsubscribe
// anyone whose mail provider scanned the message.

const TRACK_LABEL: Record<string, string> = {
  mentee: "mentee applicant",
  mentor: "mentor applicant",
};

export default function UnsubscribeForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [track, setTrack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function validate() {
      if (!token) {
        setError("This link is missing its token.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/nurture/unsubscribe?token=${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "This link is not valid.");
          setLoading(false);
          return;
        }

        setTrack(data.track);
        if (data.alreadyStopped) setDone(true);
      } catch {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }

    validate();
  }, [token]);

  async function handleUnsubscribe() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/nurture/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
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

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
          Link Not Valid
        </h1>
        <p className="mb-8 text-near-black/60">{error}</p>
        <p className="mb-8 text-sm text-near-black/50">
          If you are trying to stop emails from us, reply to any message we have
          sent you and we will take care of it.
        </p>
        <Link
          href="/"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-dark-green">
          You&apos;re Unsubscribed
        </h1>
        <p className="mb-4 text-lg text-near-black/70">
          We have stopped the follow-up emails about your application. No hard
          feelings.
        </p>
        <p className="mb-8 text-sm text-near-black/50">
          Your application is still on file, and a board member may still reach
          out about it directly. This only stops the automated series.
        </p>
        <Link
          href="/"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  const label = (track && TRACK_LABEL[track]) || "applicant";

  return (
    <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
      <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
        Unsubscribe?
      </h1>
      <p className="mb-8 text-near-black/70">
        This stops the automated follow-up emails about your {label}{" "}
        application. Your application stays on file, and a board member may
        still contact you directly about it.
      </p>
      <button
        onClick={handleUnsubscribe}
        disabled={submitting}
        className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
      >
        {submitting ? "Unsubscribing..." : "Yes, Unsubscribe Me"}
      </button>
      <p className="mt-8">
        <Link
          href="/"
          className="text-sm font-semibold text-dark-green hover:underline"
        >
          Never mind, take me home
        </Link>
      </p>
    </div>
  );
}
