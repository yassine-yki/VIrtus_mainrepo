import { NextRequest, NextResponse } from "next/server";
import {
  equalSecret,
  reviewCookieValue,
  reviewEnabled,
} from "./lib/review-auth";
export function proxy(request: NextRequest) {
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.CATALOG_AUDIENCE !== "internal"
  )
    return NextResponse.next();
  if (!reviewEnabled())
    return new NextResponse("Private preview is not configured.", {
      status: 503,
    });
  if (request.nextUrl.pathname === "/access") return NextResponse.next();
  const cookie = request.cookies.get("virtus_review")?.value ?? "";
  if (
    !equalSecret(cookie, reviewCookieValue(process.env.VIRTUS_REVIEW_TOKEN!))
  ) {
    if (request.nextUrl.pathname.startsWith("/api/"))
      return NextResponse.json(
        { error: "Private preview authentication required" },
        { status: 401 },
      );
    return NextResponse.redirect(new URL("/access", request.url));
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
