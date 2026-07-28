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
        destination: "/18%2B/page/:page",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
