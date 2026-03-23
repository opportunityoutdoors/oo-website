import LabelTag from "@/components/ui/LabelTag";

const partners = [
  "NC Wildlife Resources Commission",
  "Backcountry Hunters & Anglers",
  "New Hill / Hunters Making Hunters",
  "onX Hunt",
  "Raleigh Founded",
];

interface PartnerLogosProps {
  className?: string;
}

export default function PartnerLogos({ className = "" }: PartnerLogosProps) {
  return (
    <section className={`bg-cream py-16 ${className}`}>
      <div className="text-center">
        <LabelTag>Our Partners</LabelTag>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-12 px-6">
          {partners.map((name) => (
            <div
              key={name}
              className="flex h-14 items-center justify-center rounded bg-warm-gray px-6 text-xs text-near-black/40"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
