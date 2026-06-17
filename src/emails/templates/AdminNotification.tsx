import { Hr, Text } from "@react-email/components";
import * as React from "react";
import { EmailLayout } from "../Layout";
import { P } from "../components";
import { colors, fontFamily } from "../theme";

export interface AdminNotificationProps {
  heading: string;
  /** Ordered key/value rows shown as "Label: value". */
  rows: Array<{ label: string; value: string }>;
  /** Optional free-text body (e.g. a contact message), shown below a divider. */
  body?: string;
}

/** Internal-facing alert sent to staff (contact form, sponsorship inquiry, etc.). */
export function AdminNotification({ heading, rows, body }: AdminNotificationProps) {
  return (
    <EmailLayout preview={heading}>
      <Text
        style={{
          color: colors.nearBlack,
          fontFamily,
          fontSize: "18px",
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        {heading}
      </Text>

      {rows.map((row) => (
        <Text
          key={row.label}
          style={{
            color: colors.nearBlack,
            fontFamily,
            fontSize: "15px",
            lineHeight: "1.5",
            margin: "0 0 6px",
          }}
        >
          <strong>{row.label}:</strong> {row.value}
        </Text>
      ))}

      {body ? (
        <>
          <Hr style={{ borderColor: colors.border, margin: "16px 0" }} />
          <P style={{ whiteSpace: "pre-wrap" }}>{body}</P>
        </>
      ) : null}
    </EmailLayout>
  );
}
