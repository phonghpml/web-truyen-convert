// frontend/components/Providers.tsx
"use client";

import { AuthGuard } from "./AuthGuard";
import { ToastProvider } from "./ui/ToastProvider";
import { ManagementSidebar } from "./layout/ManagementSidebar";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AuthGuard>
        <ManagementSidebar>{children}</ManagementSidebar>
      </AuthGuard>
    </ToastProvider>
  );
}
