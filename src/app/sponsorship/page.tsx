import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import SponsorshipForm from "./SponsorshipForm";
import SponsorshipTiers from "./SponsorshipTiers";

export const metadata: Metadata = {
  title: "Sponsorship",
  description:
    "Partner with Opportunity Outdoors. Corporate sponsorship, podcast advertising, and individual scholarship opportunities.",
};

const impactStats = [
  { value: "400+", label: "Members" },
  { value: "30+", label: "Events Annually" },
  { value: "85%", label: "Goes to Programs" },
];

const podcastPackages = [
  { name: "Pre-Roll Ad", price: "$150", desc: "15-second intro mention at the top of the episode." },
  { name: "Mid-Roll Ad", price: "$250", desc: "60-second ad read during the episode with custom talking points." },
  { name: "Full Episode Sponsorship", price: "$500", desc: "Branded episode with intro/outro mentions, mid-roll, and social promotion." },
  { name: "Season Package", price: "$2,000", desc: "Ad placement across all episodes for one season (8-10 episodes)." },
];

const scholarshipTiers = [
  { name: "One Camper", price: "$75", desc: "Fund one mentee's full camp experience." },
  { name: "Two Campers", price: "$150", desc: "Send two new hunters or anglers to camp." },
  { name: "Full Squad", price: "$375", desc: "Sponsor a full squad of 5 mentees for one camp." },
];

export default function SponsorshipPage() {
  return (
    <>
      <PageHero
        title="Fuel the Mission"
        label="Partner With Us"
        subtitle="Opportunity Outdoors runs on community. Corporate sponsors and individual donors make it possible for us to put more people in the field — mentored, equipped, and inspired."
        backgroundImage="/images/hero/sponsorship-hero.jpg"
      />

      {/* Impact Stats */}
      <section className="bg-dark-green py-14">
        <SectionContainer>
          <div className="grid grid-cols-3 gap-6 text-center">
            {impactStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-[clamp(2rem,5vw,48px)] font-black leading-none text-white">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[2px] text-white/50">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Corporate Tiers */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-12 text-center">
            <LabelTag>Corporate Sponsorship</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Partnership Tiers
            </h2>
          </div>
          <SponsorshipTiers />
        </SectionContainer>
      </section>

      {/* Podcast Sponsorship */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mb-12 text-center">
            <LabelTag>Podcast Sponsorship</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Reach Our Audience
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {podcastPackages.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-lg border border-near-black/10 p-6"
              >
                <h3 className="text-lg font-extrabold text-near-black">
                  {pkg.name}
                </h3>
                <p className="mt-1 text-2xl font-black text-dark-green">
                  {pkg.price}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-near-black/50">
                  {pkg.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Individual Scholarships */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-12 text-center">
            <LabelTag>Individual Scholarships</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Sponsor a Camper
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm text-near-black/50">
              Fund a mentee&apos;s camp experience. Cost should never be a
              barrier to getting someone in the field.
            </p>
          </div>
          <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-3">
            {scholarshipTiers.map((tier) => (
              <div
                key={tier.name}
                className="rounded-lg border border-near-black/10 bg-white p-6 text-center"
              >
                <h3 className="text-lg font-extrabold text-near-black">
                  {tier.name}
                </h3>
                <p className="mt-1 text-3xl font-black text-dark-green">
                  {tier.price}
                </p>
                <p className="mt-2 text-sm text-near-black/50">{tier.desc}</p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry-form" className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-2xl">
            <div className="mb-10 text-center">
              <LabelTag>Get in Touch</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                Sponsorship Inquiry
              </h2>
            </div>
            <div className="rounded-lg bg-cream p-8">
              <SponsorshipForm />
            </div>
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
