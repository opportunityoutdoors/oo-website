import Image from "next/image";
import LabelTag from "@/components/ui/LabelTag";

const partners = [
  { name: "NC Wildlife Resources Commission", logo: "/images/NC_WRC_logo_black.png" },
  { name: "Backcountry Hunters & Anglers", logo: "/images/bha_logo_black.png" },
  { name: "New Hill", logo: "/images/NewHill_black.png" },
  { name: "Fall Line Outdoors", logo: "/images/FallLineOutdoors_black.png" },
  { name: "Raleigh Founded", logo: "/images/raleighfounded_logo_black.png" },
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
          {partners.map((partner) => (
            <Image
              key={partner.name}
              src={partner.logo}
              alt={partner.name}
              width={160}
              height={50}
              className="h-[50px] w-auto object-contain opacity-70 grayscale transition-all hover:opacity-100 hover:grayscale-0"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
