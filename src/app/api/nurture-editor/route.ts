import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { renderNurtureEmail } from "@/emails";
import type { NurtureBody, NurtureStep, NurtureTrack } from "@/lib/nurture/sequences";

// Local copy editor backend. DEV ONLY.
//
// This writes to a source file on disk, which is impossible on Vercel (read-only,
// ephemeral filesystem) and would be an unauthenticated content-rewrite endpoint if it
// ever shipped. The guard below makes it 404 anywhere but local development. Copy edits
// are therefore a local change that you commit and deploy like any other.

const COPY_PATH = path.join(process.cwd(), "src", "lib", "nurture", "copy.json");

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }
  return null;
}

type CopyFile = Record<NurtureTrack, NurtureStep[]>;

/** Reject anything that would produce a broken email or a corrupt copy file. */
function validate(data: unknown): string | null {
  if (!data || typeof data !== "object") return "Payload must be an object";
  const file = data as Partial<CopyFile>;

  for (const track of ["mentee", "mentor"] as NurtureTrack[]) {
    const steps = file[track];
    if (!Array.isArray(steps)) return `Missing "${track}" track`;

    const seen = new Set<string>();
    for (const step of steps) {
      if (!step?.key || typeof step.key !== "string") {
        return `A ${track} step is missing its key`;
      }
      if (seen.has(step.key)) return `Duplicate key "${step.key}"`;
      seen.add(step.key);

      if (typeof step.dayOffset !== "number" || step.dayOffset < 0) {
        return `Step "${step.key}" needs a day offset of 0 or more`;
      }

      const body: NurtureBody | undefined = step.body;
      if (!body) return `Step "${step.key}" is missing its body`;
      if (!body.subject?.trim()) {
        return `Step "${step.key}" needs a subject line`;
      }
      if (!body.heading?.trim()) {
        return `Step "${step.key}" needs a heading`;
      }
      if (!Array.isArray(body.paragraphs) || body.paragraphs.length === 0) {
        return `Step "${step.key}" needs at least one paragraph`;
      }
      if (body.cta && !body.cta.path?.startsWith("/")) {
        return `Step "${step.key}" button link must start with "/"`;
      }
    }
  }
  return null;
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;

  const raw = await readFile(COPY_PATH, "utf8");
  return NextResponse.json(JSON.parse(raw));
}

export async function PUT(request: NextRequest) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);

  const problem = validate(body);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  // Trailing newline keeps the file diff-clean against the committed version.
  await writeFile(COPY_PATH, JSON.stringify(body, null, 2) + "\n", "utf8");
  return NextResponse.json({ ok: true });
}

/** Render one body to HTML for the live preview pane. */
export async function POST(request: NextRequest) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const { body } = (await request.json()) as { body: NurtureBody };

  const html = await renderNurtureEmail({
    firstName: "Sam",
    preview: body.subject,
    heading: body.heading,
    paragraphs: body.paragraphs,
    cta: body.cta
      ? {
          label: body.cta.label,
          url: `https://www.opportunityoutdoors.org${body.cta.path}`,
        }
      : undefined,
    unsubscribeUrl:
      "https://www.opportunityoutdoors.org/nurture/unsubscribe?token=sample",
  });

  return NextResponse.json({ html });
}
