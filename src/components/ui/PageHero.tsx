import Image from "next/image";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
}

export default function PageHero({
  title,
  subtitle,
  backgroundImage,
}: PageHeroProps) {
  return (
    <section className="relative flex min-h-[400px] items-end overflow-hidden bg-dark-green">
      {backgroundImage && (
        <>
          <Image
            src={backgroundImage}
            alt=""
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />
        </>
      )}
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-32 md:px-10">
        <h1 className="text-5xl leading-tight tracking-tight text-white md:text-7xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/85">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
