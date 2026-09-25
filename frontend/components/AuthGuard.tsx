"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

// Only authentication entry pages remain public.
// The app requires login-first access for every other route.
const PUBLIC_ROUTE_PREFIXES = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => {
    if (prefix === "/") {
      return pathname === "/";
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = isPublicRoute(pathname);
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isPublic && !isLoading && !user) {
      const redirectTarget = `/login?next=${encodeURIComponent(pathname || "/")}`;
      router.replace(redirectTarget);
    }
  }, [isPublic, isLoading, user, router, pathname]);

  if (!isPublic && isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm animate-pulse">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }

  if (!isPublic && !user) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm animate-pulse">Đang chuyển tới trang đăng nhập...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
