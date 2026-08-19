"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

// Routes that don't require authentication
const PUBLIC_ROUTE_PREFIXES = ["/", "/login", "/register", "/rank", "/search", "/book"];

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
      router.push("/login");
    }
  }, [isPublic, isLoading, user, router]);

  if (!isPublic && isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm animate-pulse">Đang kiểm tra xác thực...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
