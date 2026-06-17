// Barrel for transactional email rendering. Route handlers (.ts) import these
// async functions and pass the returned HTML string to resend.emails.send({ html }).
// Keeping JSX here means the senders stay plain .ts files.

import { render } from "@react-email/render";
import * as React from "react";
import {
  WaitlistReminder,
  type WaitlistReminderProps,
} from "./templates/WaitlistReminder";
import {
  WaitlistConfirmation,
  type WaitlistConfirmationProps,
} from "./templates/WaitlistConfirmation";
import {
  AdminNotification,
  type AdminNotificationProps,
} from "./templates/AdminNotification";
import {
  RegistrationConfirmation,
  type RegistrationConfirmationProps,
} from "./templates/RegistrationConfirmation";
import { Approval, type ApprovalProps } from "./templates/Approval";
import { Denial, type DenialProps } from "./templates/Denial";
import { AdminInvite, type AdminInviteProps } from "./templates/AdminInvite";
import {
  WelcomePacket,
  type WelcomePacketProps,
} from "./templates/WelcomePacket";
import {
  EventAnnouncement,
  type EventAnnouncementProps,
} from "./templates/EventAnnouncement";
import {
  EventRegistrationConfirmation,
  type EventRegistrationConfirmationProps,
} from "./templates/EventRegistrationConfirmation";

export function renderWaitlistReminder(
  props: WaitlistReminderProps
): Promise<string> {
  return render(<WaitlistReminder {...props} />);
}

export function renderWaitlistConfirmation(
  props: WaitlistConfirmationProps
): Promise<string> {
  return render(<WaitlistConfirmation {...props} />);
}

export function renderAdminNotification(
  props: AdminNotificationProps
): Promise<string> {
  return render(<AdminNotification {...props} />);
}

export function renderRegistrationConfirmation(
  props: RegistrationConfirmationProps
): Promise<string> {
  return render(<RegistrationConfirmation {...props} />);
}

export function renderApproval(props: ApprovalProps): Promise<string> {
  return render(<Approval {...props} />);
}

export function renderDenial(props: DenialProps): Promise<string> {
  return render(<Denial {...props} />);
}

export function renderAdminInvite(props: AdminInviteProps): Promise<string> {
  return render(<AdminInvite {...props} />);
}

export function renderWelcomePacket(
  props: WelcomePacketProps
): Promise<string> {
  return render(<WelcomePacket {...props} />);
}

export function renderEventAnnouncement(
  props: EventAnnouncementProps
): Promise<string> {
  return render(<EventAnnouncement {...props} />);
}

export function renderEventRegistrationConfirmation(
  props: EventRegistrationConfirmationProps
): Promise<string> {
  return render(<EventRegistrationConfirmation {...props} />);
}
