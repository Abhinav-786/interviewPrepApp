/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep puppeteer-core as a native Node module — cannot be bundled by webpack
  serverExternalPackages: ['puppeteer-core'],
};

export default nextConfig;
