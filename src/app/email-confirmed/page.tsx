import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Email Confirmed",
};

export default async function EmailConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;
  const ok = state === "ok";

  return (
    <section className="flex min-h-[calc(100vh-116px)] flex-col items-center justify-center bg-cream px-6 pt-32 pb-20 text-center">
      <h1 className="mb-5 text-[56px] tracking-[2px] text-near-black">
        {ok ? "Email Confirmed." : "Link Not Valid."}
      </h1>
      <p className="mx-auto mb-10 max-w-[560px] text-lg text-near-black/70">
        {ok
          ? "Thanks. Your camp invitation, waiver, and welcome packet will come to this address."
          : "This confirm link is not valid. Please email info@opportunityoutdoors.org and we will sort it out."}
      </p>
      <Link href="/events" className="font-semibold text-dark-green underline">
        Browse upcoming events
      </Link>
    </section>
  );
}
