import type { Metadata } from "next";
import PageHero from "@/components/ui/PageHero";
import SectionContainer from "@/components/ui/SectionContainer";
import NewsletterSection from "@/components/ui/NewsletterSection";
import BlogGrid from "./BlogGrid";
import { client } from "@/lib/sanity";
import { allBlogPostsQuery } from "@/lib/queries";
import type { BlogPost } from "@/types";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Camp recaps, gear tips, conservation stories, and community news from Opportunity Outdoors.",
};

export const revalidate = 300;

export default async function BlogPage() {
  let posts: BlogPost[] = [];
  try {
    posts = await client.fetch(allBlogPostsQuery);
  } catch {
    // Sanity not available — fall back to placeholders
  }

  return (
    <>
      <PageHero title="From the Field" label="Blog" subtitle="Stories, tips, camp recaps, and conservation insights from the OO community." backgroundImage="/images/hero/blog-hero.webp" imagePosition="center bottom" />

      <section className="bg-cream py-20">
        <SectionContainer>
          <BlogGrid posts={posts} />
        </SectionContainer>
      </section>

      <NewsletterSection />
    </>
  );
}
