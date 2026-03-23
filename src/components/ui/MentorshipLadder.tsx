import LabelTag from "@/components/ui/LabelTag";
import SectionContainer from "@/components/ui/SectionContainer";

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

export default function MentorshipLadder() {
  return (
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
  );
}
