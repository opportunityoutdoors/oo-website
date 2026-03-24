import Link from "next/link";
import Image from "next/image";

const navigateLinks = [
  { href: "/about", label: "About" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/events", label: "Events" },
  { href: "/podcast", label: "Podcast" },
  { href: "/blog", label: "Blog" },
];

const connectLinks = [
  {
    href: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#",
    label: "Instagram",
    external: true,
  },
  {
    href: process.env.NEXT_PUBLIC_FACEBOOK_URL || "#",
    label: "Facebook",
    external: true,
  },
  { href: "/contact", label: "Contact Us", external: false },
  { href: "/donate", label: "Donate", external: false },
];

const resourceLinks = [
  { href: "/faq#gear-lists", label: "Gear Lists" },
  { href: "/faq", label: "Camp FAQ" },
  { href: "/signup?path=mentor", label: "Mentor Application" },
  { href: "/privacy-policy", label: "Privacy Policy" },
];

export default function Footer() {
  const year = new Date().getFullYear();

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
            <p className="mt-4 max-w-[300px] text-sm leading-7">
              A North Carolina 501(c)(3) nonprofit building the next generation
              of ethical, conservation-minded hunters and anglers — one mentor,
              one mentee, one campfire at a time.
            </p>
          </div>

          {/* Navigate */}
          <div>
            <h4 className="mb-5 font-heading text-[15px] font-extrabold uppercase tracking-[2px] text-white">
              Navigate
            </h4>
            {navigateLinks.map((link) => (
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
            <h4 className="mb-5 font-heading text-[15px] font-extrabold uppercase tracking-[2px] text-white">
              Connect
            </h4>
            {connectLinks.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>

          {/* Resources */}
          <div>
            <h4 className="mb-5 font-heading text-[15px] font-extrabold uppercase tracking-[2px] text-white">
              Resources
            </h4>
            {resourceLinks.map((link) => (
              <Link
                key={link.href + link.label}
                href={link.href}
                className="mb-2.5 block text-sm text-white/40 transition-colors hover:text-white/80"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.08] pt-6 text-xs tracking-[0.5px] sm:flex-row">
          <span>&copy; {year} Opportunity Outdoors. All rights reserved.</span>
          <span>Raleigh, North Carolina</span>
        </div>
      </div>
    </footer>
  );
}
