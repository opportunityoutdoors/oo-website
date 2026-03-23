import SectionContainer from "@/components/ui/SectionContainer";
import Button from "@/components/ui/Button";

interface CTABannerProps {
  heading: string;
  text?: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  variant?: "dark-green" | "gold";
}

export default function CTABanner({
  heading,
  text,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  variant = "dark-green",
}: CTABannerProps) {
  const bgClass = variant === "gold" ? "bg-gold" : "bg-dark-green";

  return (
    <section className={`${bgClass} py-20`}>
      <SectionContainer className="text-center">
        <h2 className="text-[clamp(2rem,5vw,48px)] leading-none text-white">
          {heading}
        </h2>
        {text && (
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-white/75">
            {text}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button href={primaryHref} variant="primary">
            {primaryLabel}
          </Button>
          {secondaryLabel && secondaryHref && (
            <Button href={secondaryHref} variant="outline-white">
              {secondaryLabel}
            </Button>
          )}
        </div>
      </SectionContainer>
    </section>
  );
}
