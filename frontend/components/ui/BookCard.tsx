import { useState } from "react";
import { Book, ReadingHistory } from "@/lib/types";

// Ảnh mặc định khi cover_url rỗng hoặc bị lỗi
const DEFAULT_COVER = "https://placehold.co/400x600/111/f97316?text=No+Cover";

export const BookCard = ({ data, savedHistory,
  onReadClick, isSaved, onSaveClick }: {
    data: Book;
    savedHistory: ReadingHistory | null;
    onReadClick: () => void;
    isSaved: boolean;
    onSaveClick: () => void;
  }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="flex flex-col items-stretch gap-4 rounded-3xl border border-orange-500/10 bg-gray-950 p-4 text-left shadow-2xl animate-in fade-in zoom-in duration-500 sm:flex-row sm:items-start md:gap-8 md:p-6">
      
      {/* 1. Phần ảnh: Xử lý lỗi src rỗng và link die */}
      <div className="relative group mx-auto shrink-0 sm:mx-0">
        <div className="absolute -inset-1 bg-orange-500 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          // SỬA LỖI: Nếu src rỗng thì dùng DEFAULT_COVER để tránh download whole page
          src={data.cover_url || DEFAULT_COVER}
          className="relative h-40 w-28 rounded-lg border border-gray-800 object-cover shadow-2xl transition-all sm:h-48 sm:w-32 md:h-56 md:w-40"
          alt={data.title_vi || "book cover"}
          // SỬA LỖI: Nếu link ảnh bị lỗi 404, thay thế bằng ảnh mặc định
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            if (target.src !== DEFAULT_COVER) {
              target.src = DEFAULT_COVER;
            }
          }}
        />
      </div>

      {/* 2. Phần nội dung */}
      <div className="flex-1 py-1 md:py-2 min-w-0">
        <h3 className="font-black text-orange-500 text-xl md:text-3xl mb-1 uppercase italic tracking-tighter leading-tight whitespace-normal break-words">
          {data.title_vi}
        </h3>
        
        <p className="text-[9px] md:text-[10px] text-gray-500 mb-4 md:mb-6 font-bold tracking-[0.1em] md:tracking-[0.2em] uppercase">
          Tác giả: <span className="text-gray-300">{data.author_vi || "Đang cập nhật"}</span>
        </p>

        {/* PHẦN GIỚI THIỆU */}
        <div className="space-y-1 mb-4 md:mb-8">
          <p className="text-[8px] md:text-[9px] text-gray-700 font-black uppercase tracking-widest">Giới thiệu:</p>
          <div className="relative">
            <p className={`text-[10px] md:text-xs text-gray-400 leading-5 md:leading-6 font-light italic transition-all duration-300 ${!isExpanded ? "line-clamp-2 md:line-clamp-4" : ""}`}>
              {data.description_vi || "Chưa có mô tả cho truyện này."}
            </p>
            
            {data.description_vi && data.description_vi.length > 100 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[8px] md:text-[9px] text-orange-500/70 hover:text-orange-500 font-bold uppercase mt-1 tracking-tighter"
              >
                {isExpanded ? "[ Thu gọn ↑ ]" : "[ Xem thêm ↓ ]"}
              </button>
            )}
          </div>
        </div>

        {/* NÚT ĐIỀU KHIỂN */}
        <div className="flex flex-wrap gap-2 md:gap-3">
          <button
            onClick={onReadClick}
            className={`${savedHistory ? "bg-orange-500 text-black" : "bg-white text-black"
              } text-[8px] md:text-[9px] px-3 md:px-6 py-2 md:py-3 rounded-full font-black hover:scale-105 transition-all shadow-lg uppercase flex flex-col items-center min-w-[80px] md:min-w-[120px]`}
          >
            {savedHistory ? (
              <>
                <span>Tiếp tục {">"}</span>
                <span className="text-[6px] md:text-[7px] opacity-70 truncate max-w-[60px] md:max-w-[80px] lowercase">
                  {savedHistory.chapter_title}
                </span>
              </>
            ) : (
              "Đọc ngay >"
            )}
          </button>
          
          <button
            onClick={onSaveClick}
            className={`border text-[8px] md:text-[9px] px-3 md:px-6 py-2 md:py-3 rounded-full font-bold transition-all uppercase ${isSaved
                ? "bg-orange-500 border-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                : "border-gray-800 text-gray-600 hover:bg-gray-900"
              }`}
          >
            {isSaved ? "✓ Đã lưu" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
};