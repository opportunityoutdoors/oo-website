import type { Metadata } from "next";
import Link from "next/link";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import { getStripe } from "@/lib/stripe/client";
import { formatCents } from "@/lib/stripe/giving";

export const metadata: Metadata = {
  title: "Thank You",
  // Never let a confirmation page carrying a session id into search results.
  robots: "noindex, nofollow",
};

/**
 * Post-checkout confirmation.
 *
 * This page is a courtesy, NOT a record. It reads the session back from Stripe purely to
 * say the right number out loud. The donation row and the tax receipt are written by the
 * webhook, which is the only thing that hears about payments that succeed after the donor
 * has closed the tab. If this page never loads, nothing is lost.
 *
 * The session id in the URL is safe to accept from the browser: it is opaque, single
 * purpose, and we only ever read it back from Stripe. Nothing here trusts it to assert
 * that money moved, only to look up what Stripe already knows.
 */
export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;

  let amount: string | null = null;
  let recurring = false;
  let paid = false;

  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      paid = session.payment_status === "paid" || session.mode === "subscription";
      recurring = session.mode === "subscription";
      if (session.amount_total) amount = formatCents(session.amount_total);
    } catch {
      // A bad or expired id should not produce an error page. The gift, if there was one,
      // is already recorded elsewhere; the worst case here is a slightly generic thank you.
    }
  }

  return (
    <>
      <PageHero
        title="Thank You"
        subtitle="Your support puts new hunters and anglers in the field with people who know what they are doing."
        backgroundImage="/images/hero/donate-hero.jpg"
        flipImage
      />

      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-2xl text-center">
            {paid && amount ? (
              <p className="text-[15px] leading-relaxed text-near-black/70">
                Your {recurring ? "monthly gift" : "gift"} of{" "}
                <strong className="text-near-black">{amount}</strong>
                {recurring ? " is set up" : " came through"}. A receipt is on its
                way to your inbox, and it includes everything you need for your
                tax records.
              </p>
            ) : (
              <p className="text-[15px] leading-relaxed text-near-black/70">
                Your gift came through. A receipt is on its way to your inbox,
                and it includes everything you need for your tax records.
              </p>
            )}

            {recurring && (
              <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
                Your gift renews automatically each month. You can change or
                cancel it any time by replying to the receipt email.
              </p>
            )}

            <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
              If the receipt has not arrived within a few minutes, check your
              spam folder, then email{" "}
              <a
                href="mailto:info@opportunityoutdoors.org"
                className="font-semibold text-dark-green hover:underline"
              >
                info@opportunityoutdoors.org
              </a>{" "}
              and we will sort it out.
            </p>

            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/events"
                className="rounded bg-dark-green px-7 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white hover:opacity-90"
              >
                See Upcoming Events
              </Link>
              <Link
                href="/impact"
                className="rounded border border-near-black/15 px-7 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-near-black hover:border-dark-green"
              >
                Where It Goes
              </Link>
            </div>
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
