// frontend/components/Providers.tsx
"use client";

import { AuthGuard } from "./AuthGuard";
import { ToastProvider } from "./ui/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthGuard>{children}</AuthGuard>
    </ToastProvider>
  );
}
