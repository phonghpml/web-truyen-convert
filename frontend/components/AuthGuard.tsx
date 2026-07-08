"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Không check auth cho public routes
    if (PUBLIC_ROUTES.includes(pathname)) {
      setIsAuthenticated(true);
      return;
    }

    // Check nếu user có token
    const token = getAuthToken();
    if (!token) {
      // Redirect tới login nếu không có token
      router.push("/login");
      return;
    }

    setIsAuthenticated(true);
  }, [pathname, router]);

  // Loading state - render nothing while checking auth
  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-400 text-sm animate-pulse">Đang kiểm tra xác thực...</p>
      </div>
    </div>;
  }

  return <>{children}</>;
}
