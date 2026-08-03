import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";

// Local copy editor backend. DEV ONLY.
//
// Same shape as the nurture editor: it writes to a source file on disk, which is
// impossible on Vercel (read-only, ephemeral filesystem) and would be an unauthenticated
// content-rewrite endpoint if it ever shipped. Copy edits are a local change you commit
// and deploy like any other.
//
// Decks are registered here rather than inferred from the filesystem, so this can never
// be pointed at an arbitrary path.

type Deck = {
  key: string;
  label: string;
  description: string;
  file: string;
  /** Human-readable label and hint per field, so the editor is not a wall of JSON keys. */
  fields: { key: string; label: string; hint?: string; multiline?: boolean }[];
};

export const DECKS: Deck[] = [
  {
    key: "impact",
    label: "Impact page",
    description:
      "The explanatory text on /admin/impact. Numbers are computed and not editable here.",
    file: "src/content/impact-copy.json",
    fields: [
      {
        key: "pageIntro",
        label: "Page introduction",
        hint: "Sits under the Impact heading and explains the three tiers.",
        multiline: true,
      },
      { key: "tier1Name", label: "Tier 1 name" },
      { key: "tier1Gloss", label: "Tier 1 description", multiline: true },
      { key: "tier2Name", label: "Tier 2 name" },
      { key: "tier2Gloss", label: "Tier 2 description", multiline: true },
      {
        key: "tier2Empty",
        label: "Tier 2 empty state",
        hint: "Shown until there are matched pre/post pairs.",
        multiline: true,
      },
      { key: "tier3Name", label: "Tier 3 name" },
      { key: "tier3Gloss", label: "Tier 3 description", multiline: true },
      {
        key: "tier3Empty",
        label: "Tier 3 empty state",
        hint: "Shown until six-month follow-ups start returning.",
        multiline: true,
      },
      { key: "byEventHeading", label: "Per-event table heading" },
      { key: "byEventNote", label: "Per-event table footnote", multiline: true },
      { key: "barriersHeading", label: "Barriers list heading" },
    ],
  },
];

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }
  return null;
}

function findDeck(key: string | null): Deck | undefined {
  return DECKS.find((d) => d.key === key);
}

export async function GET(request: NextRequest) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const key = request.nextUrl.searchParams.get("deck");
  if (!key) {
    return NextResponse.json({
      decks: DECKS.map(({ key, label, description }) => ({
        key,
        label,
        description,
      })),
    });
  }

  const deck = findDeck(key);
  if (!deck) {
    return NextResponse.json({ error: "Unknown deck" }, { status: 404 });
  }

  const raw = await readFile(path.join(process.cwd(), deck.file), "utf8");
  return NextResponse.json({
    key: deck.key,
    label: deck.label,
    description: deck.description,
    fields: deck.fields,
    values: JSON.parse(raw),
  });
}

export async function PUT(request: NextRequest) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const deck = findDeck(body?.deck);
  if (!deck) {
    return NextResponse.json({ error: "Unknown deck" }, { status: 404 });
  }

  const values = body?.values;
  if (!values || typeof values !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Only known keys are written, and every one must be a non-empty string. A blank tier
  // description would render as a gap on the page rather than an obvious mistake.
  const out: Record<string, string> = {};
  for (const field of deck.fields) {
    const v = values[field.key];
    if (typeof v !== "string" || !v.trim()) {
      return NextResponse.json(
        { error: `"${field.label}" cannot be empty` },
        { status: 400 }
      );
    }
    out[field.key] = v.trim();
  }

  await writeFile(
    path.join(process.cwd(), deck.file),
    JSON.stringify(out, null, 2) + "\n",
    "utf8"
  );

  return NextResponse.json({ ok: true });
}
