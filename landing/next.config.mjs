// Set only in the Pages build (workflow); empty for local dev.
const basePath = process.env.PAGES_BASE_PATH || "";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Off so Motion's on-mount hero entrance isn't cancelled by dev double-mount.
  reactStrictMode: false,
  // Static HTML/CSS/JS export for GitHub Pages (no Node server).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
};
export default nextConfig;
