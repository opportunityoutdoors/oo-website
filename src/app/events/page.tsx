import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import NewsletterSection from "@/components/ui/NewsletterSection";
import EventsGrid from "./EventsGrid";
import { client } from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";
import { allEventsQuery, allGalleryImagesQuery } from "@/lib/queries";
import type { Event, SanityImage } from "@/types";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Browse upcoming Opportunity Outdoors events including hunting camps, fishing camps, community cookouts, range days, and workshops across North Carolina.",
};

export const revalidate = 300; // 5 min ISR fallback

interface GalleryImage {
  _id: string;
  image: SanityImage;
  event?: string;
}

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

export default async function EventsPage() {
  let events: Event[] = [];
  let galleryImages: GalleryImage[] = [];
  try {
    [events, galleryImages] = await Promise.all([
      client.fetch(allEventsQuery),
      client.fetch(allGalleryImagesQuery),
    ]);
  } catch {
    // Sanity not available
  }

  const displayImages = shuffleAndPick(galleryImages, 6);

  return (
    <>
      <PageHero
        title="Get in the Field"
        label="Events"
        subtitle="From multi-day camps to casual community meetups, find your next opportunity to connect, learn, and grow."
        backgroundImage="/images/hero/events-hero.webp"
      />

      {/* Events Grid */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-10">
            <LabelTag>Upcoming</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Calendar
            </h2>
          </div>
          <EventsGrid events={events} />
        </SectionContainer>
      </section>

      {/* What to Expect */}
      <section className="relative bg-dark-green py-20">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gold" />
        <SectionContainer>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <LabelTag variant="warm-gold">Camp Life</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-white">
                What to Expect
                <br />
                at a Camp
              </h2>
              <p className="mt-6 text-[15px] leading-relaxed text-white/70">
                Our camps are multi-day immersive experiences. You&apos;ll be
                paired with a mentor, learn skills in the field, and become part of
                a community that sticks around long after the weekend ends.
              </p>
              <ul className="mt-8 space-y-4">
                {[
                  "Small-group mentorship in the field",
                  "Safety briefings and scouting discussions",
                  "Evening campfire Q&A and wild game potluck",
                  "All experience levels welcome",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 text-base text-white/80"
                  >
                    <span className="text-gold">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/hero/origin-story.jpg"
                alt="Camp experience"
                width={600}
                height={450}
                className="h-full w-full object-cover"
              />
            </div>
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
            {displayImages.length > 0 ? (
              displayImages.map((img) => (
                <div
                  key={img._id}
                  className="aspect-square overflow-hidden rounded-lg bg-near-black/10"
                >
                  <Image
                    src={urlFor(img.image).width(600).height(600).url()}
                    alt={img.image?.alt || img.event || "In the field"}
                    width={600}
                    height={600}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg bg-near-black/10"
                >
                  <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                    Photo {i + 1}
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionContainer>
      </section>

      {/* Newsletter */}
      <NewsletterSection />
    </>
  );
}
