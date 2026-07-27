import type { MetadataRoute } from "next";
import { toAbsoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/bookmarks",
          "/history",
          "/profile",
          "/sign-in",
          "/sign-up",
          // Chapter reader requires login — keep crawl budget on public manga pages.
          "/manga/*/chapter/",
        ],
      },
    ],
    sitemap: [toAbsoluteUrl("/sitemap.xml")],
  };
}
