import { NOTIFICATIONS_FROM, REPLY_TO } from "@/lib/email/from";
import { renderAdminInvite } from "@/emails";

export async function sendInviteEmail({
  to,
  role,
  inviteUrl,
  inviterEmail,
}: {
  to: string;
  role: "admin" | "editor";
  inviteUrl: string;
  inviterEmail: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY missing — skipping invite email");
    return;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const roleLabel = role === "admin" ? "Admin" : "Editor";

  await resend.emails.send({
    from: NOTIFICATIONS_FROM,
    replyTo: REPLY_TO,
    to,
    subject: "You're invited to the Opportunity Outdoors admin dashboard",
    html: await renderAdminInvite({ roleLabel, inviterEmail, inviteUrl }),
  });
}
