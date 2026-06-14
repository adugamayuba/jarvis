import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { INVESTOR_PORTAL_HOST } from "./lib/investorPortalHost";

const REWRITES: Record<string, string> = {
  "/": "/portal/login",
  "/login": "/portal/login",
  "/dashboard": "/portal",
  "/cap-table": "/portal/cap-table",
  "/safe": "/portal/safe",
  "/data-room": "/portal/data-room",
};

export function middleware(request: NextRequest) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  if (host !== INVESTOR_PORTAL_HOST && host !== `www.${INVESTOR_PORTAL_HOST}`) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const target = REWRITES[pathname];
  if (target) {
    return NextResponse.rewrite(new URL(target, request.url));
  }

  if (pathname.startsWith("/portal")) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL("/portal/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
