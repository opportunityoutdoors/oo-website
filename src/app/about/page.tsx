import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import LabelTag from "@/components/ui/LabelTag";
import PartnerLogos from "@/components/ui/PartnerLogos";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Opportunity Outdoors — our mission, values, and the team behind North Carolina's outdoor mentorship nonprofit.",
};

const values = [
  {
    num: "01",
    title: "Mentorship Over\nInstruction",
    desc: "We don't hand you a pamphlet. We walk alongside you. Mentorship means relationship, patience, and years of showing up.",
  },
  {
    num: "02",
    title: "Conservation\nIs the Cost",
    desc: "Stewardship isn't optional. We develop people who care about the land, the wildlife, and the future of our shared natural resources.",
  },
  {
    num: "03",
    title: "Everyone\nBelongs",
    desc: "No gatekeeping. No intimidation. If you're curious about hunting or fishing, you have a place at our table — and around our campfire.",
  },
  {
    num: "04",
    title: "Give Back\nWhat You Get",
    desc: "The goal isn't just to make hunters. It's to make mentors. We invest in people who will invest in the next generation.",
  },
  {
    num: "05",
    title: "Do It\nRight",
    desc: "Ethics, safety, legal compliance, and respect — for the animal, the land, and each other. No shortcuts.",
  },
  {
    num: "06",
    title: "Community\nFirst",
    desc: "The campfire matters as much as the hunt. We build friendships, not just skillsets. The people are the point.",
  },
];

const teamMembers = [
  {
    name: "Evan Trebilcock",
    role: "Board Chair & Co-Founder",
    bio: "Evan grew up hunting and fishing in the Southeast and co-founded OO to help others discover what the outdoors gave him. He leads the board and oversees org strategy.",
  },
  {
    name: "John Trice",
    role: "Vice Chair & Marketing",
    bio: "John spent 15 years on the West Coast before coming back to NC. A lifelong outdoorsman and angler, he picked up hunting through OO in 2022 and now leads marketing and the website rebuild.",
  },
  {
    name: "Safiyyah Motaib",
    role: "Secretary & Outreach",
    bio: "Safiyyah brings a community organizing background and a passion for making the outdoors more accessible. She manages communications and community partnerships.",
  },
  {
    name: "Zeke Goldstein",
    role: "Treasurer",
    bio: "Zeke handles the books and keeps OO financially accountable. When he's not crunching numbers, he's chasing trout in the NC mountains.",
  },
  {
    name: 'John "Monty" Montgomery',
    role: "Event Coordinator",
    bio: "Monty is the boots-on-the-ground guy. He coordinates camp logistics, manages gear, and makes sure every event runs smoothly.",
  },
  {
    name: "Andy Tomaszewski",
    role: "At Large & Co-Founder",
    bio: "Andy co-founded OO alongside Evan and brings decades of hunting experience. He mentors new hunters and helps shape the camp curriculum.",
  },
  {
    name: "Evan Weiss",
    role: "At Large",
    bio: "Evan W. is a newer board member with a background in conservation policy. He helps OO navigate partnerships with state agencies and conservation orgs.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <PageHero
        title="About Us"
        label="Our Story"
        subtitle="Conservation through mentorship."
        backgroundImage="/images/hero/about-hero.webp"
      />

      {/* Mission */}
      <section className="bg-cream py-24">
        <SectionContainer>
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <LabelTag>Our Mission</LabelTag>
              <h2 className="mb-6 mt-5 text-[56px] leading-none text-near-black">
                Mentorship Is the Mission
              </h2>
              <p className="mb-5 text-lg font-medium leading-relaxed text-near-black/70">
                Opportunity Outdoors mentors new hunters and anglers through
                immersive camps, community events, and long-term relationships —
                building conservation-minded sportsmen and women across North
                Carolina.
              </p>
              <p className="mb-5 text-base leading-relaxed text-near-black/50">
                Other organizations conserve the land. We develop the people. We
                believe that ethical, conservation-minded hunters and anglers
                aren&apos;t born — they&apos;re mentored. And that mentorship
                doesn&apos;t happen in a one-day clinic. It happens around
                campfires, on pre-dawn truck rides, and through years of showing
                up for each other.
              </p>
              <p className="text-base leading-relaxed text-near-black/50">
                Our vision is a thriving outdoor community where every aspiring
                hunter or angler has a mentor, and every experienced sportsman
                has someone to invest in.
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
          src="/images/hero/origin-story.jpg"
          alt=""
          fill
          className="object-cover opacity-15"
        />
        <SectionContainer className="relative z-10">
          <div className="max-w-[700px]">
            <LabelTag variant="white">Our Story</LabelTag>
            <h2 className="mb-8 mt-5 text-[48px] leading-none text-white">
              Started Around a Campfire
            </h2>
            <p className="mb-5 text-base leading-relaxed text-white/70">
              <strong className="text-white">
                Opportunity Outdoors started with a simple observation:
              </strong>{" "}
              there are thousands of people in North Carolina who want to hunt or
              fish but don&apos;t have anyone to show them how. No family
              tradition. No hunting buddy. No idea where to start.
            </p>
            <p className="mb-5 text-base leading-relaxed text-white/70">
              Most hunting organizations focus on policy, access, or habitat. All
              critical work. But we saw a gap nobody was filling:{" "}
              <strong className="text-white">
                the human side of conservation.
              </strong>{" "}
              The mentor who answers your text at 5am on opening day. The friend
              who helps you sight in your bow. The community that makes you feel
              like you belong in the field.
            </p>
            <p className="text-base leading-relaxed text-white/70">
              What started as a handful of guys hosting informal hunts has grown
              into a structured mentorship organization with multi-day camps, a
              podcast, community events, and a clear pathway from curious
              newcomer to mentor. We&apos;re a 501(c)(3) nonprofit, and every
              dollar goes toward getting more people into the field the right
              way.
            </p>
          </div>
        </SectionContainer>
      </section>

      {/* Values */}
      <section className="bg-cream py-24">
        <SectionContainer>
          <div className="mb-16 text-center">
            <LabelTag>What We Stand For</LabelTag>
            <h2 className="mt-5 text-[56px] leading-none text-near-black">
              Our Values
            </h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((v) => (
              <div key={v.num} className="p-8">
                <span className="text-[64px] font-black leading-none text-gold">
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
                  <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                    Photo
                  </div>
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
                  <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                    Photo
                  </div>
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
          or support our mission — there&apos;s a place for you.
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
