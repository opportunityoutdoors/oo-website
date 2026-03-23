import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import Accordion from "@/components/ui/Accordion";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import JsonLd from "@/components/ui/JsonLd";

export const metadata: Metadata = {
  title: "FAQ & Gear Lists",
};

const generalFaq = [
  {
    question: "What is Opportunity Outdoors?",
    answer:
      "A North Carolina 501(c)(3) nonprofit that mentors new hunters and anglers through camps, events, and community engagement. We're dedicated to conservation through mentorship.",
  },
  {
    question: "Do I need experience?",
    answer:
      "No. Most of our mentees start with zero experience. Whether you've never held a fishing rod or never fired a rifle, we're here to teach you from day one.",
  },
  {
    question: "What does it cost?",
    answer:
      "Community events are free. Camps have a small registration fee ($50–$100) to cover meals, lodging, and supplies.",
  },
  {
    question: "Where are events held?",
    answer:
      "Across NC — mountains, piedmont, and coast. Most community events are in the Triangle (Raleigh-Durham-Chapel Hill area), but we also hold camps and events statewide.",
  },
  {
    question: "How do I sign up?",
    answer:
      "Head to our Get Involved page and fill out the mentee or mentor form. You can also reach us directly at info@opportunityoutdoors.org with any questions.",
  },
  {
    question: "Do I need my own gear?",
    answer:
      "Not always. Let us know what you have and we'll help. See the gear lists below for activity-specific requirements and recommendations. We often have loaners available.",
  },
  {
    question: "Can I bring my kids?",
    answer:
      "Some events are family-friendly. Camps are generally adults only (18+) to ensure focus and safety, but we have family-oriented community events throughout the year. Check the event page for age requirements.",
  },
  {
    question: "Is OO only for hunting?",
    answer:
      "No. We do fishing camps and events too, plus cookouts, range days, and community hangouts. Our mission covers all aspects of outdoor heritage and conservation.",
  },
];

const gearLists = [
  {
    question: "Turkey Hunting",
    answer:
      "Valid NC hunting license with turkey privileges • Shotgun (12 or 20 gauge) • Turkey loads (#4–#6 shot) • Full camo (head to toe including face mask and gloves) • Blaze orange for travel • Turkey calls (optional — we'll have loaners) • Decoys (optional) • Headlamp, water bottle, daypack, bug spray, camp chair, rain gear",
  },
  {
    question: "Deer Hunting",
    answer:
      "Valid NC hunting license • Rifle or bow with appropriate ammo • Blaze orange vest and hat • Warm layered clothing (scent-free if possible) • Waterproof boots (broken in) • Headlamp, knife, water bottle, daypack, tree stand safety harness (if applicable), rain gear",
  },
  {
    question: "Fishing (Freshwater)",
    answer:
      "Valid NC fishing license • Rod and reel (medium-action spinning combo is fine) • Basic tackle (lures/hooks/weights) • Pliers/line cutters • Polarized sunglasses, hat, sunscreen, water bottle, cooler for catch, rain jacket",
  },
  {
    question: "Dove Hunting",
    answer:
      "Valid NC hunting license with HIP registration • Shotgun (12 or 20 gauge) • Dove loads (#7.5–#8 shot) • Blaze orange (check regs) • Camp chair, water/cooler, bucket or game bag, hat, sunscreen, bug spray",
  },
  {
    question: "General (All Events)",
    answer:
      "Water bottle, sunscreen, bug spray, weather-appropriate clothing, camp chair, positive attitude, willingness to learn",
  },
];

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: generalFaq.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />
      <PageHero
        title="FAQ & Gear Lists"
        subtitle="Everything you need to know before your first event."
        backgroundImage="/images/hero/faq-hero.jpg"
      />

      {/* General FAQ */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mx-auto max-w-[800px]">
            <LabelTag>Common Questions</LabelTag>
            <h2 className="mb-10 mt-5 text-[48px] leading-none text-near-black">
              General FAQ
            </h2>
            <Accordion items={generalFaq} />
          </div>
        </SectionContainer>
      </section>

      {/* Gear Lists */}
      <section id="gear-lists" className="bg-warm-gray py-20">
        <SectionContainer>
          <div className="mx-auto max-w-[800px]">
            <LabelTag>Be Prepared</LabelTag>
            <h2 className="mb-10 mt-5 text-[48px] leading-none text-near-black">
              Gear Lists
            </h2>
            <Accordion items={gearLists} />
          </div>
        </SectionContainer>
      </section>

      {/* CTA */}
      <section className="bg-dark-green px-6 py-24 text-center">
        <h2 className="mb-4 text-[48px] leading-none text-white">
          Still Have Questions?
        </h2>
        <p className="mb-10 text-lg text-white/70">
          Reach out anytime. We&apos;re happy to help.
        </p>
        <Link
          href="/contact"
          className="inline-block rounded bg-gold px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black transition-colors hover:bg-gold/90"
        >
          Contact Us
        </Link>
      </section>
    </>
  );
}
