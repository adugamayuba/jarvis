export const INVESTOR_PORTAL_HOST = "investors.reelin.ai";
export const INVESTOR_PORTAL_URL = `https://${INVESTOR_PORTAL_HOST}`;

export function isInvestorPortalHost(host?: string): boolean {
  const h = host ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return h === INVESTOR_PORTAL_HOST || h === `www.${INVESTOR_PORTAL_HOST}`;
}

/** Map internal /portal paths to clean URLs on investors.reelin.ai */
export function portalHref(internalPath: string): string {
  if (!isInvestorPortalHost()) return internalPath;

  const map: Record<string, string> = {
    "/portal": "/dashboard",
    "/portal/login": "/",
    "/portal/cap-table": "/cap-table",
    "/portal/safe": "/safe",
    "/portal/data-room": "/data-room",
  };
  return map[internalPath] ?? (internalPath.replace(/^\/portal/, "") || "/");
}

export function portalHomeHref(): string {
  return isInvestorPortalHost() ? "/dashboard" : "/portal";
}

export function investorLoginUrl(): string {
  return INVESTOR_PORTAL_URL;
}
