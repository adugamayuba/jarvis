export const PRODUCT_ROADMAP_HOST = "prd.reelin.ai";
export const PRODUCT_ROADMAP_URL = `https://${PRODUCT_ROADMAP_HOST}`;

export function isProductRoadmapHost(host?: string): boolean {
  const h = host ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return h === PRODUCT_ROADMAP_HOST || h === `www.${PRODUCT_ROADMAP_HOST}`;
}
