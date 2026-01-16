import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLogin = req.nextUrl.pathname === "/login";
  const isOnApi = req.nextUrl.pathname.startsWith("/api");
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");

  // Allow auth API routes
  if (isAuthApi) {
    return NextResponse.next();
  }

  // Redirect to login if not authenticated
  if (!isLoggedIn && !isOnLogin && !isOnApi) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Redirect to orders if already logged in and trying to access login
  if (isLoggedIn && isOnLogin) {
    return NextResponse.redirect(new URL("/orders", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
