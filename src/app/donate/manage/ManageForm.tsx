"use client";

import { useState } from "react";

/**
 * Requests a Stripe Customer Portal link by email.
 *
 * The server answers identically whether or not the address has a donation, so this form
 * shows the same confirmation either way. That is deliberate, not a rough edge: a form that
 * said "no donation found" would let anyone check whether a given person gives money to
 * this organization.
 */
export default function ManageForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/donate/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Could not reach the server. Please check your connection.");
    }
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-near-black/10 bg-white p-8 text-center">
        <p className="text-[15px] leading-relaxed text-near-black/70">
          If that email has a recurring donation with us, a management link is on
          its way. It works once and expires shortly, so open it when it arrives.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-near-black/50">
          Nothing in your inbox after a few minutes? Check spam, then email{" "}
          <a
            href="mailto:info@opportunityoutdoors.org"
            className="font-semibold text-dark-green hover:underline"
          >
            info@opportunityoutdoors.org
          </a>{" "}
          and we will sort it out by hand.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-near-black/10 bg-white p-8"
    >
      <label
        htmlFor="manage-email"
        className="block text-[12px] font-bold uppercase tracking-[1px] text-near-black"
      >
        Your email address
      </label>
      <p className="mt-1 text-sm text-near-black/50">
        Use the address you donated with.
      </p>
      <input
        id="manage-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="mt-3 w-full rounded border border-near-black/15 px-3 py-2.5 text-[15px] text-near-black outline-none focus:border-dark-green"
      />

      {error && <p className="mt-4 text-sm text-[#b00]">{error}</p>}

      <button
        type="submit"
        disabled={submitting || !email.trim()}
        className="mt-6 w-full rounded bg-dark-green px-6 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitting ? "Sending..." : "Email Me a Management Link"}
      </button>
    </form>
  );
}
