import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
export const runtime = 'nodejs';
export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup", "/invite", "/pricing", "/forgot-password", "/reset-password"];
  const isPublicRoute = publicRoutes.some(
    (route) => nextUrl.pathname === route || nextUrl.pathname.startsWith(`${route}/`)
  );

  // API routes that are public (webhooks, auth, invites)
  const publicApiRoutes = ["/api/auth", "/api/invites", "/api/billing/webhook"];
  const isPublicApiRoute = publicApiRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  );

  // Allow public routes and API routes
  if (isPublicRoute || isPublicApiRoute) {
    // Redirect to dashboard if already logged in and trying to access auth pages
    if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

