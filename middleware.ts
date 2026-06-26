import { NextRequest, NextResponse } from "next/server";

const SITE_PASSWORD = process.env.SITE_PASSWORD ?? "pickleball";
const COOKIE_NAME = "site_session";

function makeToken(password: string): string {
  return Buffer.from(`site:${password}`).toString("base64");
}

function nextWithPathname(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow the enter page and its API route through unconditionally
  if (pathname.startsWith("/enter") || pathname.startsWith("/api/enter")) {
    return nextWithPathname(req);
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (token === makeToken(SITE_PASSWORD)) {
    return nextWithPathname(req);
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/enter";
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
