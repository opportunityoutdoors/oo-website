import { Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { BrandButton, P } from "../components";
import { colors, fontFamily } from "../theme";

export interface AdminInviteProps {
  roleLabel: string;
  inviterEmail?: string | null;
  inviteUrl: string;
}

export function AdminInvite({ roleLabel, inviterEmail, inviteUrl }: AdminInviteProps) {
  const inviterLine = inviterEmail
    ? `${inviterEmail} invited you`
    : "You've been invited";
  return (
    <EmailLayout preview="You're invited to the Opportunity Outdoors admin dashboard">
      <Text
        style={{
          color: colors.nearBlack,
          fontFamily,
          fontSize: "22px",
          fontWeight: 700,
          margin: "0 0 12px",
        }}
      >
        You&apos;re invited
      </Text>
      <P>
        {inviterLine} to join the Opportunity Outdoors admin dashboard as{" "}
        <strong>{roleLabel}</strong>.
      </P>

      <BrandButton href={inviteUrl}>Accept Invite</BrandButton>

      <P style={{ fontSize: "13px", color: colors.muted }}>
        This link expires in 7 days. If you weren&apos;t expecting this, you can
        ignore the email.
      </P>
      <Text
        style={{
          color: "#999999",
          fontFamily,
          fontSize: "12px",
          wordBreak: "break-all",
          margin: "16px 0 0",
        }}
      >
        {inviteUrl}
      </Text>
    </EmailLayout>
  );
}
