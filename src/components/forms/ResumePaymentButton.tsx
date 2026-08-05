"use client";

import { useState } from "react";

/**
 * "Finish Paying" for a camp registration with an outstanding balance.
 *
 * Shared by the two places a person can land with money still owed: the return page after
 * abandoning Stripe, and the "Already Registered" screen reached from the confirmation
 * email days later. Both need identical behaviour, and duplicating it is how the two drift.
 *
 * Always mints a NEW Checkout Session rather than reusing a URL. Stripe sessions expire, so
 * the abandoned link is dead within hours and reopening it just errors.
 */
export default function ResumePaymentButton({ token }: { token: string | null }) {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Without a token there is nothing to authorize the retry against, so point at the link
  // that does carry one rather than showing a button that cannot work.
  if (!token) {
    return (
      <p className="rounded border border-near-black/10 bg-cream/50 px-5 py-4 text-sm leading-relaxed text-near-black/70">
        To finish paying, use the link in your registration confirmation email.
        It carries the secure link back to your registration.
      </p>
    );
  }

  async function retry() {
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/register/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.alreadyPaid) {
        setMessage("This registration is already paid. Nothing more to do.");
      } else if (data.nothingOwed) {
        setMessage("There is no balance on this registration.");
      } else {
        setError(data.error || "Could not start checkout. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please check your connection.");
    }
    setSubmitting(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={retry}
        disabled={submitting}
        className="rounded bg-dark-green px-8 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-50"
      >
        {submitting ? "Starting checkout..." : "Finish Paying"}
      </button>
      {message && <p className="mt-4 text-sm text-dark-green">{message}</p>}
      {error && <p className="mt-4 text-sm text-[#b00]">{error}</p>}
    </div>
  );
}
