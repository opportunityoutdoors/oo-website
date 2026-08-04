import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import ManageForm from "./ManageForm";

export const metadata: Metadata = {
  title: "Manage Your Donation",
  description:
    "Update your card, change the amount, or cancel your recurring donation to Opportunity Outdoors.",
  robots: "noindex, nofollow",
};

export default function ManageDonationPage() {
  return (
    <>
      <PageHero
        title="Manage Your Donation"
        subtitle="Change the amount, update your card, or cancel. No account needed."
        backgroundImage="/images/hero/donate-hero.jpg"
        flipImage
      />

      <section className="bg-white py-20">
        <SectionContainer>
          <div className="mx-auto max-w-lg">
            <p className="mb-8 text-center text-[15px] leading-relaxed text-near-black/60">
              Enter the email address you donated with and we will send you a
              secure link to manage your monthly gift. Cancelling is immediate
              and takes two clicks, with nobody trying to talk you out of it.
            </p>
            <ManageForm />
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
