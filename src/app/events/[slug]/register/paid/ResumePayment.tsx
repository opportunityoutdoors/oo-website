"use client";

import { useSearchParams } from "next/navigation";
import ResumePaymentButton from "@/components/forms/ResumePaymentButton";

/**
 * Thin wrapper that pulls the registration token off the query string and hands it to the
 * shared button. Exists only because this page gets the token from the URL (Stripe's
 * cancel_url puts it there) while the "Already Registered" screen already has it in state.
 */
export default function ResumePayment() {
  const token = useSearchParams().get("token");
  return <ResumePaymentButton token={token} />;
}
