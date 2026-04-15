import { Suspense } from "react";
import { AcceptInviteForm } from "./accept-invite-form";

export const metadata = {
  title: "Accept Invite",
  robots: "noindex, nofollow",
};

export default function AcceptInvitePage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-center font-heading text-3xl font-[900] uppercase tracking-tight text-near-black">
          Accept Invite
        </h1>
        <p className="mb-8 text-center text-sm text-near-black/50">
          Set a password to join the OO admin dashboard
        </p>
        <Suspense fallback={<p className="text-center text-sm text-near-black/50">Loading&hellip;</p>}>
          <AcceptInviteForm />
        </Suspense>
      </div>
    </div>
  );
}
