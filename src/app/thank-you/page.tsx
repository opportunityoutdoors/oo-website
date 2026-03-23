import type { Metadata } from "next";
import Link from "next/link";
import NewsletterSection from "@/components/ui/NewsletterSection";

export const metadata: Metadata = {
  title: "Thank You",
};

const nextSteps = [
  { href: "/podcast", label: "Listen to the Podcast" },
  {
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#",
    label: "Follow Us on Instagram",
  },
  { href: "/events", label: "Browse Upcoming Events" },
];

export default function ThankYouPage() {
  return (
    <>
      {/* Confirmation */}
      <section className="flex min-h-[calc(100vh-116px)] flex-col items-center justify-center bg-cream px-6 pt-32 pb-20 text-center">
        {/* Checkmark */}
        <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-full bg-gold text-5xl font-bold text-white">
          &#10003;
        </div>
        <h1 className="mb-5 text-[56px] tracking-[2px] text-near-black md:text-[56px]">
          You&apos;re In.
        </h1>
        <p className="mb-12 max-w-[600px] text-[17px] leading-[1.8] text-near-black/50">
          Thanks for reaching out. We&apos;ve got your info and a board member
          will follow up within 48 hours. In the meantime, here are a few ways
          to stay connected:
        </p>
        <div className="mb-16 flex flex-col gap-5">
          {nextSteps.map((step) => (
            <Link
              key={step.href}
              href={step.href}
              className="text-base font-medium text-gold transition-colors hover:text-[#8B6914]"
            >
              {step.label} &rarr;
            </Link>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSection />
    </>
  );
}
