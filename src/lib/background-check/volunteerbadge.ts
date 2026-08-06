import type { BackgroundCheckStatus } from "./eligibility";
import {
  ProviderError,
  type BackgroundCheckProvider,
  type CheckState,
  type InviteInput,
  type InviteResult,
  type ProviderBalance,
} from "./provider";

// VolunteerBadge implementation.
//
// Everything here was verified against their live sandbox rather than taken from the docs,
// because two things did not match: the docs give no base URL, and unknown routes do not
// 404.

/**
 * WWW IS REQUIRED. volunteerbadge.com 308-redirects to www, and while fetch would follow
 * that for a GET, a redirected POST is not something to rely on. Their apex behaves exactly
 * like ours, which is what put Stripe's webhook out of action for a day.
 */
const BASE = "https://www.volunteerbadge.com/api/v1";

/** Their API is fast, but a hung request must not hold a registration open. */
const TIMEOUT_MS = 15_000;

export class VolunteerBadgeProvider implements BackgroundCheckProvider {
  readonly name = "volunteerbadge";

  constructor(
    private readonly apiKey: string,
    /**
     * Application template that defines which searches run and what the applicant sees.
     * Comes from their dashboard: there is no endpoint that lists templates, so it cannot
     * be discovered at runtime.
     */
    private readonly templateId: string | null
  ) {}

  async invite(input: InviteInput): Promise<InviteResult> {
    if (!this.templateId) {
      throw new ProviderError(
        "VOLUNTEERBADGE_TEMPLATE_ID is not set. Copy the application template id from the VolunteerBadge dashboard."
      );
    }

    // POST /applications, not POST /checks. The applications flow emails the person a link
    // and collects date of birth, SSN and identity on VolunteerBadge's pages. POST /checks
    // would require sending an SSN from here, putting the most sensitive category of data
    // this organisation could hold onto its own servers and into its logs. Not worth it to
    // save a round trip.
    const body = await this.request<{
      applicationId?: string;
      id?: string;
      checkId?: string;
      // `applyUrl` is the real field name, confirmed against a live response. The others
      // were guesses from the docs and none of them appear; reading only those threw the
      // URL away, which matters because in sandbox no email is sent and this link is the
      // only way to reach the form.
      applyUrl?: string;
      url?: string;
      applicationUrl?: string;
      link?: string;
      expiresAt?: string;
      sandbox?: boolean;
      mode?: string;
    }>("POST", "/applications", {
      templateId: this.templateId,
      email: input.email,
      firstName: input.firstName ?? undefined,
      lastName: input.lastName ?? undefined,
      deliveryMethod: "email",
    });

    // Their examples name the identifier differently in different places, so accept any of
    // them rather than dropping a successful invite over a field name.
    const providerCheckId = body.applicationId ?? body.id ?? body.checkId ?? null;
    if (!providerCheckId) {
      throw new ProviderError(
        "VolunteerBadge accepted the invite but returned no id; cannot track it",
        200,
        JSON.stringify(body).slice(0, 500)
      );
    }

    // A sandbox response is a stub: no email is sent, no volunteer record is created, and
    // no credit is consumed. Logged loudly so a test result is never mistaken for a real
    // one, which is easy to do when the shape is otherwise identical.
    if (body.sandbox === true || body.mode === "test") {
      console.warn(
        `VolunteerBadge SANDBOX: application ${providerCheckId} is a stub. No email sent. ` +
          `Reach the form directly at ${body.applyUrl ?? "(no url returned)"}`
      );
    }

    return {
      providerCheckId,
      applicantUrl:
        body.applyUrl ?? body.url ?? body.applicationUrl ?? body.link ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      sandbox: body.sandbox === true || body.mode === "test",
    };
  }

  async getStatus(providerCheckId: string): Promise<CheckState> {
    const body = await this.request<{ status?: string; completedAt?: string; completed_at?: string }>(
      "GET",
      `/checks/${encodeURIComponent(providerCheckId)}`
    );

    const raw = body.status ?? "unknown";
    const completed = body.completedAt ?? body.completed_at ?? null;

    return {
      status: mapStatus(raw),
      completedAt: completed ? new Date(completed) : null,
      raw,
    };
  }

  async getBalance(): Promise<ProviderBalance> {
    const body = await this.request<{ organization?: string; credits?: number }>(
      "GET",
      "/credits"
    );
    return {
      credits: Number(body.credits ?? 0),
      organization: body.organization ?? "unknown",
    };
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    payload?: unknown
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${BASE}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          ...(payload ? { "Content-Type": "application/json" } : {}),
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
        // Their apex redirects; if a path ever does too, fail loudly rather than silently
        // replaying a POST somewhere unexpected.
        redirect: "error",
      });
    } catch (err) {
      throw new ProviderError(
        `VolunteerBadge request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      clearTimeout(timer);
    }

    const text = await res.text();

    // THE STATUS CODE IS NOT ENOUGH. An unknown path on their API returns 200 with the
    // marketing site's HTML rather than a 404, so a typo'd endpoint looks like success and
    // then explodes on JSON.parse with an incomprehensible message. Content type is the
    // only reliable signal that a real API route was reached.
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new ProviderError(
        `VolunteerBadge returned ${contentType || "no content type"} for ${method} ${path}. ` +
          `Their API serves the marketing site for unknown routes, so this usually means the path is wrong.`,
        res.status,
        text.slice(0, 200)
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new ProviderError(
        `VolunteerBadge returned unparseable JSON for ${method} ${path}`,
        res.status,
        text.slice(0, 300)
      );
    }

    if (!res.ok) {
      const err = parsed as { error?: string; message?: string; code?: string };
      throw new ProviderError(
        `VolunteerBadge ${method} ${path} failed: ${err.message ?? err.error ?? res.statusText}` +
          (err.code ? ` (${err.code})` : ""),
        res.status,
        text.slice(0, 300)
      );
    }

    return parsed as T;
  }
}

/**
 * Their status vocabulary onto ours.
 *
 * Unrecognised values map to 'error', never to 'clear'. A status we do not understand must
 * not be read as clearance, and 'error' surfaces it to a human instead of burying it.
 */
export function mapStatus(raw: string): BackgroundCheckStatus {
  // Normalised because their vocabulary mixes spaces and underscores across the API, the
  // dashboard and the docs ("under review" vs "under_review"). Matching the literal string
  // missed both spellings, which would have mapped a real records-found result to 'error'.
  switch (raw.toLowerCase().replace(/[\s-]+/g, "_")) {
    case "clear":
    case "clear_no_records":
    case "all_cleared":
    case "complete":
    case "completed":
    case "passed":
      return "clear";

    // 'consider' is the one that needs a human: records were found AND confirmed by their
    // CRA reviewers, so the report is released and a decision is owed.
    case "consider":
    case "records_found":
    case "flagged":
      return "flagged";

    // 'under review' is NOT a flag for us. Records surfaced, but their CRA team is still
    // assessing and deliberately withholds the report until they have stripped unrelated
    // material. Nothing is owed by us yet, so this is a wait, not a decision. Treating it
    // as 'flagged' would put unreviewed hits in front of an admin who cannot act on them.
    case "under_review":
    case "investigating_hits":
    case "pending":
    case "processing":
    case "in_progress":
    case "screening":
    case "submitted":
      return "pending";

    // Their record of a decision we made in their dashboard. Mirrored so the two systems
    // cannot disagree about whether someone was turned away.
    case "declined":
      return "declined";
    case "approved":
      return "clear";
    case "invited":
    case "sent":
    case "awaiting_applicant":
      return "invited";
    case "cancelled":
    case "canceled":
    case "expired":
      return "expired";
    default:
      return "error";
  }
}

/** Built per call; no module-scope construction, so a missing key cannot break unrelated routes. */
export function getBackgroundCheckProvider(): VolunteerBadgeProvider {
  const key = process.env.VOLUNTEERBADGE_API_KEY;
  if (!key) throw new ProviderError("VOLUNTEERBADGE_API_KEY is not set");

  // Accepts VOLUNTEERBADGE_TEMPLATE as well as the canonical _ID form. The shorter name is
  // the obvious thing to type, and it was: a live registration paid, ordered no check, and
  // reset itself to 'none' because the _ID lookup came back undefined. The failure was
  // correct in every respect and completely invisible from outside, which is the worst
  // combination. Tolerating both spellings costs nothing.
  const templateId =
    process.env.VOLUNTEERBADGE_TEMPLATE_ID ??
    process.env.VOLUNTEERBADGE_TEMPLATE ??
    null;

  return new VolunteerBadgeProvider(key, templateId);
}

/** True when the configured key is a sandbox key. */
export function isSandbox(): boolean {
  return (process.env.VOLUNTEERBADGE_API_KEY ?? "").startsWith("vb_test_");
}
