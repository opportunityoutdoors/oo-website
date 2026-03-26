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
      "Community events are free. Camps have a small registration fee ($75–$100).",
  },
  {
    question: "Where are events held?",
    answer:
      "Across NC — mountains, piedmont, and coast. Most community events are in the Triangle (Raleigh-Durham-Chapel Hill area), but we also hold camps and events statewide.",
  },
  {
    question: "How do I sign up?",
    answer:
      'Head to our <a href="/get-involved" class="font-semibold text-dark-green underline">Get Involved</a> page and fill out the mentee or mentor form. You can also reach us directly at <a href="mailto:info@opportunityoutdoors.org" class="font-semibold text-dark-green underline">info@opportunityoutdoors.org</a> with any questions.',
  },
  {
    question: "Do I need my own gear?",
    answer:
      "It depends on the event. See the gear lists below for activity-specific requirements and recommendations. If you're missing anything or need help, reach out and we can help guide you in the right direction.",
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
    answer: `<ul class="list-disc pl-5 space-y-1">
<li>Valid NC hunting license with turkey privileges</li>
<li>Shotgun or bow</li>
<li>Turkey loads (#4–#6 shot) if using shotgun</li>
<li>Full camo (head to toe including face mask and gloves)</li>
<li>Blaze orange (optional but recommended for travel)</li>
<li>Turkey calls (bring your own if you have them)</li>
<li>Decoys (optional)</li>
<li>Boots (broken in)</li>
<li>Headlamp, knife, water bottle, daypack, bug spray, rain gear</li>
<li>Camping gear (see below)</li>
</ul>`,
  },
  {
    question: "Deer Hunting",
    answer: `<ul class="list-disc pl-5 space-y-1">
<li>Valid NC hunting license</li>
<li>Rifle or bow with appropriate ammo</li>
<li>Blaze orange vest and hat (required during any open firearm season, regardless of your method of take)</li>
<li>Warm layered clothing</li>
<li>Boots (broken in)</li>
<li>Headlamp, knife, water bottle, daypack</li>
<li>Tree stand safety harness (if applicable)</li>
<li>Rain gear</li>
<li>Camping gear (see below)</li>
</ul>`,
  },
  {
    question: "Fishing (Freshwater)",
    answer: `<ul class="list-disc pl-5 space-y-1">
<li>Valid NC fishing license</li>
<li>Rod and reel (medium-action spinning combo is fine)</li>
<li>Basic tackle (lures/hooks/weights)</li>
<li>Pliers/line cutters</li>
<li>Polarized sunglasses, hat, sunscreen</li>
<li>Water bottle, cooler for catch, rain jacket</li>
</ul>`,
  },
  {
    question: "Dove Hunting",
    answer: `<ul class="list-disc pl-5 space-y-1">
<li>Valid NC hunting license with HIP registration</li>
<li>Shotgun (12 or 20 gauge)</li>
<li>Dove loads (#7.5–#8 shot)</li>
<li>Blaze orange (check regs)</li>
<li>Camp chair, water/cooler, bucket or game bag</li>
<li>Hat, sunscreen, bug spray</li>
</ul>`,
  },
  {
    question: "Camping Gear",
    answer: `<ul class="list-disc pl-5 space-y-1">
<li>Tent or hammock</li>
<li>Sleeping bag</li>
<li>Sleeping pad</li>
<li>Cooler</li>
<li>Tarp</li>
<li>Camp chair</li>
<li>Firewood</li>
<li>Food and water</li>
<li>Headlamp or flashlight</li>
</ul>`,
  },
  {
    question: "General (All Events)",
    answer: `<ul class="list-disc pl-5 space-y-1">
<li>Water bottle</li>
<li>Sunscreen</li>
<li>Bug spray</li>
<li>Weather-appropriate clothing</li>
<li>Camp chair</li>
<li>Positive attitude and willingness to learn</li>
</ul>
<p class="mt-3 text-sm italic">If you're missing anything or need help with gear, reach out to us at <a href="mailto:info@opportunityoutdoors.org" class="font-semibold text-dark-green underline">info@opportunityoutdoors.org</a> and we can help guide you in the right direction.</p>`,
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
        label="Resources"
        subtitle="Everything you need to know before your first event."
        backgroundImage="/images/hero/faq-hero.jpg"
        imagePosition="center 65%"
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
