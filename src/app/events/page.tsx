import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import NewsletterSection from "@/components/ui/NewsletterSection";
import EventsGrid from "./EventsGrid";
import PartnerEventsGrid from "./PartnerEventsGrid";
import { getApprovedPartnerEvents } from "@/lib/partner-events/public";
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

interface GalleryBatch {
  _id: string;
  images: SanityImage[];
}

function shuffleAndPick<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Past events stay visible for six months, then drop off the page. */
const PAST_WINDOW_MONTHS = 6;

/**
 * Split our own events by date rather than by the `status` field.
 *
 * Status is set by hand in Sanity and drifts: an event that finished in April is still
 * marked "waitlist-closed" today, which is why past camps were showing up as though they
 * were still coming. The calendar is the one thing that cannot be forgotten to update.
 */
function splitByDate(events: Event[]) {
  const now = Date.now();
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - PAST_WINDOW_MONTHS);

  const upcoming: Event[] = [];
  const past: Event[] = [];

  for (const event of events) {
    // Multi-day events count as upcoming until their last day is over.
    const endsAt = new Date(event.endDate || event.date).getTime();
    if (Number.isNaN(endsAt)) continue;

    if (endsAt >= now) upcoming.push(event);
    else if (endsAt >= cutoff.getTime()) past.push(event);
  }

  upcoming.sort((a, b) => +new Date(a.date) - +new Date(b.date));
  // Most recent first, so the last thing that happened is at the top.
  past.sort((a, b) => +new Date(b.date) - +new Date(a.date));

  return { upcoming, past };
}

export default async function EventsPage() {
  let events: Event[] = [];
  let galleryBatches: GalleryBatch[] = [];
  try {
    [events, galleryBatches] = await Promise.all([
      client.fetch(allEventsQuery),
      client.fetch(allGalleryImagesQuery),
    ]);
  } catch {
    // Sanity not available
  }

  const { upcoming, past } = splitByDate(events);
  const partnerEvents = await getApprovedPartnerEvents();

  // Flatten all batches into one pool of images
  const allImages = galleryBatches.flatMap((batch) => batch.images || []);
  const displayImages = shuffleAndPick(allImages, 6);

  return (
    <>
      <PageHero
        title="Get in the Field"
        subtitle="From multi-day camps to casual community meetups, find your next opportunity to connect, learn, and grow."
        backgroundImage="/images/hero/events-hero.webp"
      />

      {/* Upcoming: our own events, still to come */}
      <section id="upcoming" className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-10">
            <LabelTag>Upcoming</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Our Events
            </h2>
          </div>
          <EventsGrid events={upcoming} />
        </SectionContainer>
      </section>

      {/* Partner Events: approved in the admin queue, run by other organizations */}
      <section id="partner-events" className="bg-warm-gray py-20">
        <SectionContainer>
          <div className="mb-4">
            <LabelTag>Partner Events</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Around North Carolina
            </h2>
          </div>
          <p className="mb-10 max-w-[640px] text-[15px] leading-relaxed text-near-black/60">
            Events run by other conservation and outdoors organizations across
            the state. These are not Opportunity Outdoors events, so register
            through the organizer.
          </p>
          <PartnerEventsGrid events={partnerEvents} />
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

      {/* Past: our events from the last six months */}
      {past.length > 0 && (
        <section id="past" className="bg-cream py-20">
          <SectionContainer>
            <div className="mb-10">
              <LabelTag>Past</LabelTag>
              <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                Recently Out There
              </h2>
              <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-near-black/60">
                What we have run over the last six months.
              </p>
            </div>
            <EventsGrid events={past} variant="past" />
          </SectionContainer>
        </section>
      )}

      {/* Photo gallery */}
      <section className="bg-warm-gray py-20">
        <SectionContainer>
          <div className="mb-10 text-center">
            <LabelTag>Gallery</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              In the Field
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {displayImages.length > 0 ? (
              displayImages.map((img, i) => (
                <div
                  key={i}
                  className="aspect-square overflow-hidden rounded-lg bg-near-black/10"
                >
                  <Image
                    src={urlFor(img).width(600).height(600).url()}
                    alt={img.alt || "In the field"}
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
