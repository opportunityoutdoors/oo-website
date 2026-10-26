import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/server";

// The background check link from our emails (lib/background-check/check-link.ts).
//
// An open check forwards to the person's VolunteerBadge page. Anything else gets a plain
// answer here, because VolunteerBadge shows a bare error for a finished or expired link.
// The page names nobody and shows no status detail beyond what the holder of the link
// already knows.

export const metadata: Metadata = {
  title: "Background Check",
  robots: "noindex, nofollow",
};

type Contact = {
  background_check_status: string | null;
  background_check_url: string | null;
  background_check_url_expires_at: string | null;
};

const CONTACT = (
  <a href="mailto:info@opportunityoutdoors.org" className="font-semibold text-dark-green underline">
    info@opportunityoutdoors.org
  </a>
);

export default async function BackgroundCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let contact: Contact | null = null;
  if (token) {
    const { data } = await createServiceClient()
      .from("registrations")
      .select("contacts(background_check_status, background_check_url, background_check_url_expires_at)")
      .eq("token", token)
      .maybeSingle();
    const c = data?.contacts as Contact | Contact[] | null | undefined;
    contact = (Array.isArray(c) ? c[0] : c) ?? null;
  }

  const status = contact?.background_check_status ?? null;
  const expires = contact?.background_check_url_expires_at;
  const expired = Boolean(expires && new Date(expires) <= new Date());

  // redirect() works by throwing, so it stays outside any try block.
  if (status === "invited" && contact?.background_check_url && !expired) {
    redirect(contact.background_check_url);
  }

  let heading: string;
  let body: React.ReactNode;
  if (!contact) {
    heading = "Link Not Valid.";
    body = <>We could not find this background check link. Please email {CONTACT} and we will send you a new one.</>;
  } else if (status === "clear") {
    heading = "All Done.";
    body = <>Your background check is complete. There is nothing more for you to do.</>;
  } else if (status === "invited") {
    heading = "Link Expired.";
    body = <>This background check link has expired. Please email {CONTACT} and we will send you a new one. Your spot is held.</>;
  } else if (!status || status === "none") {
    heading = "Not Ready Yet.";
    body = <>Your background check has not been set up yet. Please email {CONTACT} and we will sort it out.</>;
  } else {
    heading = "Submitted.";
    body = <>We have your background check. There is nothing more for you to do right now, and we will email you if anything changes.</>;
  }

  return (
    <section className="flex min-h-[calc(100vh-116px)] flex-col items-center justify-center bg-cream px-6 pt-32 pb-20 text-center">
      <h1 className="mb-5 text-[56px] tracking-[2px] text-near-black">{heading}</h1>
      <p className="mx-auto mb-10 max-w-[560px] text-lg text-near-black/70">{body}</p>
      <Link href="/events" className="font-semibold text-dark-green underline">
        Browse upcoming events
      </Link>
    </section>
  );
}
