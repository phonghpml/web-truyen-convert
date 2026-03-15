// web/components/Providers.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {/* Bạn có thể thêm Toaster hoặc ThemeProvider ở đây sau này */}
      {children}
    </SessionProvider>
  );
}
