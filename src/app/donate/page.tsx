import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import PartnerLogos from "@/components/ui/PartnerLogos";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support Opportunity Outdoors. Your donation funds mentorship camps, gear for new hunters and anglers, and conservation education across North Carolina.",
};

const tiers = [
  {
    name: "Supporter",
    amount: "$25",
    description:
      "Covers camp supplies, range fees, or educational materials for one participant.",
    badge: null,
  },
  {
    name: "Sponsor a Mentee",
    amount: "$100",
    description:
      "Fully funds one mentee's camp experience, including registration, meals, and gear lending.",
    badge: "Most Popular",
  },
  {
    name: "Camp Sponsor",
    amount: "$500",
    description:
      "Underwrites an entire camp weekend: venue, meals, insurance, and supplies for all participants.",
    badge: null,
  },
];

const budgetItems = [
  { label: "Programs & Camps", pct: 85, color: "bg-dark-green" },
  { label: "Operations", pct: 10, color: "bg-gold" },
  { label: "Admin", pct: 5, color: "bg-near-black/30" },
];

const otherWays = [
  {
    title: "Monthly Giving",
    desc: "Set up a recurring gift and provide steady support for mentorship programs year-round. Reach out to get started.",
    href: "/contact",
    linkText: "Contact Us",
  },
  {
    title: "Matching Gifts",
    desc: "Many employers match charitable contributions. Check with your HR team to double your impact. Contact us for more info.",
    href: "/contact",
    linkText: "Contact Us",
  },
  {
    title: "Sponsorship",
    desc: "Corporate and individual sponsorship packages for events, the podcast, and camp scholarships.",
    href: "/sponsorship",
    linkText: "Explore Sponsorships",
  },
];

export default function DonatePage() {
  return (
    <>
      <PageHero
        title="Support the Mission"
        label="Donate"
        subtitle="Every dollar goes toward putting new hunters and anglers in the field with experienced mentors."
        backgroundImage="/images/hero/donate-hero.jpg"
        flipImage
      />

      {/* Donate */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <LabelTag>Make an Impact</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Fund the Next Generation
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-near-black/60">
              Opportunity Outdoors is a 501(c)(3) nonprofit. All donations are
              tax-deductible. We keep overhead low so your gift goes directly to
              mentorship, camps, and conservation education.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-lg border-2 p-8 text-center ${
                  tier.badge
                    ? "border-gold bg-gold/5"
                    : "border-near-black/10 bg-white"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded bg-gold px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
                    {tier.badge}
                  </span>
                )}
                <h3 className="text-2xl font-extrabold text-near-black">
                  {tier.name}
                </h3>
                <p className="mt-2 text-[48px] font-black leading-none text-dark-green">
                  {tier.amount}
                </p>
                <p className="mt-4 text-sm leading-relaxed text-near-black/60">
                  {tier.description}
                </p>
                <div className="mt-6">
                  {/* Give Lively coming soon placeholder */}
                  <span className="inline-block rounded bg-dark-green/10 px-6 py-3 text-[13px] font-bold uppercase tracking-[1px] text-dark-green/50">
                    Coming Soon
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon message */}
          <div className="mt-10 rounded-lg border border-gold/30 bg-gold/5 px-6 py-5 text-center">
            <p className="text-sm leading-relaxed text-near-black/70">
              Online donations coming soon. In the meantime, contact us at{" "}
              <a
                href="mailto:info@opportunityoutdoors.org"
                className="font-semibold text-dark-green hover:underline"
              >
                info@opportunityoutdoors.org
              </a>{" "}
              to make a donation.
            </p>
          </div>
        </SectionContainer>
      </section>

      {/* Where Your Money Goes — commented out until we have real data
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <LabelTag>Transparency</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                Where Your Money Goes
              </h2>
            </div>
            <div className="mt-12 space-y-4">
              {budgetItems.map((item) => (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-sm font-semibold text-near-black">
                      {item.label}
                    </span>
                    <span className="text-sm font-bold text-near-black/60">
                      {item.pct}%
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-near-black/10">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionContainer>
      </section>
      */}

      {/* Other Ways to Give */}
      <section className="bg-warm-gray py-20">
        <SectionContainer>
          <div className="mb-12 text-center">
            <LabelTag>Other Ways to Give</LabelTag>
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
                {item.href && (
                  <Link
                    href={item.href}
                    className="mt-4 inline-block text-sm font-semibold uppercase tracking-[1px] text-gold hover:text-[#8B6914]"
                  >
                    {item.linkText} &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Partners */}
      <PartnerLogos />
    </>
  );
}
