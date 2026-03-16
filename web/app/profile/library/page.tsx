"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Bookmark, Trash2, BookOpen, Loader2 } from "lucide-react";

export default function LibraryPage() {
  const { data: session } = useSession();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. Hàm lấy danh sách truyện đã lưu
  const fetchLibrary = async () => {
    try {
      const res = await fetch("/api/user/library/list");
      const result = await res.json();
      setBooks(result.data || []);
    } catch (error) {
      console.error("Lỗi tải tủ sách:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchLibrary();
  }, [session]);

  // 2. Hàm xóa nhanh truyện khỏi tủ sách
  const handleRemove = async (book_url: string) => {
    if (!confirm("Xóa truyện này khỏi tủ sách?")) return;
    
    try {
      const res = await fetch("/api/user/library", {
        method: "POST",
        body: JSON.stringify({ book_url })
      });
      if (res.ok) {
        // Cập nhật lại UI ngay lập tức
        setBooks(prev => prev.filter(b => b.book_url !== book_url));
      }
    } catch (error) {
      alert("Không thể xóa lúc này");
    }
  };

  if (!session && !loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-orange-500 font-mono italic uppercase">
        Vui lòng đăng nhập để xem tủ sách
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-6xl mx-auto">
        <Navbar session={session} onHomeClick={() => window.location.href="/"} />

        <header className="mt-20 mb-12 flex justify-between items-end border-b border-gray-900 pb-6">
          <div className="border-l-4 border-orange-600 pl-6">
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">Tủ Sách</h1>
            <p className="text-[10px] text-gray-600 mt-2 tracking-[0.3em] uppercase">Kho lưu trữ cá nhân</p>
          </div>
          <div className="text-right">
            <span className="text-orange-500 font-black text-2xl">{books.length}</span>
            <span className="text-gray-700 text-[10px] ml-2 uppercase">Truyện</span>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-orange-500 gap-4">
            <Loader2 className="animate-spin" size={32} />
            <span className="text-[10px] uppercase tracking-widest">Đang kết nối Database...</span>
          </div>
        ) : books.length === 0 ? (
          <div className="py-32 text-center border border-dashed border-zinc-900 rounded-[40px] bg-zinc-950/30">
            <Bookmark className="mx-auto mb-4 text-zinc-800" size={60} strokeWidth={1} />
            <p className="text-zinc-600 text-sm italic">Chưa có bản ghi nào trong kho lưu trữ.</p>
            <Link href="/" className="mt-6 inline-block text-orange-500 text-[10px] font-bold border-b border-orange-500 pb-1 hover:text-white hover:border-white transition-all">KHÁM PHÁ NGAY</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
            {books.map((book) => (
              <div key={book._id} className="group relative flex flex-col">
                {/* Ảnh bìa & Nút Xóa */}
                <div className="relative aspect-[3/4.2] overflow-hidden rounded-2xl border border-zinc-900 group-hover:border-orange-500/50 transition-all shadow-2xl bg-zinc-900">
                  <img 
                    src={book.cover_url} 
                    alt={book.title_vi} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100" 
                  />
                  {/* Nút Xóa nhanh */}
                  <button 
                    onClick={() => handleRemove(book.book_url)}
                    className="absolute top-2 right-2 p-2 bg-black/80 text-gray-500 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                  title="Xóa khỏi tủ sách">
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* Thông tin */}
                <div className="mt-4 px-1">
                  <h3 className="text-[12px] font-black uppercase italic leading-tight line-clamp-2 min-h-[32px] group-hover:text-orange-500 transition-colors">
                    {book.title_vi}
                  </h3>
                  
                  {/* Nút Đọc nhanh - Cần xử lý slug từ URL gốc */}
                  <Link 
                    href={`/book/${encodeURIComponent(book.book_url.split('/').filter(Boolean).pop())}`} 
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-zinc-900 hover:bg-orange-500 text-white hover:text-black py-3 rounded-xl text-[10px] font-black transition-all"
                  >
                    <BookOpen size={12} />
                    TIẾP TỤC ĐỌC
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
