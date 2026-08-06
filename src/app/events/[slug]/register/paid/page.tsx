import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getStripe } from "@/lib/stripe/client";
import { formatFee } from "@/lib/stripe/camp-fees";
import ResumePayment from "./ResumePayment";
import BackgroundCheckStep from "./BackgroundCheckStep";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Registration Payment",
  robots: "noindex, nofollow",
};

/**
 * Where Stripe returns people after a camp payment, successful or abandoned.
 *
 * Like the donation thank-you page, this reports rather than records. The webhook marks the
 * registration paid; if this page never loads, nothing is lost. It reads the session back
 * purely to say the right number.
 */
export default async function CampPaidPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string; canceled?: string; registration?: string }>;
}) {
  const { slug } = await params;
  const { session_id, canceled } = await searchParams;

  let amount: string | null = null;
  let paid = false;

  if (session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      paid = session.payment_status === "paid";
      if (session.amount_total) amount = formatFee(session.amount_total);
    } catch {
      // A stale or invalid id should not error the page. The webhook is the record.
    }
  }

  const abandoned = canceled === "1" || (!paid && !session_id);

  // An outstanding background check is surfaced HERE, on the page shown the instant payment
  // clears, rather than left to the invite email. Someone who has just paid is the most
  // likely they will ever be to finish; an email that lands in spam a minute later is the
  // least. Without this, a lost email means a paid registrant who cannot attend.
  //
  // Looked up by the Stripe customer email rather than a token, because this page is
  // reached by redirect from Stripe and carries no registration token.
  let checkUrl: string | null = null;
  let checkPending = false;

  if (paid && session_id) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      const regId = session.metadata?.registration_id;
      if (regId) {
        const supabase = createServiceClient();
        const { data } = await supabase
          .from("registrations")
          .select("contacts(background_check_status, background_check_url)")
          .eq("id", regId)
          .single();
        const contact = Array.isArray(data?.contacts) ? data?.contacts[0] : data?.contacts;
        if (contact) {
          checkPending =
            contact.background_check_status === "invited" ||
            contact.background_check_status === "pending";
          checkUrl = contact.background_check_url ?? null;
        }
      }
    } catch {
      // The payment is recorded regardless. Worst case this page omits the check step and
      // the invite email carries it, which is the situation we had before.
    }
  }

  return (
    <div className="mx-auto max-w-lg px-6 pb-24 pt-36">
      {abandoned ? (
        <>
          <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
            Payment Not Completed
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
            No payment was taken, and nothing was lost. Your registration is
            saved: the waiver you signed and the questions you answered are all
            recorded, and your spot is held.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
            The balance is still outstanding, so you can finish paying now or
            use the link in your confirmation email later.
          </p>

          {/* useSearchParams needs a Suspense boundary above it. */}
          <Suspense fallback={null}>
            <ResumePayment />
          </Suspense>

          <p className="mt-8 text-sm leading-relaxed text-near-black/50">
            Trouble paying, or need to arrange something different? Email{" "}
            <a
              href="mailto:info@opportunityoutdoors.org"
              className="font-semibold text-dark-green hover:underline"
            >
              info@opportunityoutdoors.org
            </a>{" "}
            and we will work it out. Cost should not be the reason someone stays
            home.
          </p>
        </>
      ) : (
        <>
          <h1 className="font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
            You&apos;re All Set
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
            {amount ? (
              <>
                Your payment of{" "}
                <strong className="text-near-black">{amount}</strong> came
                through and your registration is complete.
              </>
            ) : (
              <>Your payment came through and your registration is complete.</>
            )}{" "}
            You&apos;ll receive an email with your receipt along with a separate
            email with your registration confirmation and signed waiver.
          </p>
          {checkPending && <BackgroundCheckStep url={checkUrl} />}

          <p className="mt-4 text-[15px] leading-relaxed text-near-black/70">
            A welcome packet with location details and what to bring will be sent
            out closer to the event date. Give us a shout with any questions in
            the meantime.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href={`/events/${slug}`}
              className="rounded bg-dark-green px-7 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white hover:opacity-90"
            >
              Back to the Event
            </Link>
            <Link
              href="/events"
              className="rounded border border-near-black/15 px-7 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-near-black hover:border-dark-green"
            >
              All Events
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
