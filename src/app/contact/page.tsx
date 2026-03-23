import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import ContactForm from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Opportunity Outdoors. Questions about events, mentorship, partnerships, or anything else — we respond within 48 hours.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero title="Contact Us" />

      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <h2 className="mb-6 text-3xl leading-tight text-near-black">
                Get in Touch
              </h2>
              <p className="mb-8 text-[15px] leading-relaxed text-near-black/60">
                Have a question about our events, mentorship programs, or how to
                get involved? Drop us a line and a board member will follow up
                within 48 hours.
              </p>

              <div className="space-y-6">
                {/* Email */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                    Email
                  </h3>
                  <a
                    href="mailto:info@opportunityoutdoors.org"
                    className="mt-1 block text-base font-semibold text-dark-green hover:underline"
                  >
                    info@opportunityoutdoors.org
                  </a>
                </div>

                {/* Social */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                    Follow Us
                  </h3>
                  <div className="mt-2 flex gap-4">
                    <a
                      href={process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-dark-green hover:underline"
                    >
                      Instagram
                    </a>
                    <a
                      href={process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-semibold text-dark-green hover:underline"
                    >
                      Facebook
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                    Location
                  </h3>
                  <p className="mt-1 text-base text-near-black/70">
                    Raleigh, North Carolina
                  </p>
                </div>

                {/* Response Time */}
                <div className="rounded-lg border border-gold/30 bg-gold/5 px-5 py-4">
                  <p className="text-sm font-semibold text-near-black/70">
                    We respond within 48 hours
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-3">
              <div className="rounded-lg bg-white p-8 shadow-sm">
                <ContactForm />
              </div>
            </div>
          </div>
        </SectionContainer>
      </section>
    </>
  );
}
