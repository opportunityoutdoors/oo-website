import type { Metadata } from "next";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import Accordion from "@/components/ui/Accordion";
import CTABanner from "@/components/ui/CTABanner";
import JsonLd from "@/components/ui/JsonLd";
import EventRegistration from "./EventRegistration";

// TODO: Fetch from Sanity once content is populated
// import { client } from "@/lib/sanity";
// import { eventBySlugQuery, allEventsQuery } from "@/lib/queries";

export const revalidate = 300;

// Placeholder event data for development
const placeholderEvents: Record<string, any> = {
  "turkey-camp-2026": {
    _id: "1",
    title: "Turkey Camp 2026",
    slug: { current: "turkey-camp-2026" },
    eventType: "hunt-camp",
    status: "waitlist-open",
    date: "2026-04-17T00:00:00Z",
    endDate: "2026-04-19T00:00:00Z",
    location: "Nantahala National Forest, NC",
    experienceLevel: "All levels welcome",
    cost: "$75",
    spotsTotal: 20,
    spotsRemaining: 12,
    description:
      "Join us for a 3-day turkey hunting camp in the mountains of western North Carolina. Mentees are paired with experienced mentors for hands-on instruction in calling, scouting, safety, and field skills.",
    waitlistOpens: "2026-03-01T00:00:00Z",
    waitlistCloses: "2026-04-01T00:00:00Z",
    meetingSlots: [
      { label: "Saturday, March 22 @ 7pm ET", date: "2026-03-22T19:00:00Z" },
      { label: "Wednesday, March 26 @ 8pm ET", date: "2026-03-26T20:00:00Z" },
    ],
    schedule: [
      {
        day: "Day 1 — Thursday",
        items: [
          { time: "3:00 PM", activity: "Arrive & check in" },
          { time: "4:00 PM", activity: "Gear check & safety briefing" },
          { time: "5:30 PM", activity: "Scouting trip & calling practice" },
          { time: "7:00 PM", activity: "Group dinner & evening session" },
        ],
      },
      {
        day: "Day 2 — Friday",
        items: [
          { time: "4:30 AM", activity: "Wake up & head to the woods" },
          { time: "5:00 AM – 11:00 AM", activity: "Morning hunt with mentor" },
          { time: "12:00 PM", activity: "Lunch & debrief" },
          { time: "2:00 PM", activity: "Afternoon skills session" },
          { time: "5:00 PM", activity: "Evening hunt" },
          { time: "7:30 PM", activity: "Group dinner & campfire" },
        ],
      },
      {
        day: "Day 3 — Saturday",
        items: [
          { time: "4:30 AM", activity: "Final morning hunt" },
          { time: "11:00 AM", activity: "Field dressing & processing instruction" },
          { time: "1:00 PM", activity: "Group debrief & wrap up" },
          { time: "2:00 PM", activity: "Depart" },
        ],
      },
    ],
    gearList: {
      required: [
        "Hunter safety certification (or willingness to get certified)",
        "Valid NC hunting license with turkey stamp",
        "Camouflage clothing (head to toe)",
        "Sturdy boots",
        "Headlamp or flashlight",
      ],
      recommended: [
        "Turkey calls (if you have them — we'll provide if not)",
        "Binoculars",
        "Camp chair or stool",
        "Rain gear",
      ],
      provided: [
        "Shotgun and ammunition (if needed)",
        "Turkey decoys",
        "All meals and snacks",
        "Camping/lodging",
      ],
    },
    faq: [
      {
        question: "Do I need hunting experience?",
        answer:
          "No! This camp is designed for all experience levels. You'll be paired with a mentor who will guide you through everything.",
      },
      {
        question: "What if I don't have a hunting license?",
        answer:
          "We'll help you get one. NC licenses can be purchased online. Your mentor can walk you through the process before camp.",
      },
      {
        question: "Is the camp location disclosed before registration?",
        answer:
          "The general area (Nantahala National Forest) is public info. The exact camp location is shared only after full registration, background check clearance, and payment.",
      },
      {
        question: "What's the cost?",
        answer:
          "$75 per mentee covers all meals, lodging, and supplies. Mentors attend free of charge. Scholarships are available — cost should never be a barrier.",
      },
      {
        question: "Do I need to bring a gun?",
        answer:
          "No. We have loaner shotguns available for mentees who don't have their own. Let us know on the registration form.",
      },
      {
        question: "What about the background check?",
        answer:
          "All camp participants (mentees and mentors) undergo a background check as part of the registration process. This is for the safety of all participants.",
      },
    ],
  },
  "fishing-camp-2026": {
    _id: "2",
    title: "Fishing Camp 2026",
    slug: { current: "fishing-camp-2026" },
    eventType: "fish-camp",
    status: "draft",
    date: "2026-06-15T00:00:00Z",
    endDate: "2026-06-17T00:00:00Z",
    location: "Location TBD",
    experienceLevel: "All levels welcome",
    cost: "$75",
    description: "Weekend fishing camp — freshwater and fly fishing instruction with experienced mentors. Details coming soon.",
  },
  "spring-cookout-2026": {
    _id: "3",
    title: "Spring Cookout & Range Day",
    slug: { current: "spring-cookout-2026" },
    eventType: "community",
    status: "registration-open",
    date: "2026-05-03T00:00:00Z",
    location: "Raleigh, NC",
    experienceLevel: "All levels welcome",
    cost: "Free",
    spotsTotal: 50,
    spotsRemaining: 35,
    description: "Casual cookout and range day. Great way to meet the OO community. Bring a friend, bring an appetite. No firearms experience needed — instruction provided on the range.",
    registrationOpens: "2026-03-15T00:00:00Z",
  },
  "intro-archery-2026": {
    _id: "4",
    title: "Intro to Archery Workshop",
    slug: { current: "intro-archery-2026" },
    eventType: "workshop",
    status: "registration-open",
    date: "2026-05-17T00:00:00Z",
    location: "Durham, NC",
    experienceLevel: "No experience needed",
    cost: "Free",
    spotsTotal: 15,
    spotsRemaining: 8,
    description: "Half-day archery fundamentals workshop. Learn proper form, safety, and basic technique. All equipment provided.",
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = placeholderEvents[slug];
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
  const event = placeholderEvents[slug];

  if (!event) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-cream">
        <div className="text-center">
          <h1 className="text-4xl font-black text-near-black">Event Not Found</h1>
          <p className="mt-3 text-near-black/50">This event doesn&apos;t exist or has been removed.</p>
          <Link
            href="/events"
            className="mt-6 inline-block rounded bg-dark-green px-7 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white"
          >
            View All Events
          </Link>
        </div>
      </div>
    );
  }

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
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-32 md:px-10">
          <span className="mb-3 inline-block rounded bg-gold/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-near-black">
            {getEventTypeLabel(event.eventType)}
          </span>
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
          <div className="grid gap-10 lg:grid-cols-3">
            {/* Details sidebar */}
            <div className="lg:col-span-1">
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
              <p className="text-[15px] leading-relaxed text-near-black/70">
                {event.description}
              </p>

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
