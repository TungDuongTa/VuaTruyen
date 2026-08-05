import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  cacheComponents: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Avatar uploads are capped at 1MB; leave headroom for FormData overhead.
      bodySizeLimit: "2mb",
    },
  },

  async redirects() {
    return [
      {
        source: "/latest",
        has: [
          {
            type: "query",
            key: "page",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        destination: "/browse/page-:page",
        permanent: true,
      },
      {
        source: "/latest",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/latest/:path*",
        destination: "/browse",
        permanent: true,
      },
      {
        source: "/18\\+",
        has: [{ type: "query", key: "page", value: "1" }],
        destination: "/18%2B",
        permanent: true,
      },
      {
        source: "/18\\+",
        has: [
          {
            type: "query",
            key: "page",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        destination: "/18%2B/page-:page",
        permanent: true,
      },
      {
        source: "/18\\+/page/:page(\\d+)",
        destination: "/18%2B/page-:page",
        permanent: true,
      },
      // Legacy /ranking?tab=&page= → /ranking/:tab/page-:page
      {
        source: "/ranking",
        has: [
          {
            type: "query",
            key: "tab",
            value: "(?<tab>daily|weekly|monthly|allTime)",
          },
          {
            type: "query",
            key: "page",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        destination: "/ranking/:tab/page-:page",
        permanent: true,
      },
      {
        source: "/ranking",
        has: [
          {
            type: "query",
            key: "page",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        missing: [{ type: "query", key: "tab" }],
        destination: "/ranking/daily/page-:page",
        permanent: true,
      },
      {
        source: "/ranking",
        has: [{ type: "query", key: "tab", value: "daily" }],
        destination: "/ranking",
        permanent: true,
      },
      {
        source: "/ranking",
        has: [
          {
            type: "query",
            key: "tab",
            value: "(?<tab>weekly|monthly|allTime)",
          },
        ],
        destination: "/ranking/:tab",
        permanent: true,
      },
      {
        source:
          "/ranking/:tab(daily|weekly|monthly|allTime)/page/:page(\\d+)",
        destination: "/ranking/:tab/page-:page",
        permanent: true,
      },
      {
        source:
          "/ranking/:tab(daily|weekly|monthly|allTime)/:page(\\d+)",
        destination: "/ranking/:tab/page-:page",
        permanent: true,
      },
      // Old combined bookmarks page → split /bookmarks and /history routes
      {
        source: "/bookmarks",
        has: [
          { type: "query", key: "tab", value: "history" },
          {
            type: "query",
            key: "historyPage",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        destination: "/history?page=:page",
        permanent: true,
      },
      {
        source: "/bookmarks",
        has: [{ type: "query", key: "tab", value: "history" }],
        destination: "/history",
        permanent: true,
      },
      {
        source: "/bookmarks",
        has: [
          {
            type: "query",
            key: "bookmarkPage",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        destination: "/bookmarks?page=:page",
        permanent: true,
      },

      // Legacy /browse?q= → real /browse/filtered routes
      {
        source: "/browse",
        has: [{ type: "query", key: "sort", value: "popular" }],
        destination: "/ranking/weekly",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "q" }],
        destination: "/browse/filtered",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "genres" }],
        destination: "/browse/filtered",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "genre" }],
        destination: "/browse/filtered",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "status" }],
        destination: "/browse/filtered",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "type", value: "manga" }],
        destination: "/browse/filtered?genres=manga",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "type", value: "manhwa" }],
        destination: "/browse/filtered?genres=manhwa",
        permanent: true,
      },
      {
        source: "/browse",
        has: [{ type: "query", key: "type", value: "manhua" }],
        destination: "/browse/filtered?genres=manhua",
        permanent: true,
      },
      {
        source: "/browse/page-:page",
        has: [{ type: "query", key: "q" }],
        destination: "/browse/filtered/page-:page",
        permanent: true,
      },
      {
        source: "/browse/page-:page",
        has: [{ type: "query", key: "genres" }],
        destination: "/browse/filtered/page-:page",
        permanent: true,
      },
      {
        source: "/browse/page-:page",
        has: [{ type: "query", key: "genre" }],
        destination: "/browse/filtered/page-:page",
        permanent: true,
      },
      {
        source: "/browse/page-:page",
        has: [{ type: "query", key: "status" }],
        destination: "/browse/filtered/page-:page",
        permanent: true,
      },
      {
        source: "/browse",
        has: [
          {
            type: "query",
            key: "page",
            value: "(?<page>[2-9]|[1-9][0-9]+)",
          },
        ],
        missing: [
          { type: "query", key: "q" },
          { type: "query", key: "genres" },
          { type: "query", key: "genre" },
          { type: "query", key: "status" },
        ],
        destination: "/browse/page-:page",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
