import type { NextConfig } from "next";

function getBackendUrl(): string {
  let url =
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8080";

  // Auto-add https:// if the user pasted just the hostname
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  // Strip trailing slash
  return url.replace(/\/$/, "");
}

const nextConfig: NextConfig = {
  // Expose backend URL to the browser for direct uploads (multipart bypasses Vercel proxy)
  env: {
    NEXT_PUBLIC_API_URL: getBackendUrl(),
  },
  async rewrites() {
    const backendUrl = getBackendUrl();

    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
