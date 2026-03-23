import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import NewsletterSection from "@/components/ui/NewsletterSection";
import EventsGrid from "./EventsGrid";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse upcoming Opportunity Outdoors events — hunting camps, fishing camps, community cookouts, range days, and workshops across North Carolina.",
};

export const revalidate = 300; // 5 min ISR fallback

export default function EventsPage() {
  // TODO: Fetch events from Sanity once content is populated
  // const events = await client.fetch(allEventsQuery);

  return (
    <>
      <PageHero
        title="Events"
        subtitle="Get in the field. Find a camp, community event, or workshop near you."
      />

      {/* Events Grid with Filter Tabs */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <EventsGrid />
        </SectionContainer>
      </section>

      {/* What to Expect */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <LabelTag>What to Expect</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              What Happens at a Camp
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-near-black/60">
              Our camps are 2-3 day immersive experiences where you&apos;re
              paired with an experienced mentor. You&apos;ll learn safety,
              ethics, and skills in the field — not a classroom. Meals, lodging,
              and most gear are provided. All you need to bring is a willingness
              to learn and respect for the outdoors.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Day 1 — Arrive & Settle In",
                desc: "Meet your mentor, tour the camp, get your gear squared away. Evening orientation and group dinner.",
              },
              {
                title: "Day 2 — In the Field",
                desc: "Full day with your mentor. Hands-on learning — scouting, calling, shooting, fishing, or whatever the camp focuses on.",
              },
              {
                title: "Day 3 — Wrap Up & Reflect",
                desc: "Morning session, field dressing / processing instruction, group debrief, and next-steps planning.",
              },
            ].map((day) => (
              <div
                key={day.title}
                className="rounded-lg border border-near-black/10 p-6"
              >
                <h3 className="text-lg font-extrabold text-near-black">
                  {day.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-near-black/60">
                  {day.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Past Events Gallery */}
      <section className="bg-warm-gray py-20">
        <SectionContainer>
          <div className="mb-10 text-center">
            <LabelTag>Past Events</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              In the Field
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square overflow-hidden rounded-lg bg-near-black/10"
              >
                <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                  Photo {i + 1}
                </div>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Newsletter */}
      <NewsletterSection />
    </>
  );
}
