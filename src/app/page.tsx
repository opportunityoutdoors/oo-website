import Image from "next/image";
import Link from "next/link";
import LabelTag from "@/components/ui/LabelTag";
import SectionContainer from "@/components/ui/SectionContainer";
import NewsletterSection from "@/components/ui/NewsletterSection";
import PartnerLogos from "@/components/ui/PartnerLogos";

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

export default function Home() {
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
          <h1 className="max-w-[700px] text-[clamp(3rem,8vw,86px)] leading-[0.95] tracking-tight text-white">
            From First Hunt to Lifelong Steward
          </h1>
          <p className="mt-5 max-w-[520px] text-lg leading-relaxed text-white/85">
            We mentor new hunters and anglers through immersive camps, community
            events, and long-term relationships — building conservation-minded
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
          <LabelTag variant="white">The Mentorship Ladder</LabelTag>
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
                <span className="text-[64px] font-black leading-none text-white/10">
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
            {/* Event Card 1 */}
            <div className="group relative h-[350px] overflow-hidden rounded-lg bg-dark-green">
              <Image
                src="/images/hero/origin-story.jpg"
                alt="Turkey Camp 2026"
                fill
                className="object-cover transition-transform duration-400 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-6 left-6 z-10 text-center">
                <span className="block text-xs font-bold uppercase tracking-wider text-white/60">
                  APR
                </span>
                <span className="block text-3xl font-black text-white">
                  17
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
                <span className="mb-2 inline-block rounded bg-gold/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
                  Camp
                </span>
                <h3 className="text-2xl font-extrabold text-white">
                  Turkey Camp 2026
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Nantahala National Forest, NC — 3 days
                </p>
              </div>
            </div>
            {/* Event Card 2 */}
            <div className="group relative h-[350px] overflow-hidden rounded-lg bg-dark-green">
              <Image
                src="/images/hero/donate-hero.webp"
                alt="Fishing Camp 2026"
                fill
                className="object-cover transition-transform duration-400 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-6 left-6 z-10 text-center">
                <span className="block text-xs font-bold uppercase tracking-wider text-white/60">
                  JUN
                </span>
                <span className="block text-3xl font-black text-white">
                  TBD
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 z-10 p-8">
                <span className="mb-2 inline-block rounded bg-gold/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-near-black">
                  Camp
                </span>
                <h3 className="text-2xl font-extrabold text-white">
                  Fishing Camp 2026
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  Location TBD — Details coming soon
                </p>
              </div>
            </div>
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
      <section className="relative flex min-h-[400px] items-center justify-center overflow-hidden bg-dark-green">
        <Image
          src="/images/hero/testimonial-bg.jpg"
          alt=""
          fill
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 px-6 text-center">
          <blockquote className="text-[clamp(1.5rem,4vw,36px)] font-black italic leading-snug text-white">
            &ldquo;The hunting buddies you{" "}
            <em className="not-italic text-gold">
              didn&apos;t grow up with
            </em>{" "}
            but wish you had.&rdquo;
          </blockquote>
          <cite className="mt-6 block text-sm not-italic tracking-wider text-white/40">
            — The OO Community
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
                src="/images/hero/shooting-range.webp"
                alt="Mentee learning at the range"
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
                src="/images/hero/archery-mentoring.webp"
                alt="Mentor teaching archery"
                fill
                className="object-cover transition-transform duration-400 group-hover:scale-105"
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
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="aspect-square w-full max-w-[280px] shrink-0 overflow-hidden rounded-lg bg-near-black/50">
              {/* Podcast artwork placeholder */}
              <div className="flex h-full items-center justify-center text-sm text-white/30">
                Podcast Art
              </div>
            </div>
            <div>
              <LabelTag variant="white">Podcast</LabelTag>
              <h3 className="mb-4 mt-4 text-[40px] font-black leading-none text-white">
                Hunt. Fish.
                <br />
                Mentor.
              </h3>
              <p className="mb-6 max-w-md text-base leading-relaxed text-white/60">
                NC-centered hunting and fishing conversations. Experienced
                mentors share tips, stories, and the conservation ethic behind
                everything we do.
              </p>
              <div className="flex flex-wrap gap-3">
                {["Apple Podcasts", "Spotify", "YouTube"].map((platform) => (
                  <span
                    key={platform}
                    className="rounded border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white/50"
                  >
                    {platform}
                  </span>
                ))}
              </div>
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
