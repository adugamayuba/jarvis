/** Normalize backend URL (add https, strip trailing slash). */
export function normalizeBackendUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/$/, "");
}

/** Direct backend URL for file uploads (bypasses Vercel proxy body limits). */
export function getDirectApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL
    ? normalizeBackendUrl(process.env.NEXT_PUBLIC_API_URL)
    : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
}
