import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { verifySessionToken } from "./lib/auth"

export async function proxy(request: NextRequest) {
  // Allow login page, API auth routes, and static assets
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api/auth") ||
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.startsWith("/favicon.ico") ||
    request.nextUrl.pathname.startsWith("/public")
  ) {
    return NextResponse.next()
  }

  const sessionCookie = request.cookies.get("poc_session")

  if (!sessionCookie || !sessionCookie.value) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const isValid = await verifySessionToken(sessionCookie.value)
  
  if (!isValid) {
    const response = NextResponse.redirect(new URL("/login", request.url))
    // Clear the invalid cookie
    response.cookies.delete("poc_session")
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (API routes for authentication)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
}
