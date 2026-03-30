import Image from "next/image";
import Link from "next/link";
import LabelTag from "@/components/ui/LabelTag";
import SectionContainer from "@/components/ui/SectionContainer";
import NewsletterSection from "@/components/ui/NewsletterSection";
import PartnerLogos from "@/components/ui/PartnerLogos";
import { client, urlFor } from "@/lib/sanity";
import { featuredEventsQuery } from "@/lib/queries";
import type { Event } from "@/types";

export const revalidate = 300;

function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case "hunt-camp": return "Hunt Camp";
    case "fish-camp": return "Fish Camp";
    case "community": return "Community";
    case "workshop": return "Workshop";
    default: return eventType;
  }
}

const whatWeDo = [
  {
    title: "Immersive Camps",
    desc: "Multi-day turkey, fishing, dove, and deer camps. Hands-on mentorship from scouting to harvest.",
    image: "/images/hero/about-hero.webp",
  },
  {
    title: "Community & Connection",
    desc: "Cookouts, range days, video calls and meetups. Low-barrier ways to connect before you ever step in the field.",
    image: "/images/hero/podcast-hero.webp",
  },
  {
    title: "Conservation First",
    desc: "Stewardship is the cost of entry. We develop people who care about the land as much as the hunt.",
    image: "/images/hero/faq-hero.jpg",
  },
];

const ladderSteps = [
  {
    num: "01",
    title: "Discover",
    desc: "Find us through the podcast, social media, or a friend. Start learning what OO is about.",
  },
  {
    num: "02",
    title: "Connect",
    desc: "Join a video call, show up to a cookout or range day. Meet the community.",
  },
  {
    num: "03",
    title: "Experience",
    desc: "Attend a camp. Get in the field with a mentor. Learn skills, ethics, and stewardship.",
  },
  {
    num: "04",
    title: "Grow",
    desc: "Deepen your skills across seasons. Turkey, fishing, dove, deer. Build lasting relationships.",
  },
  {
    num: "05",
    title: "Give Back",
    desc: "Become a mentor yourself. Lead at camps. Help the next person take their first steps.",
  },
];

export default async function Home() {
  let featuredEvents: Event[] = [];
  try {
    featuredEvents = await client.fetch(featuredEventsQuery);
  } catch {
    // Sanity not available
  }
  return (
    <>
      {/* ══════ HERO ══════ */}
      <section className="relative flex min-h-screen max-h-[900px] items-end overflow-hidden bg-dark-green">
        <Image
          src="/images/hero/homepage-hero.webp"
          alt="Mountain vista at sunrise"
          fill
          className="object-cover object-[center_30%]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/10 to-black/65" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-20 md:px-10">
          <h1 className="max-w-[700px] text-[clamp(3rem,8vw,86px)] leading-[0.95] tracking-[-0.01em] text-white">
            From First Hunt to Lifelong Steward
          </h1>
          <p className="mt-5 max-w-[520px] text-lg leading-relaxed text-white/85">
            We mentor new hunters and anglers through immersive camps, community
            events, and long-term relationships, building conservation-minded
            sportsmen and women across North Carolina.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/get-involved"
              className="inline-block rounded bg-white px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black transition-colors hover:bg-cream"
            >
              Get Involved
            </Link>
            <Link
              href="/about"
              className="inline-block rounded border-2 border-white/50 px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:border-white"
            >
              Our Story
            </Link>
          </div>
        </div>
      </section>

      {/* ══════ WHAT WE DO ══════ */}
      <section className="bg-cream py-24">
        <SectionContainer>
          <div className="mb-16">
            <LabelTag>What We Do</LabelTag>
            <h2 className="mb-4 mt-5 text-[clamp(2.5rem,5vw,56px)] leading-none text-near-black">
              Mentorship Is the Mission
            </h2>
            <p className="max-w-[580px] text-[17px] leading-relaxed text-near-black/50">
              Other orgs conserve the land. We develop the people. Through
              camps, events, and year-round community, we build ethical hunters
              &amp; anglers who give back to the wild places that made them.
            </p>
          </div>
        </SectionContainer>
        <div className="grid md:grid-cols-3">
          {whatWeDo.map((item) => (
            <div
              key={item.title}
              className="group relative h-[400px] overflow-hidden bg-dark-green"
            >
              <Image
                src={item.image}
                alt={item.title}
                fill
                className="object-cover transition-transform duration-400 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
                <h3 className="mb-2 text-[30px] font-extrabold leading-tight text-white">
                  {item.title}
                </h3>
                <p className="text-sm leading-relaxed text-white/75">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ MENTORSHIP LADDER ══════ */}
      <section className="relative overflow-hidden bg-dark-green py-24">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gold" />
        <SectionContainer>
          <LabelTag variant="warm-gold">The Mentorship Ladder</LabelTag>
          <h2 className="mb-16 mt-5 text-[clamp(2.5rem,5vw,56px)] leading-none text-white">
            Your Path Forward
          </h2>
          <div className="grid gap-0 md:grid-cols-5">
            {ladderSteps.map((step, i) => (
              <div
                key={step.num}
                className={`px-6 py-6 md:py-0 ${
                  i > 0 ? "border-t border-white/15 md:border-l md:border-t-0" : ""
                }`}
              >
                <span className="font-heading text-[64px] font-black leading-none text-white/10">
                  {step.num}
                </span>
                <h4 className="mb-2 mt-3 text-2xl font-extrabold text-white">
                  {step.title}
                </h4>
                <p className="text-sm leading-relaxed text-white/60">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* ══════ UPCOMING EVENTS ══════ */}
      <section className="bg-cream py-24">
        <SectionContainer>
          <div className="mb-12 flex items-end justify-between">
            <div>
              <LabelTag>Upcoming</LabelTag>
              <h2 className="mt-5 text-[clamp(2.5rem,5vw,56px)] leading-none text-near-black">
                Get in the Field
              </h2>
            </div>
            <Link
              href="/events"
              className="hidden text-sm font-semibold uppercase tracking-[1px] text-gold transition-colors hover:text-[#8B6914] sm:block"
            >
              View All Events &rarr;
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {featuredEvents.length > 0 ? (
              featuredEvents.map((event) => {
                const dateObj = new Date(event.date);
                const month = dateObj.toLocaleString("en-US", { month: "short" }).toUpperCase();
                const day = dateObj.getDate();
                return (
                  <Link
                    key={event._id}
                    href={`/events/${event.slug.current}`}
                    className="group relative h-[350px] overflow-hidden rounded-lg bg-dark-green"
                  >
                    {event.image ? (
                      <Image
                        src={urlFor(event.image).width(800).height(500).fit("crop").url()}
                        alt={event.image.alt || event.title}
                        fill
                        className="object-cover transition-transform duration-400 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-dark-green transition-transform duration-400 group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-6 left-6 z-10 text-center">
                      <span className="block text-xs font-bold uppercase tracking-wider text-white/60">
                        {month}
                      </span>
                      <span className="block text-3xl font-black text-white">
                        {day}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
                      <span className="mb-2 inline-block rounded bg-gold/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
                        {getEventTypeLabel(event.eventType)}
                      </span>
                      <h3 className="text-2xl font-extrabold text-white">
                        {event.title}
                      </h3>
                      <p className="mt-1 text-sm text-white/60">
                        {event.location}
                        {event.cost && ` · ${event.cost}`}
                      </p>
                    </div>
                  </Link>
                );
              })
            ) : (
              <p className="col-span-2 py-10 text-center text-near-black/40">
                Events coming soon. Check back!
              </p>
            )}
          </div>
          <Link
            href="/events"
            className="mt-8 block text-center text-sm font-semibold uppercase tracking-[1px] text-gold transition-colors hover:text-[#8B6914] sm:hidden"
          >
            View All Events &rarr;
          </Link>
        </SectionContainer>
      </section>

      {/* ══════ QUOTE ══════ */}
      <section className="relative flex items-center justify-center overflow-hidden bg-dark-green py-[120px]">
        <Image
          src="/images/hero/testimonial-bg.jpg"
          alt=""
          fill
          className="object-cover"
          style={{ backgroundAttachment: "fixed" }}
        />
        <div className="absolute inset-0 bg-near-black/75" />
        <div className="relative z-10 mx-auto max-w-[900px] px-10 text-center">
          <blockquote className="font-heading text-[clamp(2rem,5vw,52px)] font-[800] uppercase leading-[1.1] text-white">
            &ldquo;The hunting buddies you{" "}
            <em className="not-italic text-[#C4941A]">
              didn&apos;t grow up with
            </em>{" "}
            but wish you had.&rdquo;
          </blockquote>
          <cite className="mt-6 block text-sm not-italic uppercase tracking-[2px] text-white/50">
            – The OO Community
          </cite>
        </div>
      </section>

      {/* ══════ GET INVOLVED ══════ */}
      <section className="bg-cream py-24">
        <SectionContainer>
          <div className="mb-10 text-center">
            <LabelTag>Get Involved</LabelTag>
            <h2 className="mt-5 text-[clamp(2.5rem,5vw,56px)] leading-none text-near-black">
              Where Do You Fit?
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Mentee Card */}
            <div className="group relative h-[450px] overflow-hidden rounded-lg bg-dark-green">
              <Image
                src="/images/hero/archery-mentoring.webp"
                alt="Mentee learning archery"
                fill
                className="object-cover transition-transform duration-400 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-10">
                <h3 className="mb-3 text-[36px] font-extrabold leading-tight text-white">
                  I Want to
                  <br />
                  Learn
                </h3>
                <p className="mb-6 max-w-[300px] text-sm leading-relaxed text-white/70">
                  New to hunting or fishing? We&apos;ll walk alongside you from
                  day one. No experience necessary.
                </p>
                <Link
                  href="/signup?path=mentee"
                  className="inline-block rounded bg-gold px-7 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black transition-colors hover:bg-gold/90"
                >
                  Become a Mentee
                </Link>
              </div>
            </div>
            {/* Mentor Card */}
            <div className="group relative h-[450px] overflow-hidden rounded-lg bg-dark-green">
              <Image
                src="/images/hero/shooting-range.webp"
                alt="Mentor teaching at the range"
                fill
                className="object-cover object-left transition-transform duration-400 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 z-10 p-10">
                <h3 className="mb-3 text-[36px] font-extrabold leading-tight text-white">
                  I Want to
                  <br />
                  Mentor
                </h3>
                <p className="mb-6 max-w-[300px] text-sm leading-relaxed text-white/70">
                  Someone walked alongside you once. Now it&apos;s your turn to
                  invest in the next generation.
                </p>
                <Link
                  href="/signup?path=mentor"
                  className="inline-block rounded border-2 border-white px-7 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white transition-colors hover:bg-white/10"
                >
                  Become a Mentor
                </Link>
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* ══════ PODCAST ══════ */}
      <section className="bg-near-black py-24">
        <SectionContainer>
          <div className="mx-auto flex max-w-[700px] flex-col items-center gap-[60px] md:flex-row md:items-center">
            <div className="aspect-square w-full max-w-[220px] shrink-0 overflow-hidden rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
              <Image
                src="/images/podcast-art.jpg"
                alt="Hunt. Fish. Mentor. podcast artwork"
                width={440}
                height={440}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <LabelTag variant="warm-gold">Podcast</LabelTag>
              <h3 className="mb-4 mt-4 text-[42px] font-black leading-none text-white">
                Hunt. Fish.
                <br />
                Mentor.
              </h3>
              <p className="mb-6 max-w-[480px] text-base leading-[1.7] text-white/50">
                NC-centered hunting and fishing conversations. Experienced
                mentors share tips, stories, and the conservation ethic behind
                everything we do.
              </p>
              <Link
                href="/podcast"
                className="inline-block rounded bg-gold px-7 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black transition-colors hover:bg-gold/90"
              >
                Listen Now
              </Link>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* ══════ NEWSLETTER ══════ */}
      <NewsletterSection />

      {/* ══════ PARTNERS ══════ */}
      <PartnerLogos />
    </>
  );
}
