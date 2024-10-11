import { getToken } from "next-auth/jwt"
import { NextRequestWithAuth, withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import { env } from "process"

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const token = await getToken({ req })
    const isAuth = !!token
    const pathname = req.nextUrl.pathname
    const isAuthPage =
      pathname.startsWith("/login") ||
      pathname.startsWith("/register")
    console.log("pathname", pathname, "isAuth", isAuth)

    const authFreePathsRegex = /^(\/|\/about|\/contact-us|\/403)$/;
    // TODO: Restore authentication, currently disabled for docker call API
    const apiAuthFreePathsRegex = /^\/api\/versions\/\d+$/;
    // If the requested path is auth-free, proceed without authentication check
    if (authFreePathsRegex.test(pathname) || apiAuthFreePathsRegex.test(pathname)) {
      return NextResponse.next();
    }

    if (isAuthPage) {
      if (isAuth) {
        return NextResponse.redirect(new URL('/project', req.url))
      }

      return null
    }

    if (!isAuth) {
      let from = pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }

      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }
    const hasAccess = await fetch(`${env.NEXTAUTH_URL}/api/auth/access-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pathname, token}),
    })
    if (hasAccess.status === 200) {
      return NextResponse.next()
    }
    return NextResponse.redirect(new URL('/403', req.url))
  },
  {
    callbacks: {
      async authorized() {
        // This is a work-around for handling redirect on auth pages.
        // We return true here so that the middleware function above
        // is always called.
        return true
      },
    },
  }
)

export const config = {
  matcher: ["/:path*"],
}