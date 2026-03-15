import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnLoginPage = nextUrl.pathname.startsWith('/login');
      const isOnRegisterPage = nextUrl.pathname.startsWith('/register');

      if (!isLoggedIn && !isOnLoginPage && !isOnRegisterPage) {
        return false; 
      }
      return true;
    },
  },
  providers: [], 
} satisfies NextAuthConfig;
