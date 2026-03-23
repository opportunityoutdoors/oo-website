import type { Metadata } from "next";
import Link from "next/link";
import SectionContainer from "@/components/ui/SectionContainer";
import NewsletterSection from "@/components/ui/NewsletterSection";
import PortableTextRenderer from "@/components/ui/PortableTextRenderer";
import JsonLd from "@/components/ui/JsonLd";

// TODO: Fetch from Sanity once content is populated
// import { client } from "@/lib/sanity";
// import { blogPostBySlugQuery } from "@/lib/queries";

export const revalidate = 300;

// Placeholder blog posts for development
const placeholderPosts: Record<string, any> = {
  "first-turkey-camp": {
    title: "What I Learned at My First Turkey Camp",
    category: "Camp Recaps",
    publishedAt: "2026-03-15",
    author: "Evan Trebilcock",
    excerpt:
      "I showed up with zero experience and left with a freezer full of turkey and a new group of friends.",
    body: [
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "When I pulled into camp on a Thursday afternoon, I didn't know the difference between a box call and a mouth call. By Saturday morning, I'd called in my first tom with a mentor sitting right beside me, coaching me through every step.",
          },
        ],
        style: "normal",
      },
      {
        _type: "block",
        children: [
          {
            _type: "span",
            text: "That's what Opportunity Outdoors does. They don't just teach you to hunt — they teach you to be a steward of the land, an ethical sportsman, and a member of a community that has your back long after camp is over.",
          },
        ],
        style: "normal",
      },
    ],
  },
  "gear-for-new-hunters": {
    title: "The 10 Pieces of Gear Every New Hunter Needs",
    category: "Tips & Gear",
    publishedAt: "2026-03-01",
    author: "John Trice",
    excerpt: "You don't need to spend a fortune. Here's the essential gear list for your first season.",
    body: [
      {
        _type: "block",
        children: [{ _type: "span", text: "Getting started in hunting doesn't require a $5,000 setup. Here are the essentials that will get you in the field safely and effectively." }],
        style: "normal",
      },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = placeholderPosts[slug];
  if (!post) return { title: "Post Not Found" };

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.publishedAt,
    },
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = placeholderPosts[slug];

  if (!post) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-cream">
        <div className="text-center">
          <h1 className="text-4xl font-black text-near-black">Post Not Found</h1>
          <p className="mt-3 text-near-black/50">
            This post doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/blog"
            className="mt-6 inline-block rounded bg-dark-green px-7 py-3 text-[13px] font-bold uppercase tracking-[1.5px] text-white"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          author: {
            "@type": "Person",
            name: post.author,
          },
          publisher: {
            "@type": "Organization",
            name: "Opportunity Outdoors",
            url: "https://opportunityoutdoors.org",
          },
        }}
      />
      {/* Hero Image */}
      <section className="relative flex min-h-[400px] items-end overflow-hidden bg-dark-green">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-32 md:px-10">
          <span className="mb-3 inline-block rounded bg-gold/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-gold">
            {post.category}
          </span>
          <h1 className="max-w-[800px] text-4xl leading-tight tracking-tight text-white md:text-6xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-3 text-sm text-white/50">
            <span>{post.author}</span>
            <span>·</span>
            <span>{formatDate(post.publishedAt)}</span>
          </div>
        </div>
      </section>

      {/* Post Body */}
      <section className="bg-cream py-16">
        <SectionContainer>
          <article className="mx-auto max-w-[720px]">
            <div className="prose prose-lg max-w-none text-near-black/80">
              <PortableTextRenderer value={post.body} />
            </div>
          </article>
        </SectionContainer>
      </section>

      {/* Related Posts placeholder */}
      <section className="bg-white py-20">
        <SectionContainer>
          <h2 className="mb-10 text-center text-3xl leading-tight text-near-black">
            More from the Blog
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {Object.entries(placeholderPosts)
              .filter(([key]) => key !== slug)
              .slice(0, 3)
              .map(([key, relatedPost]) => (
                <Link
                  key={key}
                  href={`/blog/${key}`}
                  className="group overflow-hidden rounded-lg border border-near-black/10 bg-white"
                >
                  <div className="aspect-[16/10] bg-warm-gray">
                    <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                      Thumbnail
                    </div>
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                      {relatedPost.category}
                    </span>
                    <h3 className="mt-2 text-base font-extrabold leading-tight text-near-black group-hover:text-dark-green">
                      {relatedPost.title}
                    </h3>
                  </div>
                </Link>
              ))}
          </div>
        </SectionContainer>
      </section>

      <NewsletterSection />
    </>
  );
}
