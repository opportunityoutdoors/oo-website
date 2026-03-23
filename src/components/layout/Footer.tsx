import Link from "next/link";
import Image from "next/image";

const exploreLinks = [
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/blog", label: "Blog" },
  { href: "/podcast", label: "Podcast" },
  { href: "/faq", label: "FAQ & Gear Lists" },
];

const getInvolvedLinks = [
  { href: "/signup", label: "Sign Up" },
  { href: "/donate", label: "Donate" },
  { href: "/sponsorship", label: "Sponsorship" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  const year = new Date().getFullYear();

  const instagramUrl = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  const facebookUrl = process.env.NEXT_PUBLIC_FACEBOOK_URL;

  return (
    <footer className="bg-near-black px-6 pb-8 pt-16 text-white/40 md:px-10">
      <div className="mx-auto max-w-[1200px]">
        {/* Grid */}
        <div className="mb-12 grid gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:gap-12">
          {/* Brand */}
          <div>
            <Image
              src="/images/OO_Footer_white2.svg"
              alt="Opportunity Outdoors"
              width={300}
              height={60}
              className="mb-1 h-auto w-[300px]"
            />
            <p className="mb-5 text-xs font-bold uppercase tracking-[2px] text-gold">
              Conservation Through Mentorship
            </p>
            <p className="max-w-[300px] text-sm leading-7">
              A North Carolina 501(c)(3) nonprofit building the next generation
              of ethical, conservation-minded hunters and anglers — one mentor,
              one mentee, one campfire at a time.
            </p>
            <p className="mt-4 text-sm text-white/30">Raleigh, NC</p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="mb-5 text-[15px] font-extrabold uppercase tracking-[2px] text-white">
              Explore
            </h4>
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Get Involved */}
          <div>
            <h4 className="mb-5 text-[15px] font-extrabold uppercase tracking-[2px] text-white">
              Get Involved
            </h4>
            {getInvolvedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Connect */}
          <div>
            <h4 className="mb-5 text-[15px] font-extrabold uppercase tracking-[2px] text-white">
              Connect
            </h4>
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
              >
                Instagram
              </a>
            )}
            {facebookUrl && (
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
              >
                Facebook
              </a>
            )}
            <a
              href="mailto:info@opportunityoutdoors.org"
              className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
            >
              info@opportunityoutdoors.org
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.08] pt-6 text-xs tracking-[0.5px] sm:flex-row">
          <span>&copy; {year} Opportunity Outdoors. All rights reserved.</span>
          <Link
            href="/privacy-policy"
            className="text-white/30 transition-colors hover:text-white/60"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
