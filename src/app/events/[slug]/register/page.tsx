import RegisterForm from "./RegisterForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complete Registration",
  robots: "noindex, nofollow",
};

export default function RegisterPage() {
  return <RegisterForm />;
}
