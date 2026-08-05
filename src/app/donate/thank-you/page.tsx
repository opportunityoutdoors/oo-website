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

  // Bank debits are authorised at checkout but settle days later, so "thank you" and
  // "your money arrived" are no longer the same moment. Tracked separately because the
  // page previously asserted a receipt was coming in BOTH branches, which told every ACH
  // donor to expect an email we deliberately do not send until funds clear.
  let processing = false;

  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      recurring = session.mode === "subscription";
      paid = session.payment_status === "paid" || recurring;
      // 'unpaid' on a completed session means an async method is still in flight. Stripe
      // uses the same value for a genuinely abandoned session, but those never reach this
      // page: they land on cancel_url instead.
      processing = !paid && session.payment_status === "unpaid";
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
        subtitle="Your support helps put new hunters and anglers in the field and experienced mentors by their side."
        backgroundImage="/images/hero/donate-hero.jpg"
        flipImage
      />

      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-2xl text-center">
            {processing ? (
              <>
                <p className="text-[15px] leading-relaxed text-near-black/70">
                  Your bank transfer{amount ? <> of <strong className="text-near-black">{amount}</strong></> : null}{" "}
                  is on its way. Bank payments take about four business days to
                  clear, so nothing has left your account yet.
                </p>
                <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
                  Your receipt arrives once the funds land, not today, because it
                  has to state money we have actually received. Nothing more is
                  needed from you.
                </p>
              </>
            ) : paid && amount ? (
              <p className="text-[15px] leading-relaxed text-near-black/70">
                Your {recurring ? "monthly gift" : "gift"} of{" "}
                <strong className="text-near-black">{amount}</strong>
                {recurring ? " is set up" : " came through"}. A receipt is on its
                way to your inbox, and it includes everything you need for your
                tax records.
              </p>
            ) : (
              // Reached only when the session could not be read back. Deliberately does
              // NOT promise a receipt: we do not know whether this was a settled card
              // payment or a pending bank transfer, and guessing wrong misleads either way.
              <p className="text-[15px] leading-relaxed text-near-black/70">
                Thank you. Your donation has been submitted, and you will get a
                receipt by email once the payment settles.
              </p>
            )}

            {recurring && (
              <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
                Your gift renews automatically each month. You can change the
                amount, update your card, or cancel any time from{" "}
                <Link
                  href="/donate/manage"
                  className="font-semibold text-dark-green hover:underline"
                >
                  manage your donation
                </Link>
                .
              </p>
            )}

            {/* "A few minutes" is the wrong expectation for a bank transfer, where four
                days is normal and chasing it early wastes everyone's time. */}
            <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
              {processing
                ? "If nothing has arrived a week from now, check your spam folder, then email "
                : "If the receipt has not arrived within a few minutes, check your spam folder, then email "}
              <a
                href="mailto:info@opportunityoutdoors.org"
                className="font-semibold text-dark-green hover:underline"
              >
                info@opportunityoutdoors.org
              </a>{" "}
              and we will sort it out.
            </p>

            {/* Only one CTA. There was a second, "Where It Goes", pointing at /impact,
                which does not exist as a public route (the impact report lives behind
                /admin/impact). It 404'd. Removed rather than replaced: this page does not
                need two competing actions. */}
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/events"
                className="rounded bg-dark-green px-7 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white hover:opacity-90"
              >
                See Upcoming Events
              </Link>
            </div>
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
