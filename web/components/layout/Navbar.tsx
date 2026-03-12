"use client";

import Link from "next/link"
import { useRouter } from "next/navigation";
import { handleSignOut } from "@/app/actions"

interface NavbarProps {
  session: any;
  onHomeClick?: () => void;
}

export const Navbar = ({ session, onHomeClick }: NavbarProps) => {
  const router = useRouter();
  const handleLogoClick = (e: React.MouseEvent) => {
    // always navigate to home and reset search state
    onHomeClick?.();
    // if already on home, force router push
    router.push("/");
  };

  return (
    <nav className="flex justify-between items-center mb-12 border-b border-gray-800 pb-4">
      <a href="#" onClick={handleLogoClick} className="text-xl font-bold text-orange-500 tracking-tighter uppercase italic hover:text-orange-400 transition">
        WEB_TRUYEN
      </a>
      
      <div className="flex gap-4">
        {session ? (
          /* --- TRẠNG THÁI ĐÃ ĐĂNG NHẬP --- */
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-gray-500 font-mono italic">
              {session.user?.email}
            </span>
            <form action={handleSignOut}>
              <button className="bg-gray-900 border border-gray-800 px-4 py-1 rounded text-[10px] hover:bg-red-900/40 transition font-bold uppercase">
                dang xuat
              </button>
            </form>
          </div>
        ) : (
          /* --- TRẠNG THÁI CHƯA ĐĂNG NHẬP --- */
          <div className="flex gap-2">
            <Link href="/login" className="text-[10px] border border-gray-800 px-4 py-1 rounded hover:bg-gray-900 transition uppercase font-bold">
              dang nhap
            </Link>
            <Link href="/register" className="text-[10px] bg-orange-600 px-4 py-1 rounded hover:bg-orange-700 transition uppercase font-bold">
              dang ky
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}
