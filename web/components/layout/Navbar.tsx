"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { handleSignOut } from "@/app/actions";
import { Bookmark, LogOut, User, Home, Loader2, ChevronDown, Settings, Library } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

interface NavbarProps {
  session?: any;
  onHomeClick?: () => void;
}

export const Navbar = ({ session: initialSession, onHomeClick }: NavbarProps) => {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const currentSession = session || initialSession;
  const isLoading = status === "loading";

  // Lấy tên hiển thị: Ưu tiên name > email (bỏ @...) > Guest
  const displayName = currentSession?.user?.name || 
                      currentSession?.user?.email?.split('@')[0] || 
                      "Guest";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="flex justify-between items-center mb-8 md:mb-12 border-b border-zinc-800 pb-4 pt-2 sticky top-0 bg-black/80 backdrop-blur-md z-50 px-2">
      {/* 1. LOGO */}
      <button 
        onClick={() => { onHomeClick?.(); router.push("/"); }} 
        className="flex items-center gap-2 group transition-all duration-300"
      >
        <div className="bg-orange-500 text-black p-1.5 rounded-sm shadow-[0_0_15px_rgba(249,115,22,0.4)] group-hover:scale-110 transition-transform">
          <Home size={18} fill="currentColor" />
        </div>
        <span className="text-xl md:text-2xl font-black text-orange-500 tracking-tighter uppercase italic group-hover:text-white transition-colors">
          WEB_TRUYEN
        </span>
      </button>

      {/* 2. KHỐI USER & MODAL LIST */}
      <div className="relative" ref={menuRef}>
        {isLoading ? (
          <div className="flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-full border border-zinc-800 animate-pulse">
            <Loader2 size={12} className="animate-spin text-zinc-600" />
          </div>
        ) : currentSession ? (
          <>
            {/* TRIGGER: Hiển thị tên User đăng nhập */}
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 md:gap-3 bg-zinc-900/80 p-1 pr-2 md:pr-4 rounded-full border border-zinc-800 hover:border-orange-500/50 transition-all active:scale-95 shadow-lg"
            >
              <div className="w-8 h-8 rounded-full border border-orange-500/50 overflow-hidden bg-black flex items-center justify-center shrink-0">
                {currentSession.user?.image ? (
                  <img src={currentSession.user.image} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={14} className="text-orange-500" />
                )}
              </div>
              
              <div className="hidden sm:flex flex-col items-start leading-none max-w-[120px]">
                <span className="text-[10px] text-orange-500 font-black uppercase tracking-tighter mb-0.5 truncate w-full">
                  {displayName}
                </span>
                <span className="text-[7px] text-zinc-600 font-mono italic uppercase">Online</span>
              </div>
              
              <ChevronDown size={12} className={`text-zinc-500 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* MODAL LIST (DROPDOWN) */}
            {isOpen && (
              <div className="absolute right-0 mt-3 w-52 bg-zinc-950 border border-zinc-800 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-[60]">
                <div className="p-3 border-b border-zinc-900 bg-zinc-900/30">
                  <p className="text-[7px] text-zinc-500 uppercase font-black tracking-[0.2em]">User Profile Context</p>
                  <p className="text-[10px] text-zinc-300 font-bold truncate mt-1">{currentSession.user?.email}</p>
                </div>
                
                <div className="flex flex-col p-1.5">
                  <Link 
                    href="/profile/library"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-400 hover:text-orange-500 hover:bg-orange-500/5 transition-all rounded-lg uppercase tracking-tight"
                  >
                    <Bookmark size={14} className="text-orange-500" />
                    Tủ truyện của tôi
                  </Link>

                  <Link 
                    href="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all rounded-lg uppercase tracking-tight"
                  >
                    <Settings size={14} />
                    Cài đặt hệ thống
                  </Link>

                  <div className="h-[1px] bg-zinc-900 my-1.5 mx-2" />

                  <form action={handleSignOut} className="w-full">
                    <button 
                      type="submit"
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-500 hover:text-red-500 hover:bg-red-500/5 transition-all rounded-lg uppercase tracking-tight"
                    >
                      <LogOut size={14} />
                      Đăng xuất (Logout)
                    </button>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          /* CHƯA ĐĂNG NHẬP */
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-[10px] text-zinc-500 hover:text-white uppercase font-black px-3 transition-colors">Login</Link>
            <Link href="/register" className="text-[9px] md:text-[10px] bg-orange-600 text-black px-4 md:px-6 py-2 rounded-full font-black uppercase hover:bg-white transition-all shadow-[0_0_15px_rgba(234,88,12,0.3)]">Join</Link>
          </div>
        )}
      </div>
    </nav>
  );
};