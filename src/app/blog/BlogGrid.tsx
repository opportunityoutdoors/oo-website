"use client";

import { useState } from "react";
import Link from "next/link";
import FilterTabs from "@/components/ui/FilterTabs";
import type { BlogPost } from "@/types";

const TABS = ["All", "Camp Recaps", "Tips & Gear", "Conservation", "Community"];

// Category mapping from Sanity values to display labels
const categoryDisplayMap: Record<string, string> = {
  hunting: "Camp Recaps",
  fishing: "Camp Recaps",
  "gear-tips": "Tips & Gear",
  conservation: "Conservation",
  mentorship: "Community",
  community: "Community",
};

interface BlogGridProps {
  posts?: BlogPost[];
}

// Placeholder posts for development
const placeholderPosts: {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  category: string;
}[] = [
  {
    _id: "1",
    title: "What I Learned at My First Turkey Camp",
    slug: { current: "first-turkey-camp" },
    excerpt:
      "I showed up with zero experience and left with a freezer full of turkey and a new group of friends. Here's what happened.",
    publishedAt: "2026-03-15",
    category: "Camp Recaps",
  },
  {
    _id: "2",
    title: "The 10 Pieces of Gear Every New Hunter Needs",
    slug: { current: "gear-for-new-hunters" },
    excerpt:
      "You don't need to spend a fortune. Here's the essential gear list for your first season in the field.",
    publishedAt: "2026-03-01",
    category: "Tips & Gear",
  },
  {
    _id: "3",
    title: "Why Conservation Is the Cost of Entry",
    slug: { current: "conservation-cost-of-entry" },
    excerpt:
      "At OO, stewardship isn't optional. Here's why we believe every hunter and angler has a responsibility to the land.",
    publishedAt: "2026-02-20",
    category: "Conservation",
  },
  {
    _id: "4",
    title: "Spring Cookout Recap: 40 People, 0 Experience Required",
    slug: { current: "spring-cookout-recap" },
    excerpt:
      "Our spring community cookout brought together new faces and old friends. Here's what went down.",
    publishedAt: "2026-02-10",
    category: "Community",
  },
  {
    _id: "5",
    title: "How to Scout for Turkey: A Beginner's Guide",
    slug: { current: "scouting-for-turkey" },
    excerpt:
      "Spring gobbler season is coming. Here's how to find birds before you ever step in the woods.",
    publishedAt: "2026-01-25",
    category: "Tips & Gear",
  },
  {
    _id: "6",
    title: "Deer Camp 2025: The Recap",
    slug: { current: "deer-camp-2025-recap" },
    excerpt:
      "Three days in the mountains, 8 mentees, 6 mentors, and a whole lot of venison. Here's the story.",
    publishedAt: "2025-12-15",
    category: "Camp Recaps",
  },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogGrid({ posts }: BlogGridProps) {
  const [activeTab, setActiveTab] = useState("All");

  const displayPosts = posts && posts.length > 0
    ? posts.map((p) => ({
        ...p,
        category: categoryDisplayMap[p.category] || p.category,
      }))
    : placeholderPosts;

  const filtered = displayPosts.filter((post) => {
    if (activeTab === "All") return true;
    return post.category === activeTab;
  });

  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <>
      <div className="mb-10">
        <FilterTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-lg text-near-black/40">
            No posts in this category yet. Check back soon!
          </p>
        </div>
      ) : (
        <>
          {/* Featured Post */}
          {featured && (
            <Link
              href={`/blog/${featured.slug.current}`}
              className="group mb-10 block overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="grid md:grid-cols-2">
                <div className="aspect-[16/10] bg-warm-gray md:aspect-auto">
                  <div className="flex h-full items-center justify-center text-sm text-near-black/30">
                    Featured Image
                  </div>
                </div>
                <div className="p-8 md:p-10">
                  <span className="inline-block rounded bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                    {featured.category}
                  </span>
                  <h2 className="mt-3 text-2xl font-extrabold leading-tight text-near-black group-hover:text-dark-green md:text-3xl">
                    {featured.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-near-black/60">
                    {featured.excerpt}
                  </p>
                  <p className="mt-4 text-xs text-near-black/40">
                    {formatDate(featured.publishedAt)}
                  </p>
                  <span className="mt-4 inline-block text-sm font-semibold uppercase tracking-[1px] text-gold">
                    Read More &rarr;
                  </span>
                </div>
              </div>
            </Link>
          )}

          {/* Post Grid */}
          {rest.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <Link
                  key={post._id}
                  href={`/blog/${post.slug.current}`}
                  className="group overflow-hidden rounded-lg bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="aspect-[16/10] bg-warm-gray">
                    <div className="flex h-full items-center justify-center text-xs text-near-black/30">
                      Thumbnail
                    </div>
                  </div>
                  <div className="p-6">
                    <span className="inline-block rounded bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                      {post.category}
                    </span>
                    <h3 className="mt-3 text-lg font-extrabold leading-tight text-near-black group-hover:text-dark-green">
                      {post.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-near-black/50 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <p className="mt-3 text-xs text-near-black/40">
                      {formatDate(post.publishedAt)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
