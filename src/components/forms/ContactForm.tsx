"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/forms/FormField";

const subjectOptions = [
  { label: "General Question", value: "General Question" },
  { label: "Partnership or Sponsorship", value: "Partnership or Sponsorship" },
  { label: "Media Inquiry", value: "Media Inquiry" },
  { label: "Event Question", value: "Event Question" },
  { label: "Other", value: "Other" },
];

export default function ContactForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    subject: "",
    message: "",
    honeypot: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "contact",
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            subject: form.subject,
            message: form.message,
          },
        }),
      });

      if (res.ok) {
        router.push("/thank-you");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Honeypot */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={form.honeypot}
          onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          type="text"
          label="First Name"
          name="firstName"
          required
          value={form.firstName}
          onChange={(v) => setForm({ ...form, firstName: v })}
        />
        <FormField
          type="text"
          label="Last Name"
          name="lastName"
          required
          value={form.lastName}
          onChange={(v) => setForm({ ...form, lastName: v })}
        />
      </div>

      <FormField
        type="email"
        label="Email"
        name="email"
        required
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />

      <FormField
        type="select"
        label="Subject"
        name="subject"
        required
        value={form.subject}
        onChange={(v) => setForm({ ...form, subject: v })}
        options={subjectOptions}
        placeholder="Select a topic..."
      />

      <FormField
        type="textarea"
        label="Message"
        name="message"
        required
        value={form.message}
        onChange={(v) => setForm({ ...form, message: v })}
        placeholder="How can we help?"
        rows={5}
      />

      {status === "error" && (
        <p className="text-sm text-red-500">
          Something went wrong. Please try again.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Sending..." : "Send Message"}
      </button>
    </form>
  );
}
