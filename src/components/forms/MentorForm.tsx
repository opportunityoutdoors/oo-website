"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/forms/FormField";
import { US_STATES } from "@/lib/constants/us-states";

const sexOptions = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
];

const yearsExperienceOptions = [
  { label: "5–10 years", value: "5-10" },
  { label: "10–20 years", value: "10-20" },
  { label: "20+ years", value: "20+" },
];

const certificationOptions = [
  { label: "Hunter Safety Instructor", value: "Hunter Safety Instructor" },
  { label: "First Aid/CPR", value: "First Aid/CPR" },
  { label: "NRA Range Safety Officer", value: "NRA Range Safety Officer" },
  { label: "Archery Instructor", value: "Archery Instructor" },
  { label: "Boating Safety", value: "Boating Safety" },
];

const mentoredBeforeOptions = [
  { label: "Yes", value: "Yes" },
  { label: "No, but I'd like to", value: "No, but I'd like to" },
];

const howHeardOptions = [
  { label: "Friend or family", value: "Friend or family" },
  { label: "Social media", value: "Social media" },
  { label: "Podcast", value: "Podcast" },
  { label: "Website", value: "Website" },
  { label: "Other", value: "Other" },
];

const huntingSkills = [
  { label: "Turkey", value: "Turkey" },
  { label: "Deer", value: "Deer" },
  { label: "Bear", value: "Bear" },
  { label: "Waterfowl", value: "Waterfowl" },
  { label: "Small game", value: "Small game" },
  { label: "Upland", value: "Upland" },
  { label: "Trapping", value: "Trapping" },
];

const fishingSkills = [
  { label: "Freshwater", value: "Freshwater" },
  { label: "Fly fishing", value: "Fly fishing" },
  { label: "Saltwater", value: "Saltwater" },
];

const outdoorSkillsList = [
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

export default function MentorForm() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [ageError, setAgeError] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "",
    email: "",
    phone: "",
    city: "",
    state: "NC",
    outdoorSkills: [] as string[],
    yearsExperience: "",
    certifications: [] as string[],
    mentoredBefore: "",
    affiliations: "",
    whyMentor: "",
    howHeard: "",
    honeypot: "",
  });

  const set = (field: string) => (value: string | string[]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "dateOfBirth" && typeof value === "string" && value) {
      setAgeError(calculateAge(value) < 18);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return;

    if (form.dateOfBirth && calculateAge(form.dateOfBirth) < 18) {
      setAgeError(true);
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/submit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formType: "mentor-signup",
          data: {
            firstName: form.firstName,
            lastName: form.lastName,
            dateOfBirth: form.dateOfBirth,
            sex: form.sex,
            email: form.email,
            phone: form.phone,
            city: form.city,
            state: form.state,
            outdoorSkills: form.outdoorSkills,
            yearsExperience: form.yearsExperience,
            certifications: form.certifications,
            mentoredBefore: form.mentoredBefore,
            affiliations: form.affiliations,
            whyMentor: form.whyMentor,
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
        <FormField type="text" label="First Name" name="mentor-firstName" required value={form.firstName} onChange={set("firstName")} />
        <FormField type="text" label="Last Name" name="mentor-lastName" required value={form.lastName} onChange={set("lastName")} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <FormField type="date" label="Date of Birth" name="mentor-dob" required value={form.dateOfBirth} onChange={set("dateOfBirth")} />
          {ageError && (
            <p className="mt-1.5 text-sm text-red-500">
              Mentors must be 18 or older.{" "}
              <a href="#mentee" className="font-semibold underline">
                Interested in joining as a mentee?
              </a>
            </p>
          )}
        </div>
        <FormField type="select" label="Sex" name="mentor-sex" required value={form.sex} onChange={set("sex")} options={sexOptions} />
      </div>

      <FormField type="email" label="Email" name="mentor-email" required value={form.email} onChange={set("email")} />

      <div className="grid gap-5 sm:grid-cols-3">
        <FormField type="tel" label="Phone" name="mentor-phone" required value={form.phone} onChange={set("phone")} />
        <FormField type="text" label="City" name="mentor-city" required value={form.city} onChange={set("city")} placeholder="Raleigh" />
        <FormField type="select" label="State" name="mentor-state" required value={form.state} onChange={set("state")} options={US_STATES} />
      </div>

      {/* Outdoor Skills — grouped */}
      <div>
        <p className="mb-3 text-sm font-semibold text-near-black">
          Outdoor Skills <span className="text-red-500">*</span>
        </p>
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-near-black/40">Hunting</p>
            <FormField type="checkbox-group" label="" name="mentor-skills-hunting" value={form.outdoorSkills} onChange={set("outdoorSkills")} options={huntingSkills} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-near-black/40">Fishing</p>
            <FormField type="checkbox-group" label="" name="mentor-skills-fishing" value={form.outdoorSkills} onChange={set("outdoorSkills")} options={fishingSkills} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-near-black/40">Outdoors</p>
            <FormField type="checkbox-group" label="" name="mentor-skills-outdoors" value={form.outdoorSkills} onChange={set("outdoorSkills")} options={outdoorSkillsList} />
          </div>
        </div>
      </div>

      <FormField type="select" label="Years of Experience" name="mentor-yearsExp" required value={form.yearsExperience} onChange={set("yearsExperience")} options={yearsExperienceOptions} />

      <div>
        <p className="mb-2 text-sm font-semibold text-near-black">Certifications (optional)</p>
        <FormField type="checkbox-group" label="" name="mentor-certs" value={form.certifications} onChange={set("certifications")} options={certificationOptions} />
      </div>

      <FormField type="radio" label="Have you mentored before?" name="mentor-mentored" required value={form.mentoredBefore} onChange={set("mentoredBefore")} options={mentoredBeforeOptions} />

      <FormField type="text" label="Affiliations (optional)" name="mentor-affiliations" value={form.affiliations} onChange={set("affiliations")} placeholder="Conservation orgs, military, student groups, etc." />

      <FormField type="textarea" label="Tell us why you want to mentor (optional)" name="mentor-why" value={form.whyMentor} onChange={set("whyMentor")} placeholder="What drives your interest in helping the next generation? What do you hope to teach them?" />

      <FormField type="select" label="How Did You Hear About Us?" name="mentor-howHeard" required value={form.howHeard} onChange={set("howHeard")} options={howHeardOptions} />

      <div aria-live="polite">
        {status === "error" && (
          <p className="text-sm text-red-500">Something went wrong. Please try again.</p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading" || ageError}
        className="w-full rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90 disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Submitting..." : "Apply as Mentor"}
      </button>
    </form>
  );
}
