import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import Accordion from "@/components/ui/Accordion";
import CTABanner from "@/components/ui/CTABanner";
import JsonLd from "@/components/ui/JsonLd";
import EventRegistration from "./EventRegistration";
import PortableTextRenderer from "@/components/ui/PortableTextRenderer";
import { client, urlFor } from "@/lib/sanity";
import { eventBySlugQuery } from "@/lib/queries";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await client.fetch(eventBySlugQuery, { slug });
  if (!event) return { title: "Event Not Found" };

  return {
    title: event.title,
    description: event.description,
    openGraph: {
      title: event.title,
      description: event.description,
      type: "website",
    },
  };
}

function formatEventDate(date: string, endDate?: string): string {
  const start = new Date(date);
  const opts: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    year: "numeric",
  };
  if (endDate) {
    const end = new Date(endDate);
    if (start.getMonth() === end.getMonth()) {
      return `${start.toLocaleDateString("en-US", { month: "long" })} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
  }
  return start.toLocaleDateString("en-US", opts);
}

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "hunt-camp": return "Hunt Camp";
    case "fish-camp": return "Fish Camp";
    case "community": return "Community";
    case "workshop": return "Workshop";
    default: return eventType;
  }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await client.fetch(eventBySlugQuery, { slug });

  if (!event) notFound();

  const isCamp = event.eventType === "hunt-camp" || event.eventType === "fish-camp";

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.title,
          description: event.description,
          startDate: event.date,
          ...(event.endDate && { endDate: event.endDate }),
          location: {
            "@type": "Place",
            name: event.location,
            address: event.location,
          },
          organizer: {
            "@type": "Organization",
            name: "Opportunity Outdoors",
            url: "https://opportunityoutdoors.org",
          },
          ...(event.cost && {
            offers: {
              "@type": "Offer",
              price: event.cost === "Free" ? "0" : event.cost.replace(/[^0-9.]/g, ""),
              priceCurrency: "USD",
              availability:
                event.spotsRemaining === 0
                  ? "https://schema.org/SoldOut"
                  : "https://schema.org/InStock",
            },
          }),
        }}
      />
      {/* Hero */}
      <section className="relative flex min-h-[450px] items-end overflow-hidden bg-dark-green">
        {event.image ? (
          <>
            <Image
              src={urlFor(event.image).width(1920).quality(80).url()}
              alt={event.image.alt || event.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />
        )}
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-32 md:px-10">
          <Link
            href="/events"
            className="mb-6 inline-flex items-center text-sm font-medium text-white/60 transition-colors hover:text-white"
          >
            &larr; Back to Events
          </Link>
          <div>
            <span className="mb-3 inline-block rounded bg-gold/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-near-black">
              {getEventTypeLabel(event.eventType)}
            </span>
          </div>
          <h1 className="text-5xl leading-tight tracking-tight text-white md:text-7xl">
            {event.title}
          </h1>
          <p className="mt-3 text-lg text-white/70">
            {formatEventDate(event.date, event.endDate)}
          </p>
        </div>
      </section>

      {/* Overview Card */}
      <section className="bg-cream py-16">
        <SectionContainer>
          <div className="grid items-start gap-10 lg:grid-cols-3">
            {/* Details sidebar */}
            <div className="lg:sticky lg:top-8 lg:col-span-1">
              <div className="rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-xl font-extrabold text-near-black">
                  Event Details
                </h2>
                <dl className="space-y-4">
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                      Date
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-near-black">
                      {formatEventDate(event.date, event.endDate)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                      Location
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-near-black">
                      {event.location}
                    </dd>
                  </div>
                  {event.experienceLevel && (
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                        Experience
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-near-black">
                        {event.experienceLevel}
                      </dd>
                    </div>
                  )}
                  {event.cost && (
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                        Cost
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-near-black">
                        {event.cost}
                      </dd>
                    </div>
                  )}
                  {event.spotsTotal && (
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                        Availability
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-near-black">
                        {event.spotsRemaining ?? event.spotsTotal} of{" "}
                        {event.spotsTotal} spots available
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Description + Registration */}
            <div className="lg:col-span-2">
              {event.description && (
                <p className="mb-6 text-[15px] leading-relaxed text-near-black/70">
                  {event.description}
                </p>
              )}
              {event.body && event.body.length > 0 && (
                <div className="prose prose-lg mb-8 max-w-none text-near-black/80">
                  <PortableTextRenderer value={event.body as any} />
                </div>
              )}

              {/* Registration / Waitlist section */}
              <div className="mt-10">
                <EventRegistration event={event} />
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* Schedule */}
      {event.schedule && event.schedule.length > 0 && (
        <section className="bg-white py-20">
          <SectionContainer>
            <LabelTag>Schedule</LabelTag>
            <h2 className="mt-5 mb-10 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              What to Expect
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {event.schedule.map(
                (day: { day: string; items: { time: string; activity: string }[] }) => (
                  <div key={day.day}>
                    <h3 className="mb-4 text-lg font-extrabold text-near-black">
                      {day.day}
                    </h3>
                    <ul className="space-y-3">
                      {day.items.map(
                        (item: { time: string; activity: string }, i: number) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="shrink-0 font-semibold text-gold">
                              {item.time}
                            </span>
                            <span className="text-near-black/70">
                              {item.activity}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )
              )}
            </div>
          </SectionContainer>
        </section>
      )}

      {/* Gear List */}
      {event.gearList && (
        <section className="bg-cream py-20">
          <SectionContainer>
            <LabelTag>Gear</LabelTag>
            <h2 className="mt-5 mb-10 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              What to Bring
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {event.gearList.required?.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-extrabold text-near-black">
                    Required
                  </h3>
                  <ul className="space-y-2">
                    {event.gearList.required.map((item: string) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-near-black/70"
                      >
                        <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-dark-green" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {event.gearList.recommended?.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-extrabold text-near-black">
                    Recommended
                  </h3>
                  <ul className="space-y-2">
                    {event.gearList.recommended.map((item: string) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-near-black/70"
                      >
                        <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {event.gearList.provided?.length > 0 && (
                <div>
                  <h3 className="mb-4 text-lg font-extrabold text-near-black">
                    Provided by OO
                  </h3>
                  <ul className="space-y-2">
                    {event.gearList.provided.map((item: string) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-sm text-near-black/70"
                      >
                        <span className="mt-1.5 block h-1.5 w-1.5 shrink-0 rounded-full bg-near-black/30" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </SectionContainer>
        </section>
      )}

      {/* FAQ */}
      {event.faq && event.faq.length > 0 && (
        <section className="bg-white py-20">
          <SectionContainer>
            <div className="mx-auto max-w-3xl">
              <div className="mb-10 text-center">
                <LabelTag>FAQ</LabelTag>
                <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
                  Questions About This Event
                </h2>
              </div>
              <Accordion items={event.faq} />
            </div>
          </SectionContainer>
        </section>
      )}

      {/* CTA */}
      <CTABanner
        heading="Still Have Questions?"
        text="We're happy to help. Reach out and a board member will get back to you within 48 hours."
        primaryLabel="Contact Us"
        primaryHref="/contact"
      />
    </>
  );
}
