import Image from "next/image";

// No eyebrow label here by design. Every page carried one ("Events", "About Us",
// "Contact"), which restated the nav item the visitor had just clicked and the H1 they
// were already reading. The prop is removed rather than left optional so it cannot drift
// back in one page at a time.

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  imagePosition?: string;
  flipImage?: boolean;
}

export default function PageHero({
  title,
  subtitle,
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
        <h1 className="whitespace-pre-line text-[72px] leading-[0.95] tracking-[-1px] text-white">
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
