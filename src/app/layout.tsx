import type { Metadata } from "next";
import { Barlow_Condensed, Inter } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import JsonLd from "@/components/ui/JsonLd";
import PublicShell from "@/components/layout/PublicShell";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Opportunity Outdoors | Outdoor Mentorship in North Carolina",
    template: "%s | Opportunity Outdoors",
  },
  description:
    "Opportunity Outdoors is a North Carolina 501(c)(3) nonprofit providing outdoor mentorship through hunting and fishing experiences.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://opportunityoutdoors.org"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Opportunity Outdoors",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlowCondensed.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PublicShell>
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "NGO",
              name: "Opportunity Outdoors",
              description:
                "A North Carolina 501(c)(3) nonprofit providing outdoor mentorship through hunting and fishing experiences.",
              url: "https://opportunityoutdoors.org",
              logo: "https://opportunityoutdoors.org/images/OO_Header.svg",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Raleigh",
                addressRegion: "NC",
                addressCountry: "US",
              },
              sameAs: [
                process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
                process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "",
              ].filter(Boolean),
              nonprofitStatus: "501(c)(3)",
            }}
          />
          <Navbar />
        </PublicShell>
        <main className="flex-1">{children}</main>
        <PublicShell>
          <Footer />
        </PublicShell>
      </body>
    </html>
  );
}
