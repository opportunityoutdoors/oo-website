"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import SectionContainer from "@/components/ui/SectionContainer";
import MenteeForm from "@/components/forms/MenteeForm";
import MentorForm from "@/components/forms/MentorForm";

type Path = "mentee" | "mentor";

export default function SignUpForms() {
  const searchParams = useSearchParams();
  const [activePath, setActivePath] = useState<Path>("mentee");

  // Handle URL hash and query param for deep linking
  useEffect(() => {
    const pathParam = searchParams.get("path");
    if (pathParam === "mentor") {
      setActivePath("mentor");
    } else if (pathParam === "mentee") {
      setActivePath("mentee");
    }

    // Check hash
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "");
      if (hash === "mentor") setActivePath("mentor");
      if (hash === "mentee") setActivePath("mentee");
    }
  }, [searchParams]);

  // Scroll to form on path change
  useEffect(() => {
    const el = document.getElementById(activePath);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activePath]);

  return (
    <section className="bg-cream py-20">
      <SectionContainer>
        {/* Path Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-2">
          <button
            type="button"
            onClick={() => setActivePath("mentee")}
            className={`rounded-lg border-2 p-8 text-left transition-colors ${
              activePath === "mentee"
                ? "border-dark-green bg-dark-green/5"
                : "border-near-black/10 bg-white hover:border-near-black/20"
            }`}
          >
            <h3 className="text-2xl font-extrabold text-near-black">
              I Want to Learn
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-near-black/60">
              New to hunting or fishing? We&apos;ll pair you with an experienced
              mentor and get you in the field. No experience needed.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold uppercase tracking-[1px] text-dark-green">
              {activePath === "mentee" ? "Selected" : "Get Started"} &darr;
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActivePath("mentor")}
            className={`rounded-lg border-2 p-8 text-left transition-colors ${
              activePath === "mentor"
                ? "border-dark-green bg-dark-green/5"
                : "border-near-black/10 bg-white hover:border-near-black/20"
            }`}
          >
            <h3 className="text-2xl font-extrabold text-near-black">
              I Want to Mentor
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-near-black/60">
              Share your outdoor experience with the next generation. Lead at
              camps, teach skills, and build lasting relationships.
            </p>
            <span className="mt-4 inline-block text-sm font-semibold uppercase tracking-[1px] text-dark-green">
              {activePath === "mentor" ? "Selected" : "Get Started"} &darr;
            </span>
          </button>
        </div>

        {/* Mentee Form */}
        <div id="mentee" className={activePath === "mentee" ? "" : "hidden"}>
          <div className="rounded-lg bg-white p-8 shadow-sm md:p-10">
            <h2 className="mb-2 text-3xl leading-tight text-near-black">
              Mentee Application
            </h2>
            <p className="mb-8 text-sm text-near-black/50">
              Takes about 5 minutes. All fields marked with * are required.
            </p>
            <MenteeForm />
          </div>
        </div>

        {/* Mentor Form */}
        <div id="mentor" className={activePath === "mentor" ? "" : "hidden"}>
          <div className="rounded-lg bg-white p-8 shadow-sm md:p-10">
            <h2 className="mb-2 text-3xl leading-tight text-near-black">
              Mentor Application
            </h2>
            <p className="mb-8 text-sm text-near-black/50">
              Takes about 5 minutes. All fields marked with * are required.
            </p>
            <MentorForm />
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
