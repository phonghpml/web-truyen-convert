"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTE_PREFIXES = ["/", "/login", "/register", "/rank", "/crawl", "/search", "/book"];

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(() => (isPublic ? true : null));

  useEffect(() => {
    if (isPublic) {
      setIsAuthenticated(true);
      return;
    }

    const token = getAuthToken();
    if (token) {
      setIsAuthenticated(true);
      return;
    }

    setIsAuthenticated(false);
    router.push("/login");
  }, [pathname, router, isPublic]);

  if (isAuthenticated === null) {
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
