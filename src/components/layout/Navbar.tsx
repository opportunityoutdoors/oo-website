"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/get-involved", label: "Get Involved" },
  { href: "/events", label: "Events" },
  { href: "/donate", label: "Donate" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 transition-colors duration-300 md:px-10 ${
        scrolled ? "bg-near-black/95 backdrop-blur-sm shadow-lg" : "bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1200px] items-center justify-between py-4 ${
          scrolled ? "" : "border-b border-white/15 mt-5"
        }`}
      >
        {/* Logo — full color over hero, white on solid scroll */}
        <Link href="/" className="relative shrink-0 h-16 w-[240px]">
          <Image
            src="/images/OO_Logo_Full_Color.svg"
            alt="Opportunity Outdoors"
            width={240}
            height={64}
            className={`absolute inset-0 h-16 w-auto transition-opacity duration-300 ${
              scrolled ? "opacity-0" : "opacity-100"
            }`}
            priority
          />
          <Image
            src="/images/OO_Header.svg"
            alt="Opportunity Outdoors"
            width={240}
            height={64}
            className={`absolute inset-0 h-16 w-auto transition-opacity duration-300 ${
              scrolled ? "opacity-100" : "opacity-0"
            }`}
            priority
          />
        </Link>

        {/* Desktop Links */}
        <ul className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`text-[13px] font-semibold uppercase tracking-[1px] transition-colors hover:text-white ${
                  isActive(link.href)
                    ? "text-gold"
                    : "text-white/80"
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/signup"
              className="rounded bg-gold px-5 py-2.5 text-[13px] font-bold uppercase tracking-[1px] text-near-black transition-colors hover:bg-gold/90"
            >
              Join Us
            </Link>
          </li>
        </ul>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="flex flex-col gap-1.5 lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span
            className={`block h-0.5 w-6 bg-white transition-transform ${
              mobileOpen ? "translate-y-2 rotate-45" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-white transition-opacity ${
              mobileOpen ? "opacity-0" : ""
            }`}
          />
          <span
            className={`block h-0.5 w-6 bg-white transition-transform ${
              mobileOpen ? "-translate-y-2 -rotate-45" : ""
            }`}
          />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-full bg-near-black/95 px-6 py-8 backdrop-blur-sm lg:hidden">
          <ul className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`block text-sm font-semibold uppercase tracking-[1px] transition-colors hover:text-white ${
                    isActive(link.href) ? "text-gold" : "text-white/80"
                  }`}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="mt-2">
              <Link
                href="/signup"
                className="inline-block rounded bg-gold px-6 py-3 text-sm font-bold uppercase tracking-[1px] text-near-black"
                onClick={() => setMobileOpen(false)}
              >
                Join Us
              </Link>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}
