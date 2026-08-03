"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SurveyQuestions, { EMPTY_ANSWERS } from "@/components/forms/SurveyQuestions";
import type { SurveyAnswers, SurveyKind } from "@/lib/surveys/questions";

// Same state machine as the meeting-change form: loading, invalid link, already done,
// success, or the form itself.

type Info = {
  kind: SurveyKind;
  completed: boolean;
  eventTitle: string;
  eventKind: string;
  firstName: string | null;
};

export default function SurveyForm({ token }: { token: string }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [answers, setAnswers] = useState<SurveyAnswers>(EMPTY_ANSWERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/survey?token=${token}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "This link is not valid.");
        } else {
          setInfo(data);
        }
      } catch {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
    }
    validate();
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, answers }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error === "already_completed") {
          setInfo((prev) => (prev ? { ...prev, completed: true } : prev));
        } else {
          setError(data.error || "Something went wrong.");
        }
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

  if (error && !info) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-near-black">
          Link Not Valid
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

  if (success || info?.completed) {
    return (
      <div className="mx-auto max-w-lg px-6 pb-24 pt-36 text-center">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-gold text-4xl font-bold text-white">
          &#10003;
        </div>
        <h1 className="mb-4 font-heading text-3xl font-[900] uppercase text-dark-green">
          {success ? "Thanks, Got It" : "Already Answered"}
        </h1>
        <p className="mb-8 text-near-black/60">
          {success
            ? "This genuinely shapes what we run next. We appreciate you taking the time."
            : "You have already completed this survey. Thanks again."}
        </p>
        <Link
          href="/events"
          className="inline-block rounded bg-dark-green px-8 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
        >
          See What&apos;s Next
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 pb-24 pt-36">
      <h1 className="mb-2 font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
        How Was {info!.eventTitle}?
      </h1>
      <p className="mb-10 text-near-black/60">
        {info!.firstName ? `Thanks, ${info!.firstName}. ` : ""}
        These are the same questions you answered when you registered. Comparing
        the two is how we tell whether this is working. About two minutes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <SurveyQuestions
          kind={info!.kind}
          eventKind={info!.eventKind}
          namePrefix="post"
          value={answers}
          onChange={setAnswers}
        />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-60 sm:w-auto"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
