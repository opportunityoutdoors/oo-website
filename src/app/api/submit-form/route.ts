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

/* ─── Column mapping ─── */

function buildRow(formType: FormType, data: Record<string, string | string[] | boolean>): string[] {
  const timestamp = new Date().toISOString();
  const str = (key: string) => sanitize(data[key]);
  const arr = (key: string) =>
    Array.isArray(data[key]) ? (data[key] as string[]).join(", ") : sanitize(data[key]);

  // Event/Source mapping
  const eventSourceMap: Record<FormType, string> = {
    newsletter: "Newsletter",
    contact: "Contact Form",
    "mentee-signup": "Mentee Signup",
    "mentor-signup": "Mentor Signup",
    "event-registration": str("eventName") || "Event Registration",
    "camp-waitlist": str("eventName") || "Camp Waitlist",
    "camp-registration": str("eventName") || "Camp Registration",
    sponsorship: "Sponsorship Inquiry",
  };

  // Event Type mapping
  const eventTypeMap: Record<FormType, string> = {
    newsletter: "Newsletter",
    contact: "Contact",
    "mentee-signup": "Mentee Signup",
    "mentor-signup": "Mentor Signup",
    "event-registration": str("eventType") || "Community",
    "camp-waitlist": str("eventType") || "Camp",
    "camp-registration": str("eventType") || "Camp",
    sponsorship: "Sponsorship",
  };

  // Payment status defaults
  const paymentStatusMap: Record<FormType, string> = {
    newsletter: "N/A",
    contact: "N/A",
    "mentee-signup": "N/A",
    "mentor-signup": "N/A",
    "event-registration": data.registrationFee ? "Pending" : "N/A",
    "camp-waitlist": "N/A",
    "camp-registration": "Pending",
    sponsorship: "N/A",
  };

  // Tab 2 column order (matches spec §8.7)
  return [
    timestamp,                                    // Timestamp
    str("email"),                                 // Email
    str("firstName") || str("contactName"),        // First Name
    str("lastName"),                              // Last Name
    str("phone"),                                 // Phone
    str("cityState"),                             // City/State
    eventSourceMap[formType],                     // Event / Source
    eventTypeMap[formType],                       // Event Type
    str("experienceLevel"),                       // Experience Level
    str("gearStatus"),                            // Has Gear
    str("howHeard"),                              // How Heard
    str("hunterSafetyCert"),                      // Hunter Safety Cert
    str("tshirtSize"),                            // T-Shirt Size
    str("emergencyContactName"),                  // Emergency Contact Name
    str("emergencyContactPhone"),                 // Emergency Contact Phone
    str("transportation"),                        // Transportation
    str("dietaryMedical"),                        // Dietary / Medical
    data.waiver ? "TRUE" : "",                    // Waiver
    str("paymentMethod"),                         // Payment Method
    str("message") || str("aboutYourself") || str("whyMentor") || str("aboutCompany"), // Free Text
    str("companyName"),                           // Company Name
    arr("opportunityInterest"),                   // Opportunity Interest
    str("budgetRange"),                           // Budget Range
    str("subject"),                               // Subject
    formType === "event-registration" || formType === "camp-registration" ? "Confirmed" : "", // Registration Status
    paymentStatusMap[formType],                   // Payment Status
    "",                                           // Notes (blank)
  ];
}

/* ─── Google Sheets write ─── */

async function appendToSheet(row: string[]): Promise<void> {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SUBMISSIONS_ID;

  if (!privateKey || !clientEmail || !spreadsheetId) {
    console.warn("Google Sheets credentials not configured — logging submission instead:");
    console.log("Row data:", JSON.stringify(row));
    return;
  }

  // Dynamic import to avoid bundling googleapis on every request
  const { google } = await import("googleapis");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "'Event Registrations'!A:Z",
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

    // Build row and write to Google Sheets
    const row = buildRow(formType, data);
    await appendToSheet(row);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Form submission error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
