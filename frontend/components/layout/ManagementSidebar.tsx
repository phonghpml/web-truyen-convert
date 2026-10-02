"use client";

import { createContext, useContext, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Download, Menu, Trophy, Video, X } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

interface ManagementSidebarControls {
  mobileOpen: boolean;
  toggleMobileMenu: () => void;
}

const ManagementSidebarContext = createContext<ManagementSidebarControls | null>(null);

export function useManagementSidebar() {
  return useContext(ManagementSidebarContext);
}

const NAV_ITEMS = [
  { href: "/rank", label: "Xếp hạng", icon: Trophy, adminOnly: false },
  { href: "/crawl", label: "Cào truyện", icon: Download, adminOnly: true },
  { href: "/admin/books", label: "Quản lý sách", icon: BookOpen, adminOnly: true },
  { href: "/admin/videos", label: "Quản lý video", icon: Video, adminOnly: true },
];

function isActivePath(pathname: string, href: string) {
  return href === "/admin/books" ? pathname.startsWith(href) : pathname === href;
}

export function ManagementSidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const [openMenuPath, setOpenMenuPath] = useState<string | null>(null);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const mobileOpen = openMenuPath === pathname;
  const hasManagementRoute = pathname === "/rank" || pathname === "/crawl" || pathname.startsWith("/admin/");
  const isVisible = isAdmin || hasManagementRoute;
  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  const activeItem = items.find((item) => isActivePath(pathname, item.href));
  const discoveryItems = items.filter((item) => !item.adminOnly);
  const managementItems = items.filter((item) => item.adminOnly);
  const toggleMobileMenu = () => setOpenMenuPath(mobileOpen ? null : pathname);

  if (!isVisible) return <>{children}</>;

  const renderLinkGroup = (title: string, groupItems: typeof items, closeMenu = false, compact = false) => groupItems.length > 0 && (
    <section aria-label={title}>
      <h2 className={`mb-2 px-3 text-xs font-semibold text-zinc-500 ${compact ? "sr-only" : ""}`}>{title}</h2>
      <nav className="flex flex-col gap-1">
        {groupItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => closeMenu && setOpenMenuPath(null)}
              aria-current={active ? "page" : undefined}
              title={compact ? item.label : undefined}
              className={`flex min-h-10 items-center border-l-2 text-sm transition-colors ${compact ? "justify-center px-1" : "gap-3 px-3"} ${
                active
                  ? "border-orange-400 bg-zinc-900/70 font-semibold text-white"
                  : "border-transparent text-zinc-400 hover:bg-zinc-900/60 hover:text-white"
              }`}
            >
              <Icon size={17} aria-hidden="true" />
              <span className={compact ? "sr-only" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </section>
  );

  return (
    <ManagementSidebarContext.Provider value={{ mobileOpen, toggleMobileMenu }}>
      <aside className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-zinc-800 bg-zinc-950 transition-[width] duration-200 lg:flex ${desktopCollapsed ? "w-16" : "w-64"}`}>
        <div className={`flex h-14 items-center border-b border-zinc-800 ${desktopCollapsed ? "justify-center px-2" : "justify-between px-4"}`}>
          {!desktopCollapsed && <p className="truncate text-xs font-semibold text-zinc-300">Không gian làm việc</p>}
          <button
            type="button"
            onClick={() => setDesktopCollapsed((collapsed) => !collapsed)}
            aria-label={desktopCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            aria-expanded={!desktopCollapsed}
            title={desktopCollapsed ? "Mở rộng menu" : "Thu gọn menu"}
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
          >
            <Menu size={18} />
          </button>
        </div>
        <div className={`flex flex-col gap-6 py-5 ${desktopCollapsed ? "px-2" : "px-3"}`}>
          {renderLinkGroup("Khám phá", discoveryItems, false, desktopCollapsed)}
          {renderLinkGroup("Quản lý", managementItems, false, desktopCollapsed)}
        </div>
        {isAdmin && !desktopCollapsed && (
          <div className="mt-auto border-t border-zinc-800 px-5 py-3 text-xs text-zinc-500">
            Đang đăng nhập với quyền quản trị
          </div>
        )}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[80] flex lg:hidden">
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpenMenuPath(null)}
            className="absolute inset-0 bg-black/70"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            className="relative flex h-full w-[min(19rem,85vw)] flex-col border-r border-zinc-800 bg-zinc-950 p-4 shadow-2xl"
          >
            <div className="mb-6 flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <p className="text-xs font-semibold text-white">Điều hướng</p>
                <p className="mt-1 text-xs text-zinc-500">{activeItem?.label ?? "Không gian làm việc"}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng menu"
                onClick={() => setOpenMenuPath(null)}
                className="rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-6">
              {renderLinkGroup("Khám phá", discoveryItems, true)}
              {renderLinkGroup("Quản lý", managementItems, true)}
            </div>
            {isAdmin && <p className="mt-auto border-t border-zinc-800 pt-4 text-xs text-zinc-500">Đang đăng nhập với quyền quản trị</p>}
          </aside>
        </div>
      )}

      <div className={`min-h-screen transition-[padding] duration-200 ${desktopCollapsed ? "lg:pl-16" : "lg:pl-64"}`}>{children}</div>
    </ManagementSidebarContext.Provider>
  );
}