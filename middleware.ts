import { jwtVerify } from "jose/jwt/verify";
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/constants";

const publicAuthPages = new Set(["/login", "/signup", "/forgot-password", "/reset-password"]);

function loginRedirect(request: NextRequest) {
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

function refreshRedirect(request: NextRequest, destination = `${request.nextUrl.pathname}${request.nextUrl.search}`) {
  const url = new URL("/api/auth/refresh", request.url);
  url.searchParams.set("next", destination);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const isProtected =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/quiz") ||
    request.nextUrl.pathname.startsWith("/teams");
  const isPublicAuthPage = publicAuthPages.has(request.nextUrl.pathname);

  if (!token) {
    if (refreshToken && (isProtected || isPublicAuthPage)) {
      return refreshRedirect(request, isPublicAuthPage ? "/dashboard" : undefined);
    }
    return isProtected ? loginRedirect(request) : NextResponse.next();
  }

  try {
    const fallback = "local-development-secret-change-me";
    const secret = process.env.JWT_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : fallback);
    if (!secret) throw new Error("JWT secret is not configured.");
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ["HS256"] });

    if (payload.type !== "access") throw new Error("Invalid token.");
    if (request.nextUrl.pathname.startsWith("/admin") && payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (isPublicAuthPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
  } catch {
    const response = refreshToken && (isProtected || isPublicAuthPage)
      ? refreshRedirect(request, isPublicAuthPage ? "/dashboard" : undefined)
      : isProtected
        ? loginRedirect(request)
        : NextResponse.next();
    response.cookies.delete(ACCESS_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/quiz/:path*", "/teams/:path*", "/login", "/signup", "/forgot-password", "/reset-password"],
};
