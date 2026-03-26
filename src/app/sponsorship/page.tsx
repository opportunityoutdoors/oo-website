import type { Metadata } from "next";
import Link from "next/link";
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

const podcastPackages = [
  { name: "Episode Mention", desc: "Brand mention during a podcast episode with a brief description of your business." },
  { name: "Episode Sponsorship", desc: "Full episode sponsorship with intro/outro mentions and social media promotion." },
  { name: "Custom Package", desc: "Let's build something that works for you. Reach out to discuss options." },
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
        imagePosition="center 65%"
      />

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
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-near-black/50">
            Reach an engaged audience of hunters, anglers, and outdoor enthusiasts across North Carolina. Inquire for pricing and availability.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {podcastPackages.map((pkg) => (
              <div
                key={pkg.name}
                className="rounded-lg border border-near-black/10 p-6"
              >
                <h3 className="text-lg font-extrabold text-near-black">
                  {pkg.name}
                </h3>
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

      {/* Gear Donations */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-2xl text-center">
            <LabelTag>Gear Donations</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Donate Gear &amp; Swag
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-near-black/50">
              Have hunting, fishing, or camping gear collecting dust? We accept gear
              donations to use in raffles, giveaways, and to help equip new hunters and anglers.
              Branded swag and merchandise donations are also welcome.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-near-black/50">
              Reach out to coordinate a drop-off or shipment.
            </p>
            <Link
              href="#inquiry-form"
              className="mt-8 inline-block rounded bg-dark-green px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-dark-green/90"
            >
              Donate Gear
            </Link>
          </div>
        </SectionContainer>
      </section>

      {/* Inquiry Form */}
      <section id="inquiry-form" className="bg-warm-gray py-20">
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
