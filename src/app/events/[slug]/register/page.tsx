import RegisterForm from "./RegisterForm";
import type { Metadata } from "next";
import { isStripeConfigured } from "@/lib/stripe/client";

export const metadata: Metadata = {
  title: "Complete Registration",
  robots: "noindex, nofollow",
};

export default function RegisterPage() {
  // Passed down so the payment summary can tell the truth about what happens on submit.
  // Registration completes either way; what must not happen is the form promising "you
  // will be taken to Stripe to pay" and then silently not doing it.
  return <RegisterForm stripeReady={isStripeConfigured()} />;
}
