import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Configuration constants
const DEVELOPMENT_MODE = false
const PUBLIC_PATHS = ["/", "/about", "/login"] as const
const STATIC_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".css", ".js"] as const

/**
 * Optimized middleware with better performance
 * Reduces unnecessary processing and improves response times
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip processing for static files to improve performance
  if (STATIC_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return NextResponse.next()
  }

  // Skip processing in development mode
  if (DEVELOPMENT_MODE) {
    return NextResponse.next()
  }

  // Check if path is public
  const isPublicPath = PUBLIC_PATHS.includes(pathname as any)
  const authCookie = request.cookies.get("auth-session")?.value

  // Handle guest users
  if (authCookie === "guest") {
    if (!isPublicPath && pathname !== "/" && pathname !== "/about") {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return NextResponse.next()
  }

  // Handle unauthenticated users
  if (!isPublicPath && !authCookie) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Handle authenticated users on login page
  if (pathname === "/login" && authCookie && authCookie !== "guest") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  return NextResponse.next()
}

// Optimized matcher configuration
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
}
