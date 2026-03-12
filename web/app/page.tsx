"use client";

import { useState, useEffect } from "react";
// Navbar nằm trong folder layout
import { Navbar } from "@/components/layout/Navbar"
// CrawlSection nằm trong folder features
import CrawlSection from "@/components/features/CrawlSection"
// BooksDisplay nằm trong folder features
import BooksDisplay from "@/components/features/BooksDisplay"


export default function Home() {
  const [isSearching, setIsSearching] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const handleHomeClick = () => {
    setIsSearching(false);
    setResetKey((k) => k + 1);
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-5xl mx-auto">

        {/* THANH NAVBAR ĐÃ TÁCH RIÊNG */}
        <Navbar session={null} onHomeClick={handleHomeClick} />

        <div className="text-center mt-20">
          <h2 className="text-6xl font-black mb-2 italic tracking-tighter">DOC TRUYEN FREE</h2>
          <p className="text-gray-600 mb-12 text-[10px] tracking-[0.3em] uppercase">
            He thong tu dong convert Vietphrase
          </p>

          {/* PHẦN CONVERT TRUYỆN CŨNG ĐÃ TÁCH RIÊNG */}
          <CrawlSection
            key={resetKey}
            onSearchMode={setIsSearching}
          />
        </div>

        {/* DANH SÁCH TRUYỆN TỪ DATABASE - ẨN KHI ĐANG TÌM KIẾM */}
        {!isSearching && (
          <BooksDisplay />
        )}
      </div>
    </main>
  )
}
