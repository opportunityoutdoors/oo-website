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
  const inviterLine = inviterEmail
    ? `${inviterEmail} invited you`
    : "You&rsquo;ve been invited";

  await resend.emails.send({
    from: "Opportunity Outdoors <notifications@send.opportunityoutdoors.org>",
    to,
    subject: "You're invited to the Opportunity Outdoors admin dashboard",
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
        <h1 style="font-size: 22px; margin: 0 0 12px;">You&rsquo;re invited</h1>
        <p style="font-size: 15px; line-height: 1.5; margin: 0 0 16px;">
          ${inviterLine} to join the Opportunity Outdoors admin dashboard as <strong>${roleLabel}</strong>.
        </p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: #2d4a2b; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 4px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; font-size: 13px;">Accept Invite</a>
        </p>
        <p style="font-size: 13px; line-height: 1.5; color: #666; margin: 0 0 8px;">
          This link expires in 7 days. If you weren&rsquo;t expecting this, you can ignore the email.
        </p>
        <p style="font-size: 12px; color: #999; word-break: break-all; margin-top: 16px;">${inviteUrl}</p>
      </div>
    `,
  });
}
