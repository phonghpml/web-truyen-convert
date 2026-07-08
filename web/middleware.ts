import { NextResponse } from "next/server";

// Middleware hiện tạm thời chỉ là no-op để tránh bundling Prisma/pg vào edge runtime.
export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
};
