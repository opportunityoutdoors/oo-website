import { Suspense } from "react";
import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import Accordion from "@/components/ui/Accordion";
import SignUpForms from "./SignUpForms";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Apply to join Opportunity Outdoors as a mentee or mentor. Start your outdoor mentorship journey today.",
};

const faqItems = [
  {
    question: "How long does the application take?",
    answer:
      "About 5 minutes. We'll review your application and a board member will reach out within 48 hours to discuss next steps.",
  },
  {
    question: "Is there an age requirement?",
    answer:
      "Mentees of all ages are welcome (applicants under 18 need a parent/guardian's info). Mentors must be 18 or older.",
  },
  {
    question: "What happens after I apply?",
    answer:
      "A board member will review your application and reach out to introduce themselves. They'll help you find the right upcoming events and connect you with the community.",
  },
  {
    question: "Can I apply as both a mentee and a mentor?",
    answer:
      "Absolutely. Many of our best mentors started as mentees. If you're experienced in some areas and want to learn others, you can participate in both roles.",
  },
];

export default function SignUpPage() {
  return (
    <>
      <PageHero
        title="Take the First Step"
        label="Join Us"
        subtitle="Whether you're new to the outdoors or ready to give back — start here."
        backgroundImage="/images/hero/get-involved-hero.jpg"
      />

      {/* Path Selection + Forms */}
      <Suspense>
        <SignUpForms />
      </Suspense>

      {/* What Happens Next */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mb-12 text-center">
            <LabelTag>What Happens Next</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Three Simple Steps
            </h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                num: "1",
                title: "Application Review",
                desc: "A board member reviews your info and reaches out within 48 hours.",
              },
              {
                num: "2",
                title: "Get Connected",
                desc: "We'll match you with the right mentors, mentees, or upcoming events based on your interests.",
              },
              {
                num: "3",
                title: "Go to an Event",
                desc: "Show up to a community event, range day, or camp. Meet the crew and get in the field.",
              },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-dark-green text-xl font-black text-white">
                  {step.num}
                </span>
                <h3 className="mt-4 text-xl font-extrabold text-near-black">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-near-black/60">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* FAQ */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <LabelTag>FAQ</LabelTag>
            </div>
            <Accordion items={faqItems} />
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
