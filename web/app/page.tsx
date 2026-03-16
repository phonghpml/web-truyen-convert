"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react"; // Thêm để lấy thông tin user
import { Navbar } from "@/components/layout/Navbar";
import CrawlSection from "@/components/features/CrawlSection";
import BooksDisplay from "@/components/features/BooksDisplay";

export default function Home() {
  const { data: session } = useSession(); // Lấy session từ NextAuth
  const [isSearching, setIsSearching] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleHomeClick = () => {
    setIsSearching(false);
    setResetKey((k) => k + 1);
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-5xl mx-auto">

        {/* Truyền session thật vào để Navbar hiện Avatar hoặc nút Đăng xuất */}
        <Navbar session={session} onHomeClick={handleHomeClick} />

        <div className="text-center mt-20">
          <h2 className="text-6xl font-black mb-2 italic tracking-tighter uppercase">
            Đọc Truyện Free
          </h2>
          <p className="text-gray-600 mb-12 text-[10px] tracking-[0.3em] uppercase">
            Hệ thống tự động convert Vietphrase
          </p>

          {/* CrawlSection sẽ tự động dùng session bên trong nó thông qua useReader */}
          <Suspense fallback={<div className="text-zinc-500 font-mono text-[10px] animate-pulse">Initializing System...</div>}>
            <CrawlSection
              key={resetKey}
              onSearchMode={setIsSearching}
            />
          </Suspense>
        </div>

        {/* Chỉ hiện danh sách truyện khi không ở chế độ Convert/Search */}
        {!isSearching && (
          <div className="mt-20">
            <BooksDisplay />
          </div>
        )}
      </div>
    </main>
  );
}
