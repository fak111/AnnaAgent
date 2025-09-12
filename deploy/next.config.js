/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // We stick to Pages Router for minimal change, but allow fetch caching control
  },
  // Ensure server-only envs are not exposed by default
  env: {
    // Intentionally empty; use process.env on server
  }
};

module.exports = nextConfig;

