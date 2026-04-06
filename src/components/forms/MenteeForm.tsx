"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/forms/FormField";

const sexOptions = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
];

const experienceLevels = [
  { label: "No experience", value: "No experience" },
  { label: "A little experience (been once or twice)", value: "A little experience" },
  { label: "Some experience (go occasionally but want to learn more)", value: "Some experience" },
];

const gearOptions = [
  { label: "I have all the gear I need", value: "Have all gear" },
  { label: "I have some gear", value: "Have some gear" },
  { label: "I don't have any gear", value: "No gear" },
];

const howHeardOptions = [
  { label: "Friend or family", value: "Friend or family" },
  { label: "Social media", value: "Social media" },
  { label: "Podcast", value: "Podcast" },
  { label: "Website", value: "Website" },
  { label: "Other", value: "Other" },
];

const huntingInterests = [
  { label: "Turkey", value: "Turkey" },
  { label: "Deer", value: "Deer" },
  { label: "Bear", value: "Bear" },
  { label: "Waterfowl", value: "Waterfowl" },
  { label: "Small game", value: "Small game" },
  { label: "Upland", value: "Upland" },
  { label: "Trapping", value: "Trapping" },
];

const fishingInterests = [
  { label: "Freshwater", value: "Freshwater" },
  { label: "Fly fishing", value: "Fly fishing" },
  { label: "Saltwater", value: "Saltwater" },
];

const outdoorInterests = [
  { label: "Hiking", value: "Hiking" },
  { label: "Camping/Backpacking", value: "Camping/Backpacking" },
  { label: "Birding", value: "Birding" },
  { label: "Archery", value: "Archery" },
  { label: "Shooting sports (clay/skeet/trap)", value: "Shooting sports" },
  { label: "Foraging", value: "Foraging" },
  { label: "Wildlife photography", value: "Wildlife photography" },
];

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function MenteeForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    email: "",
    phone: "",
    cityState: "",
    outdoorInterests: [] as string[],
    experienceLevel: "",
    gearStatus: "",
    affiliations: "",
    aboutYourself: "",
    howHeard: "",
    parentName: "",
    parentPhone: "",
    parentEmail: "",
    honeypot: "",
  });

  const isMinor = form.dateOfBirth ? calculateAge(form.dateOfBirth) < 18 : false;

  const set = (field: string) => (value: string | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "mentee-signup",
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            dateOfBirth: form.dateOfBirth,
            sex: form.sex,
            email: form.email,
            phone: form.phone,
            cityState: form.cityState,
            outdoorInterests: form.outdoorInterests,
            experienceLevel: form.experienceLevel,
            gearStatus: form.gearStatus,
            affiliations: form.affiliations,
            aboutYourself: form.aboutYourself,
            howHeard: form.howHeard,
            ...(isMinor && {
              parentName: form.parentName,
              parentPhone: form.parentPhone,
              parentEmail: form.parentEmail,
            }),
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
    <form onSubmit={handleSubmit} className="space-y-6">
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
        <FormField type="text" label="First Name" name="mentee-firstName" required value={form.firstName} onChange={set("firstName")} />
        <FormField type="text" label="Last Name" name="mentee-lastName" required value={form.lastName} onChange={set("lastName")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField type="date" label="Date of Birth" name="mentee-dob" required value={form.dateOfBirth} onChange={set("dateOfBirth")} />
        <FormField type="select" label="Sex" name="mentee-sex" required value={form.sex} onChange={set("sex")} options={sexOptions} />
      </div>

      <FormField type="email" label="Email" name="mentee-email" required value={form.email} onChange={set("email")} />

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField type="tel" label="Phone" name="mentee-phone" required value={form.phone} onChange={set("phone")} />
        <FormField type="text" label="City/State" name="mentee-cityState" required value={form.cityState} onChange={set("cityState")} placeholder="Raleigh, NC" />
      </div>

      {/* Outdoor Interests — grouped */}
      <div>
        <p className="mb-3 text-sm font-semibold text-near-black">
          Outdoor Interests <span className="text-red-500">*</span>
        </p>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-near-black/40">Hunting</p>
            <FormField type="checkbox-group" label="" name="mentee-interests-hunting" value={form.outdoorInterests} onChange={set("outdoorInterests")} options={huntingInterests} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-near-black/40">Fishing</p>
            <FormField type="checkbox-group" label="" name="mentee-interests-fishing" value={form.outdoorInterests} onChange={set("outdoorInterests")} options={fishingInterests} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-near-black/40">Outdoors</p>
            <FormField type="checkbox-group" label="" name="mentee-interests-outdoors" value={form.outdoorInterests} onChange={set("outdoorInterests")} options={outdoorInterests} />
          </div>
        </div>
      </div>

      <FormField type="select" label="Experience Level" name="mentee-experience" required value={form.experienceLevel} onChange={set("experienceLevel")} options={experienceLevels} />

      <FormField type="select" label="Gear Status" name="mentee-gear" required value={form.gearStatus} onChange={set("gearStatus")} options={gearOptions} />

      <FormField type="text" label="Affiliations (optional)" name="mentee-affiliations" value={form.affiliations} onChange={set("affiliations")} placeholder="Conservation orgs, military, student groups, etc." />

      <FormField type="textarea" label="Tell us about yourself (optional)" name="mentee-about" value={form.aboutYourself} onChange={set("aboutYourself")} placeholder="Why are you interested in joining Opportunity Outdoors? What are you hoping to learn?" />

      <FormField type="select" label="How Did You Hear About Us?" name="mentee-howHeard" required value={form.howHeard} onChange={set("howHeard")} options={howHeardOptions} />

      {/* Conditional Parent/Guardian fields */}
      {isMinor && (
        <div className="rounded-lg border border-gold/30 bg-gold/5 p-6">
          <p className="mb-4 text-sm font-semibold text-near-black">
            Since you&apos;re under 18, we need your parent or guardian&apos;s info:
          </p>
          <div className="space-y-4">
            <FormField type="text" label="Parent/Guardian Name" name="mentee-parentName" required value={form.parentName} onChange={set("parentName")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField type="tel" label="Parent/Guardian Phone" name="mentee-parentPhone" required value={form.parentPhone} onChange={set("parentPhone")} />
              <FormField type="email" label="Parent/Guardian Email" name="mentee-parentEmail" required value={form.parentEmail} onChange={set("parentEmail")} />
            </div>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {status === "error" && (
          <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Submitting..." : "Apply as Mentee"}
      </button>
    </form>
  );
}
