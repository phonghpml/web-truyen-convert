"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleSignOut } from "@/app/actions";
import { Bookmark, LogOut, User, Home, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface NavbarProps {
  session?: any;
  onHomeClick?: () => void;
}

export const Navbar = ({ session: initialSession, onHomeClick }: NavbarProps) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  const currentSession = session || initialSession;
  const isLoading = status === "loading";

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onHomeClick?.();
    router.push("/");
  };

  return (
    <nav className="flex justify-between items-center mb-8 md:mb-12 border-b border-zinc-800 pb-4 pt-2 sticky top-0 bg-black/80 backdrop-blur-md z-50">
      {/* 1. LOGO - Đã sửa để luôn hiện tên */}
      <button 
        onClick={handleLogoClick} 
        className="flex items-center gap-2 group transition-all duration-300"
      >
        <div className="bg-orange-500 text-black p-1.5 rounded-sm shadow-[0_0_15px_rgba(249,115,22,0.4)] group-hover:scale-110 transition-transform">
          <Home size={18} fill="currentColor" />
        </div>
        <span className="text-xl md:text-2xl font-black text-orange-500 tracking-tighter uppercase italic group-hover:text-white transition-colors">
          WEB_TRUYEN
        </span>
      </button>

      {/* 2. KHỐI ĐIỀU HƯỚNG BÊN PHẢI */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* TRẠNG THÁI 1: ĐANG XÁC THỰC (Skeleton giữ chỗ) */}
        {isLoading ? (
          <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 animate-pulse">
            <Loader2 size={12} className="animate-spin text-zinc-600" />
            <div className="h-2 w-12 bg-zinc-800 rounded"></div>
          </div>
        ) : currentSession ? (
          /* TRẠNG THÁI 2: ĐÃ ĐĂNG NHẬP */
          <>
            <Link 
              href="/profile/library" 
              className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-zinc-400 hover:text-orange-500 transition-all uppercase tracking-widest bg-zinc-900/50 rounded-full border border-zinc-800"
            >
              <Bookmark size={14} className="text-orange-500" />
              <span className="hidden md:inline">Tủ sách</span>
            </Link>

            <div className="flex items-center gap-2 md:gap-3 bg-zinc-900/80 p-1 pr-1 md:pr-2 rounded-full border border-zinc-800">
              <div className="hidden sm:flex flex-col items-end pl-3">
                <span className="text-[10px] text-zinc-200 font-black uppercase tracking-tighter leading-none">
                  {currentSession.user?.name || "User"}
                </span>
                <span className="text-[7px] text-zinc-600 font-mono truncate max-w-[80px]">
                  {currentSession.user?.email}
                </span>
              </div>
              
              <div className="w-7 h-7 rounded-full border border-orange-500/50 overflow-hidden bg-black flex items-center justify-center">
                {currentSession.user?.image ? (
                  <img src={currentSession.user.image} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-orange-500" />
                )}
              </div>

              <form action={handleSignOut} className="flex items-center border-l border-zinc-800 pl-1">
                <button 
                  type="submit"
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut size={14} />
                </button>
              </form>
            </div>
          </>
        ) : (
          /* TRẠNG THÁI 3: CHƯA ĐĂNG NHẬP */
          <div className="flex items-center gap-2">
            <Link 
              href="/login" 
              className="text-[10px] text-zinc-500 hover:text-white transition-all uppercase font-black px-3"
            >
              Login
            </Link>
            <Link 
              href="/register" 
              className="text-[9px] md:text-[10px] bg-orange-600 text-black px-4 md:px-6 py-2 rounded-full hover:bg-white transition-all font-black uppercase shadow-[0_0_20px_rgba(234,88,12,0.2)]"
            >
              Join
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
