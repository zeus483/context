import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const protectedPaths = ["/today", "/session", "/calendar", "/progress", "/library"];
  const isProtected = protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();
  const session = req.cookies.get("session")?.value;
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/today", "/session/:path*", "/calendar", "/progress", "/library"] };
