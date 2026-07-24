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
    ];
  },
};

export default nextConfig;
