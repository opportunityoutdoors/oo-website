import type { Metadata } from "next";
import { notFound } from "next/navigation";
import NurtureEditor from "./NurtureEditor";

export const metadata: Metadata = {
  title: "Nurture Copy Editor",
  robots: "noindex, nofollow",
};

// Dev-only tool. It writes to a source file, which cannot work on Vercel and should never
// be reachable in production. The API route behind it enforces the same rule.
export default function NurtureEditorPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <NurtureEditor />;
}
