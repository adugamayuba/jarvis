import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INVESTOR_PORTAL_HOST } from "./lib/investorPortalHost";
import { PRODUCT_ROADMAP_HOST } from "./lib/productRoadmapHost";

type SubdomainConfig = {
  hosts: string[];
  rewrites: Record<string, string>;
  defaultRewrite: string;
};

const SUBDOMAINS: SubdomainConfig[] = [
  {
    hosts: [INVESTOR_PORTAL_HOST, `www.${INVESTOR_PORTAL_HOST}`],
    rewrites: {
      "/": "/portal/login",
      "/login": "/portal/login",
      "/dashboard": "/portal",
      "/cap-table": "/portal/cap-table",
      "/safe": "/portal/safe",
      "/data-room": "/portal/data-room",
    },
    defaultRewrite: "/portal/login",
  },
  {
    hosts: [PRODUCT_ROADMAP_HOST, `www.${PRODUCT_ROADMAP_HOST}`],
    rewrites: {
      "/": "/product-roadmap",
    },
    defaultRewrite: "/product-roadmap",
  },
];

function matchSubdomain(host: string): SubdomainConfig | undefined {
  return SUBDOMAINS.find(c => c.hosts.includes(host));
}

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  const config = matchSubdomain(host);
  if (!config) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const target = config.rewrites[pathname];
  if (target) {
    return NextResponse.rewrite(new URL(target, request.url));
  }

  if (pathname.startsWith("/portal") || pathname.startsWith("/product-roadmap")) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(config.defaultRewrite, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
