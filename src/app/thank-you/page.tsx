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

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const isEvent = type === "event";

  const heading = isEvent ? "You're Registered." : "You're In.";
  const message = isEvent
    ? "We've got your spot. We'll send any final details before the event, and a confirmation is on its way to your inbox. In the meantime, here are a few ways to stay connected:"
    : "Thanks for reaching out. We've got your info and a board member will follow up within 48 hours. In the meantime, here are a few ways to stay connected:";

  return (
    <>
      {/* Confirmation */}
      <section className="flex min-h-[calc(100vh-116px)] flex-col items-center justify-center bg-cream px-6 pt-32 pb-20 text-center">
        {/* Checkmark */}
        <div className="mb-10 flex h-20 w-20 items-center justify-center rounded-full bg-gold text-5xl font-bold text-white">
          &#10003;
        </div>
        <h1 className="mb-5 text-[56px] tracking-[2px] text-near-black md:text-[56px]">
          {heading}
        </h1>
        <p className="mb-12 max-w-[600px] text-[17px] leading-[1.8] text-near-black/50">
          {message}
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
