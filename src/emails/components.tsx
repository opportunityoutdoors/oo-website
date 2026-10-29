import { Button, Section, Text } from "@react-email/components";
import * as React from "react";
import { colors, fontFamily } from "./theme";

const pStyle: React.CSSProperties = {
  color: colors.nearBlack,
  fontFamily,
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px",
};

/** Standard body paragraph. */
export function P({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return <Text style={{ ...pStyle, ...style }}>{children}</Text>;
}

/** "Hey {name}," greeting line. */
export function Greeting({ name }: { name?: string }) {
  return <P>Hey {name?.trim() || "there"},</P>;
}

/** Cream callout box for highlighting key details. */
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Section
      style={{
        backgroundColor: colors.cream,
        borderRadius: "4px",
        padding: "16px 20px",
        margin: "0 0 24px",
      }}
    >
      {children}
    </Section>
  );
}

/** Small label used inside callouts. */
export function CalloutLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: colors.nearBlack,
        fontFamily,
        fontSize: "14px",
        fontWeight: 600,
        margin: "0 0 4px",
      }}
    >
      {children}
    </Text>
  );
}

/** Plain detail line (14px) used inside callouts. */
export function CalloutLine({ children }: { children: React.ReactNode }) {
  return (
    <Text
      style={{
        color: colors.nearBlack,
        fontFamily,
        fontSize: "14px",
        lineHeight: "1.5",
        margin: "0 0 4px",
      }}
    >
      {children}
    </Text>
  );
}

/** Primary green call-to-action button. */
/** `outline` is the quieter second choice under a main button, like "I Can't Make It". */
export function BrandButton({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline";
}) {
  const outline = variant === "outline";
  return (
    <Section style={{ textAlign: "center", margin: "8px 0 24px" }}>
      <Button
        href={href}
        style={{
          backgroundColor: outline ? colors.white : colors.darkGreen,
          color: outline ? colors.darkGreen : colors.white,
          border: `2px solid ${colors.darkGreen}`,
          fontFamily,
          fontSize: "15px",
          fontWeight: 600,
          textDecoration: "none",
          padding: "12px 28px",
          borderRadius: "4px",
        }}
      >
        {children}
      </Button>
    </Section>
  );
}

/** "-The Opportunity Outdoors Team" sign-off. Hyphen, never an em-dash. */
export function Signoff() {
  return <P>-The Opportunity Outdoors Team</P>;
}
