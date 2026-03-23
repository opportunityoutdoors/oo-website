import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-sanity-webhook-secret");
  if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  const body = await req.json();
  const { _type, slug } = body;

  // Revalidate relevant paths based on content type
  switch (_type) {
    case "event":
      revalidatePath("/events");
      if (slug?.current) revalidatePath(`/events/${slug.current}`);
      revalidatePath("/");
      break;
    case "blogPost":
      revalidatePath("/blog");
      if (slug?.current) revalidatePath(`/blog/${slug.current}`);
      revalidatePath("/");
      break;
    case "podcastEpisode":
      revalidatePath("/podcast");
      break;
    case "teamMember":
      revalidatePath("/about");
      break;
    case "faqItem":
      revalidatePath("/faq");
      break;
    case "partner":
      revalidatePath("/about");
      revalidatePath("/donate");
      break;
    default:
      revalidatePath("/");
  }

  return NextResponse.json({ revalidated: true });
}
