/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
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
