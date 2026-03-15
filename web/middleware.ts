import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // Những đường dẫn nào bắt buộc phải đăng nhập mới được xem
  matcher:["/((?!api|_next/static|_next/image|favicon.ico|login|register).*)"],
}
