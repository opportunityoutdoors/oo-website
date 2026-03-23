"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/forms/FormField";

const interestOptions = [
  { label: "Camp Sponsor", value: "Camp Sponsor" },
  { label: "Season Sponsor", value: "Season Sponsor" },
  { label: "Founding Partner", value: "Founding Partner" },
  { label: "Podcast Sponsorship", value: "Podcast Sponsorship" },
  { label: "Other", value: "Other" },
];

const budgetOptions = [
  { label: "Under $2,500", value: "Under $2,500" },
  { label: "$2,500–$5,000", value: "$2,500-$5,000" },
  { label: "$5,000–$10,000", value: "$5,000-$10,000" },
  { label: "$10,000+", value: "$10,000+" },
];

const howHeardOptions = [
  { label: "Search Engine", value: "Search Engine" },
  { label: "Social Media", value: "Social Media" },
  { label: "Podcast", value: "Podcast" },
  { label: "Referral", value: "Referral" },
  { label: "Event", value: "Event" },
  { label: "Other", value: "Other" },
];

export default function SponsorshipForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [form, setForm] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    opportunityInterest: [] as string[],
    budgetRange: "",
    aboutCompany: "",
    howHeard: "",
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
          formType: "sponsorship",
          data: {
            companyName: form.companyName,
            contactName: form.contactName,
            email: form.email,
            phone: form.phone,
            opportunityInterest: form.opportunityInterest,
            budgetRange: form.budgetRange,
            aboutCompany: form.aboutCompany,
            howHeard: form.howHeard,
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

      <FormField
        type="text"
        label="Company Name"
        name="sp-companyName"
        required
        value={form.companyName}
        onChange={(v) => setForm({ ...form, companyName: v })}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField
          type="text"
          label="Contact Name"
          name="sp-contactName"
          required
          value={form.contactName}
          onChange={(v) => setForm({ ...form, contactName: v })}
        />
        <FormField
          type="email"
          label="Email"
          name="sp-email"
          required
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
        />
      </div>

      <FormField
        type="tel"
        label="Phone (optional)"
        name="sp-phone"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />

      <div>
        <p className="mb-2 text-sm font-semibold text-near-black">
          Opportunity Interest
        </p>
        <FormField
          type="checkbox-group"
          label=""
          name="sp-interest"
          value={form.opportunityInterest}
          onChange={(v) => setForm({ ...form, opportunityInterest: v })}
          options={interestOptions}
        />
      </div>

      <FormField
        type="select"
        label="Budget Range (optional)"
        name="sp-budget"
        value={form.budgetRange}
        onChange={(v) => setForm({ ...form, budgetRange: v })}
        options={budgetOptions}
      />

      <FormField
        type="textarea"
        label="Tell us about your company and why you'd like to partner (optional)"
        name="sp-about"
        value={form.aboutCompany}
        onChange={(v) => setForm({ ...form, aboutCompany: v })}
      />

      <FormField
        type="select"
        label="How did you hear about us? (optional)"
        name="sp-howHeard"
        value={form.howHeard}
        onChange={(v) => setForm({ ...form, howHeard: v })}
        options={howHeardOptions}
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
        {status === "loading" ? "Sending..." : "Send Inquiry"}
      </button>
    </form>
  );
}
