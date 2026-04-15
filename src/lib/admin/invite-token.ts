import { createHash, randomBytes } from "crypto";

export function generateInviteToken() {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashInviteToken(token);
  return { token, tokenHash };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const INVITE_TTL_DAYS = 7;

export function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
