import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import ContactForm from "@/components/forms/ContactForm";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with Opportunity Outdoors. Questions, ideas, partnership inquiries — we'd love to hear from you.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero title="Get in Touch" label="Contact" subtitle="Questions, ideas, partnership inquiries — we'd love to hear from you." backgroundImage="/images/hero/contact-hero.webp" />

      <section className="bg-cream py-20">
        <SectionContainer>
          <div className="grid gap-12 lg:grid-cols-5">
            {/* Contact Info */}
            <div className="lg:col-span-2">
              <h2 className="mb-6 text-3xl leading-tight text-near-black">
                Reach Out
              </h2>
              <p className="mb-8 text-[15px] leading-relaxed text-near-black/60">
                Have a question about our events, mentorship programs, or how to
                get involved? Drop us a line and a board member will follow up.
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
                  <div className="mt-2 flex gap-3">
                    <a
                      href={process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark-green transition-colors hover:text-dark-green/70"
                      aria-label="Instagram"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                    <a
                      href={process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-dark-green transition-colors hover:text-dark-green/70"
                      aria-label="Facebook"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-[2px] text-near-black/40">
                    Location
                  </h3>
                  <p className="mt-1 text-base text-near-black/70">
                    Fuquay-Varina, North Carolina
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
