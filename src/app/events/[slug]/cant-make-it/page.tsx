import type { Metadata } from "next";
import Link from "next/link";
import { CANT_MAKE_IT, lookupByToken } from "@/lib/cant-make-it";

// Where "I Can't Make It" in the registration reminder lands. Opening it changes nothing:
// the person confirms with the button, which posts to /api/cant-make-it.

export const metadata: Metadata = {
  title: "Can't Make It",
  robots: "noindex, nofollow",
};

const EMAIL = (
  <a href="mailto:info@opportunityoutdoors.org" className="font-semibold text-dark-green underline">
    info@opportunityoutdoors.org
  </a>
);

function Shell({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[calc(100vh-116px)] flex-col items-center justify-center bg-cream px-6 pt-32 pb-20 text-center">
      <h1 className="mb-5 text-[56px] tracking-[2px] text-near-black">{heading}</h1>
      <div className="mx-auto max-w-[560px] text-lg text-near-black/70">{children}</div>
    </section>
  );
}

export default async function CantMakeItPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug } = await params;
  const { token } = await searchParams;
  const reg = await lookupByToken(token);

  if (!reg) {
    return (
      <Shell heading="Link Not Valid.">
        <p>We could not find this link. Please email {EMAIL} and let us know.</p>
      </Shell>
    );
  }

  if (reg.status === "withdrawn" && reg.exitReason === CANT_MAKE_IT) {
    return (
      <Shell heading="Thanks for Letting Us Know.">
        <p className="mb-10">
          We&apos;ve taken you off the list for {reg.eventTitle} and will offer your spot to
          someone else. We hope to see you at a future camp.
        </p>
        <Link href="/events" className="font-semibold text-dark-green underline">
          Browse upcoming events
        </Link>
      </Shell>
    );
  }

  if (reg.status === "registered" || reg.status === "attended") {
    return (
      <Shell heading="You're Registered.">
        <p>
          You&apos;ve already registered for {reg.eventTitle}. If your plans have changed, please
          email {EMAIL} and we&apos;ll sort it out with you.
        </p>
      </Shell>
    );
  }

  if (reg.status !== "approved") {
    return (
      <Shell heading="Thanks.">
        <p>There&apos;s nothing to do here. If you have a question, please email {EMAIL}.</p>
      </Shell>
    );
  }

  const name = reg.firstName ? `${reg.firstName}, can't` : "Can't";
  return (
    <Shell heading="Can't Make It?">
      <p className="mb-8">
        {name} make it to {reg.eventTitle}? Let us know, and we&apos;ll offer your spot to
        someone else.
      </p>
      <form action="/api/cant-make-it" method="post" className="text-left">
        <input type="hidden" name="token" value={reg.token} />
        <label htmlFor="note" className="mb-2 block text-sm font-semibold text-near-black">
          Anything you want us to know? (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          maxLength={2000}
          className="mb-6 w-full rounded border border-near-black/20 bg-white px-4 py-3 text-base text-near-black"
        />
        <div className="flex flex-col items-center gap-4">
          <button
            type="submit"
            className="rounded bg-dark-green px-8 py-3.5 text-[13px] font-bold uppercase tracking-[1px] text-white transition-colors hover:bg-dark-green/90"
          >
            I Can&apos;t Make It
          </button>
          <Link
            href={`/events/${reg.eventSlug || slug}/register?token=${encodeURIComponent(reg.token)}`}
            className="text-sm font-semibold text-dark-green underline"
          >
            Never mind, I&apos;ll register
          </Link>
        </div>
      </form>
    </Shell>
  );
}
