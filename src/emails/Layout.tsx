import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  colors,
  contactEmail,
  emailLogoUrl,
  fontFamily,
  mailingAddress,
  siteUrl,
} from "./theme";

type Variant = "transactional" | "marketing";

interface EmailLayoutProps {
  /** Inbox preview text (hidden in the body). */
  preview: string;
  children: React.ReactNode;
  /**
   * "marketing" adds the CAN-SPAM mailing address + unsubscribe link.
   * "transactional" (default) omits them — receipts must always deliver.
   */
  variant?: Variant;
  /**
   * Unsubscribe URL for the marketing lane. For Resend Broadcasts pass the
   * literal token "{{{RESEND_UNSUBSCRIBE_URL}}}"; Resend substitutes it on send.
   */
  unsubscribeUrl?: string;
}

const main: React.CSSProperties = {
  backgroundColor: colors.cream,
  fontFamily,
  margin: 0,
  padding: "24px 0",
};

const card: React.CSSProperties = {
  backgroundColor: colors.white,
  maxWidth: "600px",
  margin: "0 auto",
  borderRadius: "6px",
  overflow: "hidden",
  border: `1px solid ${colors.border}`,
};

const header: React.CSSProperties = {
  backgroundColor: colors.darkGreen,
  padding: "24px 32px",
  textAlign: "center",
};

const wordmark: React.CSSProperties = {
  color: colors.white,
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "2px",
  textTransform: "uppercase",
  margin: 0,
};

const goldRule: React.CSSProperties = {
  width: "48px",
  height: "3px",
  backgroundColor: colors.gold,
  margin: "10px auto 0",
  border: "none",
};

const content: React.CSSProperties = {
  padding: "32px",
};

const footer: React.CSSProperties = {
  padding: "0 32px 28px",
};

const footerText: React.CSSProperties = {
  color: colors.muted,
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "4px 0",
};

const footerLink: React.CSSProperties = {
  color: colors.darkGreen,
  fontWeight: 600,
};

export function EmailLayout({
  preview,
  children,
  variant = "transactional",
  unsubscribeUrl,
}: EmailLayoutProps) {
  const logo = emailLogoUrl();
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={card}>
          <Section style={header}>
            {logo ? (
              <Img
                src={logo}
                alt="Opportunity Outdoors"
                height={40}
                style={{ margin: "0 auto" }}
              />
            ) : (
              <>
                <Text style={wordmark}>Opportunity Outdoors</Text>
                <Hr style={goldRule} />
              </>
            )}
          </Section>

          <Section style={content}>{children}</Section>

          <Hr style={{ borderColor: colors.border, margin: "0 32px" }} />

          <Section style={footer}>
            <Text style={footerText}>
              A North Carolina 501(c)(3) nonprofit building the next generation of
              ethical, conservation-minded hunters and anglers.
            </Text>
            <Text style={footerText}>
              Questions? Email us at{" "}
              <Link href={`mailto:${contactEmail}`} style={footerLink}>
                {contactEmail}
              </Link>{" "}
              · <Link href={siteUrl()} style={footerLink}>opportunityoutdoors.org</Link>
            </Text>
            {variant === "marketing" && (
              <>
                <Text style={footerText}>{mailingAddress()}</Text>
                <Text style={footerText}>
                  {unsubscribeUrl ? (
                    <Link href={unsubscribeUrl} style={footerLink}>
                      Unsubscribe
                    </Link>
                  ) : (
                    "You received this because you opted in to Opportunity Outdoors updates."
                  )}
                </Text>
              </>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
