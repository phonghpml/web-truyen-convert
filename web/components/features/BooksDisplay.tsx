"use client";

import Link from "next/link";
import { useBooks } from "@/lib/hooks";
import { getBookLink } from "@/lib/utils";
import { BOOK_LIST_LIMIT, MESSAGES } from "@/lib/constants";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/shared/StateComponents";

export default function BooksDisplay() {
  const { data: books, loading, error } = useBooks(BOOK_LIST_LIMIT);

  if (loading) {
    return <LoadingState message={MESSAGES.LOADING} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!books || books.length === 0) {
    return <EmptyState message={MESSAGES.NO_BOOKS} />;
  }

  return (
    <div className="mt-20 mb-12">
      <h3 className="text-3xl font-black mb-10 italic tracking-tighter text-white">
        Danh Sách Truyện
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {books.map((book) => {
          const bookId = book.source_url || book._id;
          if (!bookId) return null;
          
          return (
          <Link
            key={bookId}
            href={getBookLink(bookId)}
          >
            <div 
              className="group cursor-pointer rounded-lg overflow-hidden border border-gray-800 hover:border-orange-500 transition-all duration-300 shadow-lg hover:shadow-orange-500/20"
            >
            {/* Cover Image */}
            <div className="relative overflow-hidden bg-gray-900 aspect-[3/4]">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title_vi}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <span className="text-gray-500 text-xs text-center px-2">No Image</span>
                </div>
              )}
              
              {/* Overlay with Info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                <div className="space-y-2">
                  <p className="text-[10px] text-orange-400 font-bold">
                    🔖 {book.chapters_count || 0} Chương
                  </p>
                  <p className="text-[10px] text-gray-300 font-light">
                    👁️ {book.views_count || 0} Lượt đọc
                  </p>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="p-3 bg-gray-950 min-h-[60px] flex items-center border-t border-gray-800">
              <h4 className="text-xs font-bold text-white leading-tight line-clamp-3 group-hover:text-orange-400 transition-colors">
                {book.title_vi || "Không có tên"}
              </h4>
            </div>

            {/* Stats */}
            <div className="px-3 py-2 bg-gray-900 border-t border-gray-800 flex justify-between items-center text-[9px]">
              <span className="text-gray-400">
                <span className="text-orange-400 font-bold">{book.chapters_count || 0}</span> chương
              </span>
              <span className="text-gray-400">
                <span className="text-orange-400 font-bold">{book.views_count || 0}</span> lượt
              </span>
            </div>
            </div>
          </Link>
          );
        })}
      </div>
    </div>
  );
}
