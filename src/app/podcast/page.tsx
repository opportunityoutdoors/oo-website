import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import CTABanner from "@/components/ui/CTABanner";

export const metadata: Metadata = {
  title: "Podcast",
  description:
    "Hunt. Fish. Mentor. — The Opportunity Outdoors podcast. NC-centered conversations about hunting, fishing, conservation, and mentorship.",
};

export const revalidate = 300;

const topicTags = [
  "Turkey Hunting",
  "Fishing",
  "Deer Season",
  "Gear Reviews",
  "Conservation",
  "Mentorship",
  "Public Land",
  "NC Wildlife",
];

export default function PodcastPage() {
  return (
    <>
      {/* Hero — podcast art as background */}
      <section className="relative flex h-[75vh] min-h-[550px] max-h-[750px] items-end overflow-hidden bg-near-black">
        <Image
          src="/images/hero/podcast-hero-hires.jpg"
          alt="Hunt. Fish. Mentor. podcast"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-10 pb-[60px] pt-32">
          <LabelTag variant="warm-gold">The Podcast</LabelTag>
          <h1 className="mt-5 text-[72px] leading-[0.95] tracking-[-1px] text-white">
            Hunt. Fish.
            <br />
            Mentor.
          </h1>
          <p className="mt-4 max-w-[540px] text-lg leading-[1.7] text-white/85">
            NC-centered hunting and fishing conversations. Experienced mentors
            share tips, stories, and the conservation ethic behind everything we
            do.
          </p>
        </div>
      </section>

      {/* Spotify Player */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="mb-10 text-center">
            <LabelTag>Latest Episodes</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Listen Now
            </h2>
          </div>
          <div className="mx-auto max-w-3xl">
            <iframe
              src="https://open.spotify.com/embed/show/70km7MQ3NVkRJK95XdNKFw?utm_source=generator&theme=0"
              width="100%"
              height="352"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
              title="Hunt. Fish. Mentor. podcast on Spotify"
            />
          </div>
        </SectionContainer>
      </section>

      {/* About the Show */}
      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-3xl text-center">
            <LabelTag>About the Show</LabelTag>
            <h2 className="mt-5 text-[clamp(2rem,5vw,48px)] leading-none text-near-black">
              Real Conversations From the Field
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-near-black/60">
              Hunt. Fish. Mentor. isn&apos;t about trophy photos or product
              reviews. It&apos;s about the people, the ethics, and the mentorship
              that make outdoor culture worth preserving. Whether you&apos;re a
              seasoned hunter or completely new to the outdoors, there&apos;s
              something here for you.
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
        heading="Like What You Hear?"
        text="Get involved with the community behind the podcast. Camps, events, and mentorship — all the things we talk about, but in real life."
        primaryLabel="Get Involved"
        primaryHref="/get-involved"
        secondaryLabel="Listen on Spotify"
        secondaryHref="https://open.spotify.com/show/70km7MQ3NVkRJK95XdNKFw"
      />
    </>
  );
}
