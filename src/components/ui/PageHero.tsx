import Image from "next/image";
import LabelTag from "@/components/ui/LabelTag";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  label?: string;
  backgroundImage?: string;
  imagePosition?: string;
  flipImage?: boolean;
}

export default function PageHero({
  title,
  subtitle,
  label,
  backgroundImage,
  imagePosition,
  flipImage,
}: PageHeroProps) {
  return (
    <section className="relative flex h-[75vh] min-h-[550px] max-h-[750px] items-end overflow-hidden bg-dark-green">
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            className="object-cover"
            style={{
              ...(imagePosition ? { objectPosition: imagePosition } : {}),
              ...(flipImage ? { transform: "scaleX(-1)" } : {}),
            }}
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
        </>
      )}
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-10 pb-[60px] pt-32">
        {label && <LabelTag variant="warm-gold">{label}</LabelTag>}
        <h1 className="mt-5 whitespace-pre-line text-[72px] leading-[0.95] tracking-[-1px] text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-[540px] text-lg leading-[1.7] text-white/85">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
