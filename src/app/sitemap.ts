import type { MetadataRoute } from "next";
import { client } from "@/lib/sanity";
import { allBlogPostsQuery, allEventsQuery } from "@/lib/queries";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://opportunityoutdoors.org";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/get-involved`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/events`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/donate`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/podcast`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/sponsorship`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  ];

  let dynamicPages: MetadataRoute.Sitemap = [];

  try {
    const [blogPosts, events] = await Promise.all([
      client.fetch<Array<{ slug: { current: string } }>>(allBlogPostsQuery),
      client.fetch<Array<{ slug: { current: string } }>>(allEventsQuery),
    ]);

    const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${BASE_URL}/blog/${post.slug.current}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    const eventPages: MetadataRoute.Sitemap = events.map((event) => ({
      url: `${BASE_URL}/events/${event.slug.current}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    dynamicPages = [...blogPages, ...eventPages];
  } catch (error) {
    console.error("Sitemap: Failed to fetch dynamic content from Sanity", error);
  }

  return [...staticPages, ...dynamicPages];
}
