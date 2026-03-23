import type { Metadata } from "next";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import CTABanner from "@/components/ui/CTABanner";

export const metadata: Metadata = {
  title: "Podcast",
  description:
    "Hunt. Fish. Mentor. — The Opportunity Outdoors podcast. NC-centered conversations about hunting, fishing, conservation, and mentorship.",
};

export const revalidate = 300;

// Placeholder episodes for development
const placeholderEpisodes = [
  {
    _id: "1",
    title: "Why Mentorship Matters More Than Gear",
    episodeNumber: 12,
    publishedAt: "2026-03-10",
    duration: "48 min",
    description:
      "We break down why having a mentor in the field is worth more than any piece of equipment you can buy.",
  },
  {
    _id: "2",
    title: "Turkey Season Prep: What You Need to Know",
    episodeNumber: 11,
    publishedAt: "2026-02-25",
    duration: "42 min",
    description:
      "Spring gobbler season is right around the corner. We cover scouting, calling, and what to expect at your first turkey camp.",
  },
  {
    _id: "3",
    title: "Conservation Is the Cost of Entry",
    episodeNumber: 10,
    publishedAt: "2026-02-10",
    duration: "55 min",
    description:
      "What does it mean to be a conservation-first organization? We talk about stewardship, ethics, and why every hunter has a responsibility.",
  },
  {
    _id: "4",
    title: "From Mentee to Mentor: Andy's Story",
    episodeNumber: 9,
    publishedAt: "2026-01-28",
    duration: "38 min",
    description:
      "Co-founder Andy Tomaszewski shares his journey from a first-time hunter to leading camps and mentoring others.",
  },
  {
    _id: "5",
    title: "Fishing 101: Getting Started on the Water",
    episodeNumber: 8,
    publishedAt: "2026-01-14",
    duration: "44 min",
    description:
      "Everything you need to know to get started fishing in North Carolina — licenses, gear, spots, and etiquette.",
  },
  {
    _id: "6",
    title: "The OO Community: More Than Just Hunting",
    episodeNumber: 7,
    publishedAt: "2025-12-20",
    duration: "51 min",
    description:
      "Cookouts, range days, and lifelong friendships. We talk about what makes the OO community different.",
  },
];

const topicTags = [
  "Hunting",
  "Fishing",
  "Conservation",
  "Mentorship",
  "Gear Tips",
  "Community",
  "Camp Recaps",
  "Beginner Guides",
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PodcastPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-near-black py-24">
        <SectionContainer>
          <div className="flex flex-col items-center gap-12 md:flex-row">
            <div className="aspect-square w-full max-w-[300px] shrink-0 overflow-hidden rounded-lg bg-near-black/50">
              <div className="flex h-full items-center justify-center text-sm text-white/30">
                Podcast Art
              </div>
            </div>
            <div>
              <LabelTag variant="white">Podcast</LabelTag>
              <h1 className="mt-4 text-[clamp(3rem,6vw,64px)] font-black leading-none text-white">
                Hunt. Fish.
                <br />
                Mentor.
              </h1>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white/60">
                NC-centered hunting and fishing conversations. Experienced
                mentors share tips, stories, and the conservation ethic behind
                everything we do.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {["Apple Podcasts", "Spotify", "YouTube"].map((platform) => (
                  <a
                    key={platform}
                    href={
                      platform === "Apple Podcasts"
                        ? process.env.NEXT_PUBLIC_APPLE_PODCASTS_URL ?? "#"
                        : platform === "Spotify"
                          ? process.env.NEXT_PUBLIC_SPOTIFY_URL ?? "#"
                          : process.env.NEXT_PUBLIC_YOUTUBE_URL ?? "#"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-white/20 px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white/70 transition-colors hover:border-white/40 hover:text-white"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* Recent Episodes */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-10">
            <LabelTag>Recent Episodes</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Latest from the Show
            </h2>
          </div>

          <div className="space-y-4">
            {placeholderEpisodes.map((ep) => (
              <div
                key={ep._id}
                className="flex items-start gap-6 rounded-lg border border-near-black/10 bg-white p-6 transition-shadow hover:shadow-sm"
              >
                <span className="hidden shrink-0 text-[48px] font-black leading-none text-near-black/10 sm:block">
                  {String(ep.episodeNumber).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <h3 className="text-lg font-extrabold text-near-black">
                    <span className="sm:hidden">Ep. {ep.episodeNumber} — </span>
                    {ep.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-near-black/50">
                    {ep.description}
                  </p>
                  <div className="mt-3 flex items-center gap-3 text-xs text-near-black/40">
                    <span>{formatDate(ep.publishedAt)}</span>
                    <span>·</span>
                    <span>{ep.duration}</span>
                  </div>
                </div>
                <a
                  href="#"
                  className="shrink-0 rounded bg-dark-green px-4 py-2 text-[11px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
                >
                  Listen
                </a>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* About the Show */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <LabelTag>About the Show</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              What We Talk About
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-near-black/60">
              Every episode features real conversations with mentors, mentees,
              and community members about hunting, fishing, conservation, and
              what it means to be a responsible outdoorsman in North Carolina.
              Whether you&apos;re a seasoned hunter or completely new to the
              outdoors, there&apos;s something here for you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {topicTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-cream px-4 py-1.5 text-xs font-semibold text-near-black/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* CTA */}
      <CTABanner
        heading="Want to Be a Guest?"
        text="Have a story to share? We're always looking for hunters, anglers, and mentors to feature on the show."
        primaryLabel="Contact Us"
        primaryHref="/contact"
        secondaryLabel="Subscribe"
        secondaryHref="#"
      />
    </>
  );
}
