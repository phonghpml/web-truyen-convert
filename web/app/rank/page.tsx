'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from "@/components/layout/Navbar";
import { useSession } from "next-auth/react";
import { 
  Flame, 
  Zap, 
  Award, 
  Sparkles, 
  Bookmark, 
  RefreshCw, 
  Users, 
  Heart, 
  BookOpen, 
  TrendingUp,
  User,
  Layers,
  ChevronRight,
  ChevronLeft,
  Loader2
} from 'lucide-react';

// CẤU TRÚC PHÂN NHÓM BXH CHUẨN QUY MÔ QIDIAN
const RANK_CATEGORIES = [
  {
    groupTitle: '热门作品排行 / Tác Phẩm Hot',
    items: [
      { id: 'yuepiao', name: 'Nguyệt Phiếu (Vé Tháng)', sub: '月票榜', icon: <Flame size={14} className="text-red-500" /> },
      { id: 'hotsales', name: 'Bán Chạy Nhất', sub: '畅销榜', icon: <Zap size={14} className="text-yellow-500" /> },
      { id: 'readindex', name: 'Chỉ Số Đọc', sub: '阅读指数榜', icon: <Award size={14} className="text-blue-500" /> },
      { id: 'recom', name: 'Đề Cử Tuần', sub: '推荐榜', icon: <TrendingUp size={14} className="text-emerald-500" /> },
      { id: 'collect', name: 'Sưu Tầm Số Lượng', sub: '收藏榜', icon: <Bookmark size={14} className="text-purple-500" /> },
      { id: 'vipup', name: 'Cập Nhật VIP', sub: '更新榜', icon: <RefreshCw size={14} className="text-cyan-500" /> },
    ]
  },
  {
    groupTitle: '新书 bxh 排行 / Sách Mới',
    items: [
      { id: 'signnewbook', name: 'Mới Ký Hợp Đồng', sub: '签约作者新书榜', icon: <Sparkles size={14} className="text-pink-500" /> },
      { id: 'pubnewbook', name: 'Tác Phẩm Mới Ra', sub: '公众作者新书榜', icon: <Sparkles size={14} className="text-teal-500" /> },
      { id: 'newauthor', name: 'Tác Giả Mới Xuất Hiện', sub: '新人 author 榜', icon: <Users size={14} className="text-orange-500" /> }
    ]
  },
  {
    groupTitle: '女生频道 / Danh Mục Nữ Sinh',
    items: [
      { id: 'mm', name: 'Nữ Sinh Chọn Lọc', sub: '女生作品 bxh', icon: <Heart size={14} className="text-rose-400" /> },
      { id: 'mm/yuepiao', name: 'Nữ Sinh Nguyệt Phiếu', sub: '女生月票榜', icon: <Flame size={14} className="text-rose-500" /> }
    ]
  }
];

// DANH MỤC MÃ THỂ LOẠI ĐỒNG BỘ CHUẨN BACKEND & QIDIAN
// test
const BOOK_CATEGORIES = [
  { id: -1, name: 'Tất Cả' },
  { id: 21, name: 'Huyền Huyễn' },
  { id: 1, name: 'Kỳ Huyễn' },
  { id: 2, name: 'Võ Hiệp' },
  { id: 22, name: 'Tiên Hiệp' },
  { id: 4, name: 'Đô Thị' },
  { id: 15, name: 'Hiện Thực' },
  { id: 6, name: 'Quân Sự' },
  { id: 5, name: 'Lịch Sử' },
  { id: 7, name: 'Trò Chơi' },
  { id: 8, name: 'Thể Thao' },
  { id: 9, name: 'Khoa Học Viễn Tưởng' },
  { id: 20109, name: 'Chư Thiên Vô Hạn' },
  { id: 10, name: 'Huyền Nghi Linh Dị' },
  { id: 12, name: 'Light Novel' },
  { id: 0, name: 'VIP Tác Phẩm Mới' }
];

interface BookItem {
  rank: number;
  title: string;
  author: string;
  category: string;
  intro: string;
  coverUrl: string;
  sourceUrl: string;
  slug: string;
}

function RankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const currentYearStr = new Date().getFullYear().toString();
  const currentMonthStr = (new Date().getMonth() + 1).toString().padStart(2, '0');

  const currentType = searchParams.get('type') || 'yuepiao';
  const currentChn = parseInt(searchParams.get('chn') || '-1', 10);
  
  // Xử lý cẩn thận: Đảm bảo số trang luôn lớn hơn hoặc bằng 1
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const currentPage = rawPage < 1 ? 1 : rawPage;

  const currentYear = searchParams.get('year') || currentYearStr;
  const currentMonth = searchParams.get('month') || currentMonthStr;
  
  const [books, setBooks] = useState<BookItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Logic kiểm tra trang cuối (Qidian tối đa 5 trang, hoặc nếu số truyện trả về ít hơn 20 tức là đã hết)
  const [isLastPage, setIsLastPage] = useState<boolean>(false);

  const yearsList = Array.from({ length: new Date().getFullYear() - 2020 + 1 }, (_, i) => (2020 + i).toString()).reverse();
  const monthsList = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const getActiveRankMeta = () => {
    for (const group of RANK_CATEGORIES) {
      const found = group.items.find(item => item.id === currentType);
      if (found) return found;
    }
    return { name: 'BẢNG XẾP HẠNG', sub: 'RANKING' };
  };

  useEffect(() => {
    if (!searchParams.has('type')) {
      router.replace(`/rank?type=yuepiao&chn=-1&page=1&year=${currentYearStr}&month=${currentMonthStr}`);
    }
  }, [searchParams, router, currentYearStr, currentMonthStr]);

  const handleFilterChange = (type: string, chnId: number, page: number = 1, year: string = currentYear, month: string = currentMonth) => {
    // Đảm bảo không bao giờ chuyển hướng đến số trang nhỏ hơn 1
    const targetPage = page < 1 ? 1 : page;
    router.push(`/rank?type=${type}&chn=${chnId}&page=${targetPage}&year=${year}&month=${month}`);
  };

  useEffect(() => {
    const fetchRankData = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/qidian-rank?type=${currentType}&chn=${currentChn}&page=${currentPage}&year=${currentYear}&month=${currentMonth}`);
        if (!res.ok) throw new Error('Network error');
        
        const jsonResult = await res.json();
        const rawList = jsonResult?.data?.data;
        
        if (Array.isArray(rawList)) {
          setBooks(rawList);
          // Cẩn thận: Nếu danh sách trả về < 20 item hoặc trang hiện tại đạt ngưỡng tối đa của Qidian (thường là trang 5)
          setIsLastPage(rawList.length < 20 || currentPage >= 5);
        } else {
          setBooks([]);
          setIsLastPage(true);
        }
      } catch (error) {
        console.error("Lỗi khi kết nối gọi API BXH:", error);
        setBooks([]); 
        setIsLastPage(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (searchParams.has('type')) {
      fetchRankData();
    }
  }, [currentType, currentChn, currentPage, currentYear, currentMonth, searchParams]);

  return (
    <div className="max-w-5xl mx-auto">
      
      <Navbar session={session} />

      <div className="py-4 md:py-8">
        {/* TIÊU ĐỀ PHÂN ĐOẠN ĐỘNG */}
        <div className="mb-4 md:mb-6 pb-4 border-b border-zinc-900 flex items-baseline gap-3">
          <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase italic">
            {getActiveRankMeta().name}
          </h1>
          <span className="text-[10px] md:text-xs font-mono text-zinc-600 tracking-wider uppercase">
            // {getActiveRankMeta().sub}
          </span>
        </div>

        {/* CẤU TRÚC CHIA HAI CỘT CHUẨN TRANG CHỦ QIDIAN */}
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
          
          {/* CỘT TRÁI: SIDEBAR LỰA CHỌN DANH MỤC */}
          <aside className="w-full lg:w-64 shrink-0 flex flex-row lg:flex-col gap-4 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 scrollbar-none lg:sticky lg:top-20 snap-x">
            {RANK_CATEGORIES.map((group, groupIdx) => (
              <div key={groupIdx} className="bg-[#111111] rounded-lg border border-zinc-900 overflow-hidden min-w-[240px] md:min-w-[280px] lg:min-w-0 flex-1 lg:flex-none snap-start">
                <div className="bg-[#161616] px-4 py-2.5 border-b border-zinc-900">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 font-mono block truncate">
                    {group.groupTitle}
                  </span>
                </div>
                <div className="p-1 flex flex-col gap-0.5 max-h-[220px] lg:max-h-none overflow-y-auto lg:overflow-y-visible">
                  {group.items.map((item) => {
                    const isActive = currentType === item.id;
                    return (
                      <button
                        key={item.id}
                        disabled={isLoading} // Chặn chuyển đổi danh mục khi đang tải dữ liệu
                        onClick={() => handleFilterChange(item.id, -1, 1)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-all text-left group ${
                          isActive 
                            ? 'bg-zinc-900 text-orange-500 font-bold border border-zinc-800' 
                            : 'hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 disabled:opacity-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`}>
                            {item.icon}
                          </span>
                          <span className="text-xs tracking-tight truncate">{item.name}</span>
                        </div>
                        <span className="text-[9px] font-sans opacity-40 font-medium shrink-0 group-hover:opacity-60 hidden sm:inline ml-2">
                          {item.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </aside>

          {/* CỘT PHẢI: CHI TIẾT DANH SÁCH BẢNG XẾP HẠNG TRUYỆN */}
          <main className="flex-1 w-full flex flex-col gap-4 md:gap-5">
            
            {/* THANH CHỌN NHANH BỘ LỌC */}
            <div className="bg-[#111111] border border-zinc-900 rounded-lg p-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              
              {/* DROPDOWN CHỌN LỌC THỜI GIAN LỊCH SỬ */}
              <div className="flex items-center gap-1.5 border-b sm:border-b-0 sm:border-r border-zinc-900 pb-2 sm:pb-0 sm:pr-3 shrink-0">
                <select
                  disabled={isLoading}
                  value={currentYear}
                  onChange={(e) => handleFilterChange(currentType, currentChn, 1, e.target.value, currentMonth)}
                  className="bg-zinc-950 border border-zinc-800/80 text-zinc-400 text-[11px] rounded px-2 py-1.5 font-mono focus:outline-none focus:border-orange-500 flex-1 sm:flex-initial disabled:opacity-50"
                >
                  {yearsList.map(y => <option key={y} value={y}>Năm {y}</option>)}
                </select>

                <select
                  disabled={isLoading}
                  value={currentMonth}
                  onChange={(e) => handleFilterChange(currentType, currentChn, 1, currentYear, e.target.value)}
                  className="bg-zinc-950 border border-zinc-800/80 text-zinc-400 text-[11px] rounded px-2 py-1.5 font-mono focus:outline-none focus:border-orange-500 flex-1 sm:flex-initial disabled:opacity-50"
                >
                  {monthsList.map(m => <option key={m} value={m}>Tháng {m}</option>)}
                </select>
              </div>

              {/* THANH CHỌN THỂ LOẠI CON */}
              <div className="flex-1 flex flex-row sm:flex-wrap gap-1.5 items-center overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0 scrollbar-none snap-x">
                <span className="text-[10px] font-mono uppercase font-bold text-zinc-600 px-2 select-none shrink-0 hidden md:inline">
                  Thể loại //
                </span>
                {BOOK_CATEGORIES.map((cat) => {
                  const isCatActive = currentChn === cat.id;
                  return (
                    <button
                      key={`${cat.id}-${cat.name}`}
                      disabled={isLoading}
                      onClick={() => handleFilterChange(currentType, cat.id, 1)}
                      className={`px-3 py-1 rounded-md text-xs transition-all border shrink-0 snap-start ${
                        isCatActive 
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 font-medium' 
                          : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 disabled:opacity-50'
                      }`}
                    >
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BLOCK HIỂN THỊ DANH SÁCH TRUYỆN */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-32 bg-[#111111] rounded-xl border border-zinc-900">
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin mb-3" />
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-500 text-center px-4">
                  Đang đồng bộ hóa kho dữ liệu Qidian...
                </span>
              </div>
            ) : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 bg-[#111111] rounded-xl border border-dashed border-zinc-900 text-center px-4">
                <BookOpen size={32} className="text-zinc-800 mb-2" />
                <span className="text-xs font-mono uppercase text-zinc-600 tracking-wider">
                  Hệ thống chưa ghi nhận bảng xếp hạng này
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {books.map((book) => {
                  const rankBadgeColor = 
                    book.rank === 1 ? 'bg-amber-500 text-black font-black' :
                    book.rank === 2 ? 'bg-zinc-300 text-black font-black' :
                    book.rank === 3 ? 'bg-amber-700 text-white font-black' : 
                    'bg-zinc-900 text-zinc-500';

                  return (
                    <a 
                      key={book.slug || book.rank}
                      href={book.sourceUrl || "#"}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex gap-3 md:gap-4 p-3 md:p-4 bg-[#111111] border border-zinc-900 rounded-xl hover:border-orange-500/30 transition-all duration-200 group relative overflow-hidden cursor-pointer block"
                    >
                      {/* Thứ hạng */}
                      <div className={`absolute top-0 left-0 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-br-lg text-[10px] md:text-xs font-mono ${rankBadgeColor} shadow-md z-10`}>
                        {book.rank}
                      </div>

                      <div className="flex gap-3 md:gap-4">
                        {/* Ảnh bìa */}
                        <div className="w-16 h-24 md:w-20 md:h-28 bg-zinc-900 rounded-md overflow-hidden shrink-0 shadow-lg border border-zinc-900 mt-2 sm:mt-0">
                          {book.coverUrl ? (
                            <img 
                              src={book.coverUrl} 
                              alt={book.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700 text-[9px] uppercase">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Thông tin nội dung */}
                        <div className="flex flex-col justify-between flex-1 min-w-0 pt-1">
                          <div>
                            <h3 className="font-bold text-sm md:text-base text-zinc-100 truncate group-hover:text-orange-500 transition-colors tracking-tight">
                              {book.title}
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-[11px] md:text-xs">
                              <span className="text-zinc-400 font-medium flex items-center gap-1 max-w-[120px] truncate">
                                <User size={11} className="text-zinc-600 shrink-0" /> {book.author}
                              </span>
                              <span className="text-zinc-800">|</span>
                              <span className="text-zinc-500 flex items-center gap-1 max-w-[150px] truncate">
                                <Layers size={11} className="text-zinc-700 shrink-0" /> {book.category}
                              </span>
                            </div>
                            
                            <p className="text-[11px] md:text-xs text-zinc-400 line-clamp-2 mt-2 leading-relaxed">
                              {book.intro}
                            </p>
                          </div>

                          {/* Chân thẻ */}
                          <div className="border-t border-zinc-900/80 pt-2 mt-2.5 flex items-center justify-between text-[10px] md:text-[11px] font-mono text-zinc-600 gap-2">
                            <span className="truncate">
                              Cổng gốc: <span className="text-zinc-500 font-sans text-[11px] md:text-xs hidden sm:inline">Qidian Chinh Văn</span>
                            </span>
                            <span className="text-zinc-500 group-hover:text-orange-500 text-[9px] md:text-[10px] uppercase tracking-tighter transition-colors flex items-center gap-0.5 shrink-0">
                              Xem chi tiết tại Qidian <ChevronRight size={10} />
                            </span>
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}

                {/* HỆ THỐNG ĐIỀU HƯỚNG PHÂN TRANG HOÀN CHỈNH */}
                <div className="flex items-center justify-center gap-5 mt-4 pt-4 border-t border-zinc-900/60 select-none">
                  <button 
                    disabled={currentPage === 1 || isLoading}
                    onClick={() => handleFilterChange(currentType, currentChn, currentPage - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-400 disabled:opacity-20 disabled:hover:border-zinc-900 disabled:cursor-not-allowed hover:border-zinc-700 hover:text-zinc-200 transition-all font-medium"
                  >
                    <ChevronLeft size={14} /> Trước
                  </button>
                  
                  <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 bg-[#0a0a0a] border border-zinc-900 px-3 py-1.5 rounded-md">
                    <span>Trang</span>
                    <span className="text-orange-500 font-bold px-1 bg-zinc-900 rounded border border-zinc-800 min-w-[20px] text-center">
                      {currentPage}
                    </span>
                  </div>

                  <button 
                    disabled={isLastPage || isLoading}
                    onClick={() => handleFilterChange(currentType, currentChn, currentPage + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-400 disabled:opacity-20 disabled:hover:border-zinc-900 disabled:cursor-not-allowed hover:border-zinc-700 hover:text-zinc-200 transition-all font-medium"
                  >
                    Sau <ChevronRight size={14} />
                  </button>
                </div>

              </div>
            )}
          </main>

        </div>
      </div>
    </div>
  );
}

export default function QidianRankPage() {
  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <Suspense fallback={
        <div className="min-h-screen bg-black flex items-center justify-center text-zinc-500 font-mono text-xs uppercase tracking-widest animate-pulse">
          Đang tải dữ liệu bảng xếp hạng...
        </div>
      }>
        <RankContent />
      </Suspense>
    </main>
  );
}