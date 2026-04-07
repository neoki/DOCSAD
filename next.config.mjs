/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client", "prisma"],
  experimental: {
    after: true,
  },
};

export default nextConfig;
