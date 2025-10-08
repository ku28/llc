/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable image optimization for Electron
  images: {
    unoptimized: true,
  },
}
module.exports = nextConfig
