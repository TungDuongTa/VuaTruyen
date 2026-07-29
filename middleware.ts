import { NextResponse, type NextRequest } from "next/server";
import { hasBrowseFilterQuery } from "@/lib/browse-params";

const BROWSE_PATH_RE = /^\/browse(?:\/(page-\d+))?$/;

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const { pathname, searchParams } = url;

  if (pathname.startsWith("/browse/filtered")) {
    return NextResponse.next();
  }

  const match = pathname.match(BROWSE_PATH_RE);
  if (!match) {
    return NextResponse.next();
  }

  const hasFilters = hasBrowseFilterQuery(searchParams);
  const legacyPage = searchParams.get("page");

  if (legacyPage && /^\d+$/.test(legacyPage)) {
    const pageNum = Number.parseInt(legacyPage, 10);
    searchParams.delete("page");
    url.search = searchParams.toString();

    if (pageNum > 1) {
      url.pathname = `/browse/page-${pageNum}`;
    }

    if (hasFilters) {
      url.pathname =
        pageNum > 1
          ? `/browse/filtered/page-${pageNum}`
          : "/browse/filtered";
      return NextResponse.rewrite(url);
    }

    if (pageNum > 1) {
      return NextResponse.redirect(url, 308);
    }

    if (pageNum === 1) {
      const target = url.search ? `${url.pathname}?${url.search}` : url.pathname;
      return NextResponse.redirect(target, 308);
    }
  }

  if (hasFilters) {
    const pageSlug = match[1];
    url.pathname = pageSlug
      ? `/browse/filtered/${pageSlug}`
      : "/browse/filtered";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/browse", "/browse/:path*"],
};
