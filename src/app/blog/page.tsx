import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import NewsletterSection from "@/components/ui/NewsletterSection";
import BlogGrid from "./BlogGrid";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Camp recaps, gear tips, conservation stories, and community news from Opportunity Outdoors.",
};

export const revalidate = 300;

export default function BlogPage() {
  // TODO: Fetch from Sanity once content is populated
  // const posts = await client.fetch(allBlogPostsQuery);

  return (
    <>
      <PageHero title="Blog" backgroundImage="/images/hero/blog-hero.webp" />

      <section className="bg-cream py-20">
        <SectionContainer>
          <BlogGrid />
        </SectionContainer>
      </section>

      <NewsletterSection />
    </>
  );
}
