import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import PartnerLogos from "@/components/ui/PartnerLogos";
import { client } from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";
import { allTeamMembersQuery } from "@/lib/queries";
import type { TeamMember } from "@/types";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Opportunity Outdoors: our mission, values, and the team behind North Carolina's outdoor mentorship nonprofit.",
};

const values = [
  {
    num: "01",
    title: "Mentorship Over\nInstruction",
    desc: "We don't hand you a pamphlet. We walk alongside you. Mentorship means honest feedback, patience, and years of showing up.",
  },
  {
    num: "02",
    title: "Conservation\nIs the Cost",
    desc: "Stewardship isn't optional. We develop people who care about the land, the wildlife, and the future of our shared natural resources.",
  },
  {
    num: "03",
    title: "Everyone\nBelongs",
    desc: "No gatekeeping. No intimidation. If you're curious about hunting or fishing, you have a place around our campfire.",
  },
  {
    num: "04",
    title: "Give Back\nWhat You Get",
    desc: "The goal isn't just to make hunters. It's to make mentors. We invest in people who will invest in the next generation.",
  },
  {
    num: "05",
    title: "Do It\nRight",
    desc: "Ethics, safety, legal compliance, and respect for the animal, the land, and each other. No shortcuts.",
  },
  {
    num: "06",
    title: "Community\nFirst",
    desc: "The campfire matters as much as the hunt. We build friendships, not just skillsets. The people are the point.",
  },
];

export const revalidate = 300;

export default async function AboutPage() {
  let teamMembers: TeamMember[] = [];
  try {
    teamMembers = await client.fetch(allTeamMembersQuery);
  } catch {
    // Sanity not available — team section will be empty
  }
  return (
    <>
      {/* Hero */}
      <PageHero
        title={"We Build People\nWho Build Conservation"}
        label="About Us"
        subtitle="A North Carolina nonprofit turning curious newcomers into ethical, conservation-minded sportsmen and women through mentorship, community, and time in the field."
        backgroundImage="/images/hero/about-hero.webp"
      />

      {/* Mission */}
      <section className="bg-cream py-24">
        <SectionContainer>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <LabelTag>Our Mission</LabelTag>
              <h2 className="mb-6 mt-5 text-[56px] leading-none text-near-black">
                We Develop the People
              </h2>
              <p className="mb-5 text-lg font-medium leading-relaxed text-near-black/70">
                Opportunity Outdoors mentors new hunters and anglers through
                immersive camps, community events, and long-term relationships,
                building conservation-minded sportsmen and women across North
                Carolina.
              </p>
              <p className="mb-5 text-base leading-relaxed text-near-black/50">
                Other organizations conserve the land. We develop the people. We
                believe that ethical, conservation-minded hunters and anglers
                aren&apos;t born. They&apos;re mentored. And that mentorship
                doesn&apos;t happen in a one-day clinic. It happens around
                campfires, on pre-dawn truck rides, and through years of showing
                up for each other.
              </p>
              <p className="text-base leading-relaxed text-near-black/50">
                Our vision is a thriving outdoor community where every aspiring
                hunter or angler has a mentor, and every experienced sportsman
                has someone to show the ropes.
              </p>
            </div>
            <div className="aspect-[4/3] overflow-hidden rounded-lg">
              <Image
                src="/images/hero/events-hero.webp"
                alt="OO community gathering at camp"
                width={600}
                height={450}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </SectionContainer>
      </section>

      {/* Origin Story */}
      <section className="relative overflow-hidden bg-dark-green py-24">
        <Image
          src="/images/hero/campfire.jpg"
          alt=""
          fill
          className="object-cover opacity-15 object-bottom"
        />
        <SectionContainer className="relative z-10">
          <div className="max-w-[700px]">
            <LabelTag variant="warm-gold">Our Story</LabelTag>
            <h2 className="mb-8 mt-5 text-[48px] leading-none text-white">
              Started Around a Campfire
            </h2>
            <p className="mb-5 text-base leading-relaxed text-white/70">
              <strong className="text-white">
                Opportunity Outdoors started with a simple observation:
              </strong>{" "}
              there are thousands of folks in North Carolina who want to hunt or
              fish but don&apos;t have anyone to show them how. No family
              tradition. No hunting buddy. No idea where to start.
            </p>
            <p className="mb-5 text-base leading-relaxed text-white/70">
              While most hunting organizations focus on policy, access, or
              habitat, we saw a gap nobody was filling:{" "}
              <strong className="text-white">
                the human side of conservation.
              </strong>{" "}
              The mentor who answers your text at 5am on opening day. The friend
              who helps you sight in your bow. The community that makes you feel
              like you belong in the field.
            </p>
            <p className="text-base leading-relaxed text-white/70">
              What began as a handful of friends hosting informal hunting trips
              has grown into a structured mentorship organization with formal
              hunt camps, community events, a podcast, and a clear pathway from
              curious newcomer to mentor. As a 501(c)(3) nonprofit, every dollar
              we raise goes back into the organization to help mentor the next
              wave of hunters and fishermen.
            </p>
          </div>
        </SectionContainer>
      </section>

      {/* Quick Facts */}
      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="grid grid-cols-2 md:grid-cols-4">
            {[
              { value: "2020", label: "Founded" },
              { value: "400+", label: "Community Members" },
              { value: "30+", label: "Camps & Events" },
              { value: "NC", label: "Based & Focused" },
            ].map((stat, i, arr) => (
              <div
                key={stat.label}
                className={`px-6 py-10 text-center ${
                  i < arr.length - 1 ? "border-r border-warm-gray" : ""
                }`}
              >
                <p className="font-heading text-[64px] font-black leading-none text-dark-green">
                  {stat.value}
                </p>
                <p className="mt-2 text-[13px] font-bold uppercase tracking-[2px] text-near-black/40">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Values */}
      <section className="bg-white py-24">
        <SectionContainer>
          <div className="mb-16 text-center">
            <LabelTag>What We Stand For</LabelTag>
            <h2 className="mt-5 text-[56px] leading-none text-near-black">
              Our Values
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div key={v.num} className="p-8 text-center">
                <span className="font-heading text-[56px] font-black leading-none text-[#C4941A]">
                  {v.num}
                </span>
                <h3 className="mb-3 mt-2 whitespace-pre-line text-2xl leading-tight text-near-black">
                  {v.title}
                </h3>
                <p className="text-sm leading-relaxed text-near-black/50">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Team */}
      <section className="bg-warm-gray py-24">
        <SectionContainer>
          <div className="mb-16 text-center">
            <LabelTag>Leadership</LabelTag>
            <h2 className="mt-5 text-[56px] leading-none text-near-black">
              The Board
            </h2>
          </div>
          {/* Row 1: 4 members */}
          <div className="mb-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {teamMembers.slice(0, 4).map((member) => (
              <div key={member.name} className="text-center">
                <div className="mx-auto mb-4 aspect-square w-48 overflow-hidden rounded-lg bg-cream">
                  {member.image ? (
                    <Image
                      src={urlFor(member.image).width(384).height(384).fit("crop").url()}
                      alt={member.image.alt || member.name}
                      width={192}
                      height={192}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                      Photo
                    </div>
                  )}
                </div>
                <h3 className="text-lg text-near-black">
                  {member.name}
                </h3>
                <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-gold">
                  {member.role}
                </p>
                <p className="text-sm leading-relaxed text-near-black/50">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
          {/* Row 2: 3 members */}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {teamMembers.slice(4).map((member) => (
              <div key={member.name} className="text-center">
                <div className="mx-auto mb-4 aspect-square w-48 overflow-hidden rounded-lg bg-cream">
                  {member.image ? (
                    <Image
                      src={urlFor(member.image).width(384).height(384).fit("crop").url()}
                      alt={member.image.alt || member.name}
                      width={192}
                      height={192}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                      Photo
                    </div>
                  )}
                </div>
                <h3 className="text-lg text-near-black">
                  {member.name}
                </h3>
                <p className="mb-2 text-xs font-bold uppercase tracking-[2px] text-gold">
                  {member.role}
                </p>
                <p className="text-sm leading-relaxed text-near-black/50">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      {/* Partners */}
      <PartnerLogos />

      {/* CTA */}
      <section className="bg-dark-green px-10 py-24 text-center">
        <h2 className="mb-4 text-[48px] leading-none text-white">
          Ready to Get Started?
        </h2>
        <p className="mb-10 text-lg text-white/70">
          Whether you want to learn to hunt, share your experience as a mentor,
          or support our mission, there&apos;s a place for you.
        </p>
        <Link
          href="/get-involved"
          className="inline-block rounded bg-gold px-9 py-4 text-[13px] font-bold uppercase tracking-[1.5px] text-near-black transition-colors hover:bg-gold/90"
        >
          Get Involved
        </Link>
      </section>
    </>
  );
}
