import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import MentorshipLadder from "@/components/ui/MentorshipLadder";
import Accordion from "@/components/ui/Accordion";
import CTABanner from "@/components/ui/CTABanner";

export const metadata: Metadata = {
  title: "Get Involved",
  description:
    "Join Opportunity Outdoors as a mentee, mentor, volunteer, donor, or sponsor. Find your path into outdoor mentorship.",
};

const faqItems = [
  {
    question: "Do I need any experience to join?",
    answer:
      "Not at all. Our mentorship program is designed for people with zero experience. We start from the basics — safety, ethics, gear, and skills — and walk alongside you every step of the way.",
  },
  {
    question: "What's the time commitment?",
    answer:
      "It's entirely up to you. Camps are typically 2-3 day weekends a few times per year. Community events like cookouts and range days are single-day, no-commitment gatherings. Participate in as many or as few as you'd like.",
  },
  {
    question: "Do I need to own gear?",
    answer:
      "No. We have a gear lending program and can outfit you for any camp or event. As you grow in your outdoor journey, we'll help you make smart gear decisions when you're ready to buy your own.",
  },
  {
    question: "What does it cost?",
    answer:
      "Community events are typically free. Hunt and fish camps have a registration fee (usually $75-$100) that covers meals, venue, insurance, and supplies. Scholarships are available — cost should never be a barrier.",
  },
  {
    question: "What are the requirements to be a mentor?",
    answer:
      "Mentors must be 18 or older with meaningful outdoor experience. You don't need to be an expert — you just need patience, a willingness to teach, and a commitment to safety and conservation ethics.",
  },
  {
    question: "Is this only for hunting?",
    answer:
      "No. We run camps and events for hunting (turkey, deer, dove, waterfowl), fishing (freshwater, fly fishing, saltwater), and general outdoor skills. Our community includes all kinds of outdoor enthusiasts.",
  },
];

const otherWays = [
  {
    title: "Donate",
    desc: "Fund mentorship camps, gear for new hunters, and conservation education.",
    label: "Donate Now",
    href: "/donate",
  },
  {
    title: "Volunteer",
    desc: "Help with events, share your skills, or support behind the scenes.",
    label: "Contact Us",
    href: "/contact",
  },
  {
    title: "Sponsor",
    desc: "Corporate and individual sponsorship packages for events and the podcast.",
    label: "Explore Sponsorships",
    href: "/sponsorship",
  },
];

export default function GetInvolvedPage() {
  return (
    <>
      {/* Hero with Dual Paths */}
      <section className="relative flex min-h-[500px] items-end overflow-hidden bg-dark-green">
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-32 md:px-10">
          <LabelTag variant="white">Get Involved</LabelTag>
          <h1 className="mt-5 max-w-[700px] text-5xl leading-tight tracking-tight text-white md:text-7xl">
            Find Your Path
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/80">
            Whether you&apos;re brand new to the outdoors or a lifelong
            sportsman ready to give back, there&apos;s a place for you here.
          </p>
        </div>
      </section>

      {/* Mentee Path */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <LabelTag>Mentee Path</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                I Want to Learn
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-near-black/60">
                New to hunting or fishing? Curious but don&apos;t know where to
                start? We&apos;ll walk alongside you from day one. No experience
                necessary — just a willingness to learn and respect for the
                outdoors.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Hands-on mentorship from experienced sportsmen",
                  "All gear provided — no upfront investment needed",
                  "Safety, ethics, and conservation from the start",
                  "A community that has your back beyond the field",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-near-black/70"
                  >
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/signup#mentee"
                  className="inline-block rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
                >
                  Apply as a Mentee
                </Link>
              </div>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-lg bg-warm-gray">
              <div className="flex h-full items-center justify-center text-sm text-near-black/30">
                Mentee Photo
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* Mentor Path */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="order-2 lg:order-1 aspect-[4/3] overflow-hidden rounded-lg bg-warm-gray">
              <div className="flex h-full items-center justify-center text-sm text-near-black/30">
                Mentor Photo
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <LabelTag>Mentor Path</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                I Want to Mentor
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-near-black/60">
                Someone walked alongside you once. Now it&apos;s your turn to
                invest in the next generation. Share your skills, your stories,
                and your passion for the outdoors with people who are just
                getting started.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Lead at camps and community events",
                  "Share hard-won skills with eager learners",
                  "Build lasting relationships in the field",
                  "Give back to the traditions that shaped you",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 text-sm text-near-black/70"
                  >
                    <span className="mt-1 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Link
                  href="/signup#mentor"
                  className="inline-block rounded border-2 border-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-dark-green transition-colors hover:bg-dark-green hover:text-white"
                >
                  Apply as a Mentor
                </Link>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* Mentorship Ladder */}
      <MentorshipLadder />

      {/* Other Ways to Help */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-12 text-center">
            <LabelTag>Other Ways to Help</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Every Role Matters
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {otherWays.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-near-black/10 bg-white p-8"
              >
                <h3 className="text-xl font-extrabold text-near-black">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-near-black/60">
                  {item.desc}
                </p>
                <Link
                  href={item.href}
                  className="mt-5 inline-block text-sm font-semibold uppercase tracking-[1px] text-gold hover:text-[#8B6914]"
                >
                  {item.label} &rarr;
                </Link>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <LabelTag>FAQ</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                Common Questions
              </h2>
            </div>
            <Accordion items={faqItems} />
          </div>
        </SectionContainer>
      </section>

      {/* CTA Banner */}
      <CTABanner
        heading="Ready to Get Started?"
        text="Join a community of hunters, anglers, and outdoor enthusiasts who believe in mentorship and conservation."
        primaryLabel="Sign Up Now"
        primaryHref="/signup"
        secondaryLabel="Contact Us"
        secondaryHref="/contact"
      />
    </>
  );
}
