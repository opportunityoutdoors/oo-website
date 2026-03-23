"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/forms/FormField";

interface EventRegistrationProps {
  event: {
    _id: string;
    title: string;
    eventType: string;
    status?: string;
    date: string;
    registrationOpens?: string;
    registrationCloses?: string;
    waitlistOpens?: string;
    waitlistCloses?: string;
    spotsRemaining?: number;
    meetingSlots?: { label: string; date: string }[];
  };
}

const howHeardOptions = [
  { label: "Friend or family", value: "Friend or family" },
  { label: "Social media", value: "Social media" },
  { label: "Podcast", value: "Podcast" },
  { label: "Website", value: "Website" },
  { label: "Other", value: "Other" },
];

const tshirtSizes = [
  { label: "XS", value: "XS" },
  { label: "S", value: "S" },
  { label: "M", value: "M" },
  { label: "L", value: "L" },
  { label: "XL", value: "XL" },
  { label: "2XL", value: "2XL" },
];

export default function EventRegistration({ event }: EventRegistrationProps) {
  const router = useRouter();
  const [submitStatus, setSubmitStatus] = useState<"idle" | "loading" | "error">("idle");
  const isCamp = event.eventType === "hunt-camp" || event.eventType === "fish-camp";
  const now = new Date();

  // Determine what to show based on event type + dates + status
  if (event.status === "sold-out" || event.spotsRemaining === 0) {
    return (
      <div className="rounded-lg border border-near-black/10 bg-white p-6 text-center">
        <p className="text-lg font-bold text-near-black">This event is full</p>
        <p className="mt-2 text-sm text-near-black/50">
          Check out our other upcoming events or sign up for our newsletter to be
          notified about future events.
        </p>
      </div>
    );
  }

  if (event.status === "completed") {
    return (
      <div className="rounded-lg border border-near-black/10 bg-white p-6 text-center">
        <p className="text-lg font-bold text-near-black">This event has concluded</p>
        <p className="mt-2 text-sm text-near-black/50">
          Stay tuned for future events like this one.
        </p>
      </div>
    );
  }

  // Camp waitlist logic
  if (isCamp) {
    if (event.waitlistOpens && new Date(event.waitlistOpens) > now) {
      return (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-6 text-center">
          <p className="text-lg font-bold text-near-black">
            Waitlist opens{" "}
            {new Date(event.waitlistOpens).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="mt-2 text-sm text-near-black/50">
            Check back then to join the waitlist.
          </p>
        </div>
      );
    }

    if (
      event.waitlistCloses &&
      new Date(event.waitlistCloses) < now &&
      event.status !== "registration-open"
    ) {
      return (
        <div className="rounded-lg border border-near-black/10 bg-white p-6 text-center">
          <p className="text-lg font-bold text-near-black">
            Waitlist is closed
          </p>
          <p className="mt-2 text-sm text-near-black/50">
            The waitlist for this event has closed. Follow us for future events.
          </p>
        </div>
      );
    }

    if (event.status === "registration-open") {
      return (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-6 text-center">
          <p className="text-lg font-bold text-near-black">
            Registration is open for invited participants
          </p>
          <p className="mt-2 text-sm text-near-black/50">
            If you were approved from the waitlist, check your email for your
            personalized registration link.
          </p>
        </div>
      );
    }

    // Show waitlist form
    return <WaitlistForm event={event} />;
  }

  // Community/Workshop registration logic
  if (event.registrationOpens && new Date(event.registrationOpens) > now) {
    return (
      <div className="rounded-lg border border-gold/30 bg-gold/5 p-6 text-center">
        <p className="text-lg font-bold text-near-black">
          Registration opens{" "}
          {new Date(event.registrationOpens).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    );
  }

  if (event.registrationCloses && new Date(event.registrationCloses) < now) {
    return (
      <div className="rounded-lg border border-near-black/10 bg-white p-6 text-center">
        <p className="text-lg font-bold text-near-black">
          Registration is closed
        </p>
      </div>
    );
  }

  // Show community/workshop registration form
  return <CommunityRegistrationForm event={event} />;
}

/* ─── Waitlist Form (Hunt/Fish Camps) ─── */

function WaitlistForm({
  event,
}: {
  event: EventRegistrationProps["event"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    role: "",
    meetingDate: "",
    honeypot: "",
  });

  const roleOptions = [
    { label: "Mentee", value: "Mentee" },
    { label: "Mentor", value: "Mentor" },
  ];

  const meetingOptions =
    event.meetingSlots?.map((slot) => ({
      label: slot.label,
      value: slot.label,
    })) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "camp-waitlist",
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            role: form.role,
            meetingDate: form.meetingDate,
            eventName: event.title,
            eventType: event.eventType === "hunt-camp" ? "Hunt Camp" : "Fish Camp",
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
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <h3 className="mb-2 text-xl font-extrabold text-near-black">
        Join the Waitlist
      </h3>
      <p className="mb-6 text-sm text-near-black/50">
        Sign up for the waitlist. We&apos;ll contact you about the pre-camp meeting
        and next steps.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="hidden" aria-hidden="true">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField type="text" label="First Name" name="wl-firstName" required value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
          <FormField type="text" label="Last Name" name="wl-lastName" required value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        </div>

        <FormField type="email" label="Email" name="wl-email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormField type="tel" label="Phone" name="wl-phone" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />

        <FormField type="select" label="I'm interested as a..." name="wl-role" required value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={roleOptions} placeholder="Select role..." />

        {meetingOptions.length > 0 && (
          <FormField type="radio" label="Preferred Meeting Date" name="wl-meeting" required value={form.meetingDate} onChange={(v) => setForm({ ...form, meetingDate: v })} options={meetingOptions} />
        )}

        {status === "error" && (
          <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? "Submitting..." : "Join the Waitlist"}
        </button>
      </form>
    </div>
  );
}

/* ─── Community/Workshop Registration Form ─── */

function CommunityRegistrationForm({
  event,
}: {
  event: EventRegistrationProps["event"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    cityState: "",
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
          formType: "event-registration",
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            email: form.email,
            phone: form.phone,
            cityState: form.cityState,
            howHeard: form.howHeard,
            eventName: event.title,
            eventType: event.eventType === "workshop" ? "Workshop" : "Community",
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
    <div className="rounded-lg bg-white p-8 shadow-sm">
      <h3 className="mb-2 text-xl font-extrabold text-near-black">
        Register
      </h3>
      <p className="mb-6 text-sm text-near-black/50">
        Sign up for this event. All fields marked with * are required.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="hidden" aria-hidden="true">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={(e) => setForm({ ...form, honeypot: e.target.value })} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <FormField type="text" label="First Name" name="reg-firstName" required value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
          <FormField type="text" label="Last Name" name="reg-lastName" required value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
        </div>

        <FormField type="email" label="Email" name="reg-email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
        <FormField type="tel" label="Phone" name="reg-phone" required value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <FormField type="text" label="City/State" name="reg-cityState" required value={form.cityState} onChange={(v) => setForm({ ...form, cityState: v })} placeholder="Raleigh, NC" />

        <FormField type="select" label="How Did You Hear About Us?" name="reg-howHeard" required value={form.howHeard} onChange={(v) => setForm({ ...form, howHeard: v })} options={howHeardOptions} />

        {status === "error" && (
          <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-60 sm:w-auto"
        >
          {status === "loading" ? "Submitting..." : "Register"}
        </button>
      </form>
    </div>
  );
}
