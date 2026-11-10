import { createClient } from "next-sanity";
import imageUrlBuilder from "@sanity/image-url";
import type { SanityImage } from "@/types";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;

// The dataset is private (2026-11-10). It holds camp locations and mentee perk codes, and a
// public dataset let anyone read them with no login. Every read therefore carries a token.
//
// Server only: neither variable is NEXT_PUBLIC, so in a browser bundle the token is undefined.
// Client components import this file for urlFor alone, and Sanity serves images publicly
// whatever the dataset's visibility.
//
// SANITY_API_READ_TOKEN is a Viewer token. The write token stands in until it is set.
export const client = createClient({
  projectId: projectId || "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: true,
  token: process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_TOKEN,
  // A token also sees drafts, and API version 2024-01-01 returns them unless told not to.
  // Without this, an unpublished edit shows on the public site as a second copy.
  perspective: "published",
});

// Write-capable client for server-side mutations (uses API token)
export const writeClient = createClient({
  projectId: projectId || "placeholder",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImage) {
  return builder.image(source);
}
