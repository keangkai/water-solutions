import { NextRequest, NextResponse } from "next/server";
import { roleForSession } from "@/lib/session-role";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/login")) {
    return NextResponse.next();
  }

  const role = roleForSession(request.cookies.get("session")?.value);
  if (role === "admin") {
    return NextResponse.next();
  }

  // คนขับเข้าได้เฉพาะหน้าคนขับ
  if (role === "driver") {
    if (pathname === "/driver" || pathname.startsWith("/driver/")) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/driver", request.url));
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
