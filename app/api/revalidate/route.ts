import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { CACHE_TAGS, mangaTag } from "@/lib/server/cache-tags";

type RevalidateBody = {
  slug?: string;
  /** When true, also refresh category cache (rarely needed). */
  categories?: boolean;
};

function authorize(request: Request): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  const querySecret = new URL(request.url).searchParams.get("secret");
  return querySecret === secret;
}

function normalizeSlug(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const slug = raw.trim().toLowerCase();
  if (!slug || slug.length > 200 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return null;
  }
  return slug;
}

/**
 * Crawler webhook: bust Data Cache tags + ISR paths after chapter sync.
 *
 * POST /api/revalidate
 * Authorization: Bearer <REVALIDATE_SECRET>
 * Body: { "slug": "lop-hoc-gia-dinh" }
 */
export async function POST(request: Request) {
  if (!process.env.REVALIDATE_SECRET) {
    return NextResponse.json(
      { ok: false, error: "REVALIDATE_SECRET is not configured" },
      { status: 500 },
    );
  }

  if (!authorize(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: RevalidateBody = {};
  try {
    body = (await request.json()) as RevalidateBody;
  } catch {
    body = {};
  }

  const slug = normalizeSlug(body.slug);
  if (!slug) {
    return NextResponse.json(
      { ok: false, error: "Valid slug is required" },
      { status: 400 },
    );
  }

  const tags = [
    mangaTag(slug),
    CACHE_TAGS.home,
    CACHE_TAGS.browseLists,
    CACHE_TAGS.adultLists,
  ];
  if (body.categories) {
    tags.push(CACHE_TAGS.categories);
  }

  for (const tag of tags) {
    // Webhook: expire immediately so the next visitor gets fresh crawl data.
    revalidateTag(tag, { expire: 0 });
  }

  revalidatePath("/");
  revalidatePath("/browse");
  revalidatePath("/18+");
  // layout = manga page + nested chapter reader routes for this slug
  revalidatePath(`/manga/${slug}`, "layout");

  return NextResponse.json({
    ok: true,
    slug,
    revalidated: { tags, paths: ["/", "/browse", "/18+", `/manga/${slug}`] },
  });
}
