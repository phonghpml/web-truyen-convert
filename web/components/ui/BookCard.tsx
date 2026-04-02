import { useState } from "react";

export const BookCard = ({ data, savedHistory,
  onReadClick, isSaved, onSaveClick }: {
    data: any, savedHistory: any,
    onReadClick: () => void,
    isSaved: boolean,
    onSaveClick: () => void
  }) => {
  // State để kiểm soát việc đóng/mở phần giới thiệu
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-gray-950 border border-orange-500/10 p-4 md:p-6 rounded-3xl flex flex-row gap-4 md:gap-8 text-left animate-in fade-in zoom-in duration-500 shadow-2xl items-start">
      
      {/* 1. Phần ảnh: Thu nhỏ trên mobile (w-24), bình thường trên desktop (md:w-40) */}
      <div className="relative group shrink-0 sticky top-0">
        <div className="absolute -inset-1 bg-orange-500 rounded-lg blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
        <img
          src={data.cover_url}
          className="relative w-24 h-36 md:w-40 md:h-56 object-cover rounded-lg border border-gray-800 shadow-2xl transition-all"
          alt="cover"
        />
      </div>

      {/* 2. Phần nội dung: Luôn nằm ngang hàng với ảnh */}
      <div className="flex-1 py-1 md:py-2 min-w-0">
        <h3 className="font-black text-orange-500 text-xl md:text-3xl mb-1 uppercase italic tracking-tighter leading-tight truncate">
          {data.title_vi}
        </h3>
        <p className="text-[9px] md:text-[10px] text-gray-500 mb-4 md:mb-6 font-bold tracking-[0.1em] md:tracking-[0.2em] uppercase">
          Tác giả: <span className="text-gray-300">{data.author_vi}</span>
        </p>

        {/* PHẦN GIỚI THIỆU CÓ THỂ MỞ RỘNG */}
        <div className="space-y-1 mb-4 md:mb-8">
          <p className="text-[8px] md:text-[9px] text-gray-700 font-black uppercase tracking-widest">Giới thiệu:</p>
          <div className="relative">
            <p className={`text-[10px] md:text-xs text-gray-400 leading-5 md:leading-6 font-light italic transition-all duration-300 ${!isExpanded ? "line-clamp-2 md:line-clamp-4" : ""}`}>
              {data.description_vi}
            </p>
            
            {/* Nút Xem thêm / Thu gọn */}
            {data.description_vi?.length > 100 && (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[8px] md:text-[9px] text-orange-500/70 hover:text-orange-500 font-bold uppercase mt-1 tracking-tighter"
              >
                {isExpanded ? "[ Thu gọn ↑ ]" : "[ Xem thêm ↓ ]"}
              </button>
            )}
          </div>
        </div>

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