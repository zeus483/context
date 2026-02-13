import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE } from "./lib/constants";

const publicPages = ["/login"];
const publicApiPrefixes = ["/api/auth/login", "/api/auth/register", "/api/health"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.startsWith("/manifest")) {
    return NextResponse.next();
  }

  const sessionToken = req.cookies.get(AUTH_COOKIE)?.value;

  const isPublicPage = publicPages.some((path) => pathname === path);
  if (isPublicPage) {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/today", req.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    const isPublicApi = publicApiPrefixes.some((prefix) => pathname.startsWith(prefix));
    if (isPublicApi) {
      return NextResponse.next();
    }

    if (!sessionToken) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    return NextResponse.next();
  }

  const isProtectedPage = ["/today", "/plans", "/tools", "/session", "/calendar", "/progress", "/library", "/settings"].some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtectedPage && !sessionToken) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"]
};
