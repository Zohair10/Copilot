/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/',
    GITHUB_METRICS_URL: process.env.GITHUB_METRICS_URL,
    GITHUB_BILLING_URL: process.env.GITHUB_BILLING_URL,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  },
}

module.exports = nextConfig
