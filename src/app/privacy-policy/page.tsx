import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Header Banner */}
      <section className="flex h-[300px] items-center justify-center bg-dark-green pt-24 text-center text-white">
        <div>
          <h1 className="text-5xl tracking-[2px] md:text-[56px]">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Last updated: March 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="bg-cream px-6 py-20 md:px-10">
        <div className="mx-auto max-w-[760px]">
          <h3 className="mb-5 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            Information We Collect
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            When you fill out a form on our site (event registration,
            mentor/mentee signup, contact form, newsletter), we collect: name,
            email, phone number, city/state, and any information you provide in
            form responses. We do not collect payment information directly. All
            payments are processed through third-party providers.
          </p>

          <h3 className="mb-5 mt-10 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            How We Use Your Information
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            We use your information to: communicate with you about events and
            opportunities, match mentors with mentees, send email updates (if
            you opt in), and improve our programs. We do not sell, trade, or
            share your personal information with third parties, except as
            required to operate our programs (e.g., sharing your name with your
            assigned mentor).
          </p>

          <h3 className="mb-5 mt-10 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            Email Communications
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            We use Direct Mail to send periodic updates about events, the
            podcast, and community news. You can unsubscribe at any time using
            the link at the bottom of any email.
          </p>

          <h3 className="mb-5 mt-10 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            Cookies
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            This site uses cookies for basic analytics and site functionality.
            We do not use advertising cookies.
          </p>

          <h3 className="mb-5 mt-10 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            Your Rights
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            You may request access to, correction of, or deletion of your
            personal information at any time by contacting us at{" "}
            <a
              href="mailto:info@opportunityoutdoors.org"
              className="text-gold hover:underline"
            >
              info@opportunityoutdoors.org
            </a>
            .
          </p>

          <h3 className="mb-5 mt-10 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            Changes
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            We may update this policy from time to time. Changes will be posted
            on this page with an updated date.
          </p>

          <h3 className="mb-5 mt-10 text-2xl font-bold uppercase tracking-[1px] text-dark-green">
            Contact
          </h3>
          <p className="mb-5 text-[17px] leading-[1.8] text-near-black/60">
            Questions about this policy? Email{" "}
            <a
              href="mailto:info@opportunityoutdoors.org"
              className="text-gold hover:underline"
            >
              info@opportunityoutdoors.org
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
