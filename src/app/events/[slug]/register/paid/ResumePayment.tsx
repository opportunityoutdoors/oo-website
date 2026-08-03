"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * "Try again" button for an abandoned camp checkout.
 *
 * Reads the registration token from the query string, the same token the registration form
 * used. A fresh Checkout Session is created server-side rather than reusing the expired
 * one, because Stripe sessions are short-lived and a stale URL just errors.
 */
export default function ResumePayment() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Without a token there is nothing to authorize the retry. Rather than show a button that
  // cannot work, point them at the link that does carry one.
  if (!token) {
    return (
      <p className="mt-8 rounded border border-near-black/10 bg-cream/50 px-5 py-4 text-sm leading-relaxed text-near-black/70">
        To finish paying, use the payment link in your registration confirmation
        email. It carries the secure link back to your registration.
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
    <div className="mt-8">
      <button
        type="button"
        onClick={retry}
        disabled={submitting}
        className="rounded bg-dark-green px-7 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Starting checkout..." : "Finish Paying"}
      </button>
      {message && (
        <p className="mt-4 text-sm text-dark-green">{message}</p>
      )}
      {error && <p className="mt-4 text-sm text-[#b00]">{error}</p>}
    </div>
  );
}
