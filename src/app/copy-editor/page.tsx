import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CopyEditor from "./CopyEditor";

export const metadata: Metadata = {
  title: "Copy Editor",
  robots: "noindex, nofollow",
};

// Dev-only tool, same as /nurture-editor. It writes to source files, which cannot work on
// Vercel and must never be reachable in production. The API behind it enforces the same.
export default function CopyEditorPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <CopyEditor />;
}
