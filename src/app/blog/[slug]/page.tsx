import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SectionContainer from "@/components/ui/SectionContainer";
import NewsletterSection from "@/components/ui/NewsletterSection";
import PortableTextRenderer from "@/components/ui/PortableTextRenderer";
import JsonLd from "@/components/ui/JsonLd";
import LabelTag from "@/components/ui/LabelTag";
import { client, urlFor } from "@/lib/sanity";
import { blogPostBySlugQuery, allBlogPostsQuery } from "@/lib/queries";
import type { BlogPost } from "@/types";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

const categoryLabels: Record<string, string> = {
  hunting: "Hunting",
  fishing: "Fishing",
  conservation: "Conservation",
  mentorship: "Mentorship",
  "gear-tips": "Gear & Tips",
  community: "Community",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post: BlogPost | null = await client.fetch(blogPostBySlugQuery, { slug });
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
  const post: BlogPost | null = await client.fetch(blogPostBySlugQuery, { slug });

  if (!post) notFound();

  // Fetch other posts for "More from the Blog"
  let relatedPosts: BlogPost[] = [];
  try {
    const allPosts: BlogPost[] = await client.fetch(allBlogPostsQuery);
    relatedPosts = allPosts.filter((p) => p._id !== post._id).slice(0, 3);
  } catch {
    // ignore
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
          publisher: {
            "@type": "Organization",
            name: "Opportunity Outdoors",
            url: "https://opportunityoutdoors.org",
          },
        }}
      />

      {/* Hero */}
      <section className="relative flex min-h-[400px] items-end overflow-hidden bg-dark-green">
        {post.image ? (
          <>
            <Image
              src={urlFor(post.image).width(1920).quality(80).url()}
              alt={post.image.alt || post.title}
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/60" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/15" />
        )}
        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-32 md:px-10">
          <LabelTag variant="warm-gold">
            {categoryLabels[post.category] || post.category}
          </LabelTag>
          <h1 className="mt-5 max-w-[800px] text-4xl leading-tight tracking-tight text-white md:text-6xl">
            {post.title}
          </h1>
          <p className="mt-4 text-sm text-white/60">
            {formatDate(post.publishedAt)}
          </p>
        </div>
      </section>

      {/* Post Body */}
      <section className="bg-cream py-16">
        <SectionContainer>
          <article className="mx-auto max-w-[720px]">
            <div className="prose prose-lg max-w-none text-near-black/80">
              {post.body && post.body.length > 0 ? (
                <PortableTextRenderer value={post.body as any} />
              ) : (
                <p className="italic text-near-black/50">No content yet.</p>
              )}
            </div>
          </article>
        </SectionContainer>
      </section>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-white py-20">
          <SectionContainer>
            <h2 className="mb-10 text-center text-3xl leading-tight text-near-black">
              More from the Blog
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related._id}
                  href={`/blog/${related.slug.current}`}
                  className="group overflow-hidden rounded-lg border border-near-black/10 bg-white"
                >
                  <div className="aspect-[16/10] bg-warm-gray">
                    {related.image ? (
                      <Image
                        src={urlFor(related.image).width(600).height(375).fit("crop").url()}
                        alt={related.image.alt || related.title}
                        width={600}
                        height={375}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                        Thumbnail
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold">
                      {categoryLabels[related.category] || related.category}
                    </span>
                    <h3 className="mt-2 text-base font-extrabold leading-tight text-near-black group-hover:text-dark-green">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </SectionContainer>
        </section>
      )}

      <NewsletterSection />
    </>
  );
}
