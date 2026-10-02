"use client";

import { useState, Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import CrawlSection from "@/components/features/CrawlSection";
import BooksDisplay from "@/components/features/BooksDisplay";

export default function Home() {
  const [isSearching, setIsSearching] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleHomeClick = () => {
    setIsSearching(false);
    setResetKey((k) => k + 1);
  };

  return (
    <main className="min-h-screen bg-black p-4 font-mono text-white sm:p-6">
      <div className="max-w-5xl mx-auto">

<Navbar onHomeClick={handleHomeClick} />

        <div className="mt-12 text-center sm:mt-16 md:mt-20">
          <h2 className="mb-2 break-words text-4xl font-black italic uppercase tracking-tighter sm:text-5xl md:text-6xl">
            Đọc Truyện Free
          </h2>
          <p className="mb-8 text-[10px] uppercase tracking-[0.16em] text-gray-600 sm:mb-12 sm:tracking-[0.3em]">
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
          <div className="mt-12 sm:mt-20">
            <BooksDisplay />
          </div>
        )}
      </div>
    </main>
  );
}
