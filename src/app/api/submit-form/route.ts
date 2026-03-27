import { NextRequest, NextResponse } from "next/server";

/* ─── Types ─── */

type FormType =
  | "newsletter"
  | "contact"
  | "mentee-signup"
  | "mentor-signup"
  | "event-registration"
  | "camp-waitlist"
  | "camp-registration"
  | "sponsorship";

interface SubmitPayload {
  formType: FormType;
  data: Record<string, string | string[] | boolean>;
}

/* ─── Validation helpers ─── */

const VALID_FORM_TYPES: FormType[] = [
  "newsletter",
  "contact",
  "mentee-signup",
  "mentor-signup",
  "event-registration",
  "camp-waitlist",
  "camp-registration",
  "sponsorship",
];

const REQUIRED_FIELDS: Record<FormType, string[]> = {
  newsletter: ["email"],
  contact: ["firstName", "lastName", "email", "subject", "message"],
  "mentee-signup": [
    "firstName", "lastName", "dateOfBirth", "sex", "email", "phone",
    "cityState", "outdoorInterests", "experienceLevel", "gearStatus", "howHeard",
  ],
  "mentor-signup": [
    "firstName", "lastName", "dateOfBirth", "sex", "email", "phone",
    "cityState", "outdoorSkills", "yearsExperience", "mentoredBefore", "howHeard",
  ],
  "event-registration": ["firstName", "lastName", "email", "phone", "cityState", "howHeard"],
  "camp-waitlist": ["firstName", "lastName", "email", "phone", "role"],
  "camp-registration": ["email", "tshirtSize", "emergencyContactName", "emergencyContactPhone", "transportation", "waiver"],
  sponsorship: ["companyName", "contactName", "email"],
};

function sanitize(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* ─── Rate limiting (in-memory, per-process) ─── */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT;
}

/* ─── Tab + column mapping per form type ─── */

interface SheetTarget {
  tab: string;
  row: string[];
}

function buildSheetTarget(formType: FormType, data: Record<string, string | string[] | boolean>): SheetTarget {
  const timestamp = new Date().toISOString();
  const str = (key: string) => sanitize(data[key]);
  const arr = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as string[]).join(", ") : sanitize(data[key]);

  switch (formType) {
    case "newsletter":
      return {
        tab: "Newsletter",
        row: [timestamp, str("email"), "Website"],
      };

    case "contact":
      return {
        tab: "Contact",
        row: [timestamp, str("firstName"), str("lastName"), str("email"), str("subject"), str("message")],
      };

    case "mentee-signup":
      return {
        tab: "Mentee Applications",
        row: [
          timestamp, str("firstName"), str("lastName"), str("dateOfBirth"), str("sex"),
          str("email"), str("phone"), str("cityState"), arr("outdoorInterests"),
          str("experienceLevel"), str("gearStatus"), str("howHeard"), str("aboutYourself"),
        ],
      };

    case "mentor-signup":
      return {
        tab: "Mentor Applications",
        row: [
          timestamp, str("firstName"), str("lastName"), str("dateOfBirth"), str("sex"),
          str("email"), str("phone"), str("cityState"), arr("outdoorSkills"),
          str("yearsExperience"), str("mentoredBefore"), str("howHeard"), str("whyMentor"),
        ],
      };

    case "event-registration":
      return {
        tab: "Event Registrations",
        row: [
          timestamp, str("firstName"), str("lastName"), str("email"), str("phone"),
          str("cityState"), str("eventName"), str("eventType"), str("howHeard"),
        ],
      };

    case "camp-waitlist":
      return {
        tab: "Camp Waitlist",
        row: [timestamp, str("firstName"), str("lastName"), str("email"), str("phone"), str("role"), str("eventName")],
      };

    case "camp-registration":
      return {
        tab: "Camp Registration",
        row: [
          timestamp, str("email"), str("tshirtSize"), str("emergencyContactName"),
          str("emergencyContactPhone"), str("transportation"), str("dietaryMedical"),
          data.waiver ? "TRUE" : "", str("eventName"),
        ],
      };

    case "sponsorship":
      return {
        tab: "Sponsorship",
        row: [
          timestamp, str("companyName"),
          str("contactName").split(" ")[0], str("contactName").split(" ").slice(1).join(" "),
          str("email"), str("phone"), str("budgetRange"), arr("opportunityInterest"), str("aboutCompany"),
        ],
      };
  }
}

/* ─── Google Sheets write ─── */

async function appendToSheet(tab: string, row: string[]): Promise<void> {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SUBMISSIONS_ID;

  if (!privateKey || !clientEmail || !spreadsheetId) {
    console.warn("Google Sheets credentials not configured — logging submission instead:");
    console.log("Tab:", tab, "Row data:", JSON.stringify(row));
    return;
  }

  const { google } = await import("googleapis");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n").replace(/^"|"$/g, ""),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `'${tab}'!A:Z`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [row],
    },
  });
}

/* ─── Handler ─── */

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body: SubmitPayload = await request.json();
    const { formType, data } = body;

    // Validate formType
    if (!VALID_FORM_TYPES.includes(formType)) {
      return NextResponse.json({ error: "Invalid form type" }, { status: 400 });
    }

    // Validate required fields
    const required = REQUIRED_FIELDS[formType];
    const missing = required.filter((field) => {
      const val = data[field];
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === "boolean") return false;
      return !val || (typeof val === "string" && val.trim() === "");
    });

    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate email
    const email = typeof data.email === "string" ? data.email : "";
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    // Build row and write to form-specific Google Sheets tab
    const { tab, row } = buildSheetTarget(formType, data);
    await appendToSheet(tab, row);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
