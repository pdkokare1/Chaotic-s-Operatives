// apps/web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@operative/shared"], // Critical for monorepo
};

module.exports = nextConfig;
