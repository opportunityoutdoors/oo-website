import type { Metadata } from "next";
import { Suspense } from "react";
import UnsubscribeForm from "./UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: "noindex, nofollow",
};

export default function NurtureUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-near-black/40">Loading...</p>
        </div>
      }
    >
      <UnsubscribeForm />
    </Suspense>
  );
}
