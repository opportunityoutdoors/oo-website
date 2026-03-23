"use client";

import { useState } from "react";

export default function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "newsletter",
          data: { email },
        }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section className="bg-dark-green px-6 py-20 text-center text-white md:px-10">
      <div className="mx-auto max-w-[600px]">
        <h3 className="mb-4 text-2xl font-bold uppercase tracking-[1px]">
          Want Updates?
        </h3>
        <p className="mb-8 text-base leading-relaxed text-white/80">
          Get notified about new events, podcast episodes, and community news.
        </p>
        {status === "success" ? (
          <p className="text-gold font-semibold">
            You&apos;re subscribed! Check your inbox.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-2.5 sm:flex-row"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded bg-white px-4 py-3 text-sm text-near-black placeholder:text-near-black/40"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="rounded bg-gold px-7 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black transition-colors hover:bg-gold/90 disabled:opacity-60"
            >
              {status === "loading" ? "Sending..." : "Subscribe"}
            </button>
          </form>
        )}
        {status === "error" && (
          <p className="mt-3 text-sm text-red-300">
            Something went wrong. Please try again.
          </p>
        )}
      </div>
    </section>
  );
}
