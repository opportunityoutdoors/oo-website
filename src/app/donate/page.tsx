import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import PartnerLogos from "@/components/ui/PartnerLogos";
import DonateForm from "./DonateForm";

export const metadata: Metadata = {
  title: "Donate",
  description:
    "Support Opportunity Outdoors. Your donation funds mentorship camps, gear for new hunters and anglers, and conservation education across North Carolina.",
};

// The amount tiers moved into DonateForm, which needs them as interactive state rather
// than static markup.

const budgetItems = [
  { label: "Programs & Camps", pct: 85, color: "bg-dark-green" },
  { label: "Operations", pct: 10, color: "bg-gold" },
  { label: "Admin", pct: 5, color: "bg-near-black/30" },
];

const otherWays = [
  {
    title: "Monthly Giving",
    desc: "A recurring gift is the single most useful thing a small nonprofit can receive. It lets us plan a season ahead instead of a camp at a time. Choose Monthly above.",
    href: null,
    linkText: null,
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

export default async function DonatePage({
  searchParams,
}: {
  // Next 16 hands searchParams over as a Promise. Used only to detect a return trip from
  // an abandoned Stripe Checkout so the page can say plainly that nothing was charged.
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { canceled } = await searchParams;

  return (
    <>
      <PageHero
        title="Support the Mission"
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
          <DonateForm canceled={canceled === "1"} />
        </SectionContainer>
      </section>

      {/* Where Your Money Goes, commented out until we have real data
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
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Other Ways to Give
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
