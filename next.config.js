/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // Disable filesystem caching in dev to avoid missing pack.gz warnings
    if (dev) {
      config.cache = false
    }
    return config
  },
}

module.exports = nextConfig

