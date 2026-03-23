"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { BookResult } from "@/components/features/BookResult";
import {
  LoadingState,
  ErrorState,
  EmptyState,
} from "@/components/shared/StateComponents";
import { searchBooks } from "@/lib/hooks";
import { getBookLink, decodeBookId } from "@/lib/utils";
import { MESSAGES } from "@/lib/constants";

export default function SearchPage() {
  const params = useParams();
  const router = useRouter();
  const query = params.query as string;

  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const performSearch = async () => {
      try {
        setLoading(true);
        const decodedQuery = decodeBookId(query);
        const { books, error: searchError } = await searchBooks(decodedQuery);

        if (searchError) {
          setError(searchError);
          setSearchResults([]);
        } else {
          setSearchResults(books);
          setError(null);
        }
      } catch (err) {
        console.error("Search error:", err);
        setError(MESSAGES.ERROR_SEARCH);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      performSearch();
    }
  }, [query]);

  const handleBookClick = (book: any) => {
    if (book.source_url) {
      router.push(getBookLink(book.source_url));
    }
  };

  const handleHome = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-black text-white font-mono p-6">
      <div className="max-w-5xl mx-auto">
        <Navbar session={null} onHomeClick={handleHome} />

        <div className="mt-12">
          <h2 className="text-3xl font-black mb-2 italic tracking-tighter">
            Kết Quả Tìm Kiếm
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            Từ khóa: <span className="text-orange-400">{decodeBookId(query)}</span>
          </p>

          {loading && <LoadingState message={MESSAGES.SEARCH_LOADING} />}

          {error && !loading && (
            <ErrorState message={error} onHome={handleHome} />
          )}

          {!loading && searchResults.length > 0 && (
            <div className="space-y-4">
              {searchResults.map((book) => (
                <div
                  key={book.source_url || book._id}
                  className="cursor-pointer"
                  onClick={() => handleBookClick(book)}
                >
                  <BookResult data={book} />
                </div>
              ))}
            </div>
          )}

          {!loading && searchResults.length === 0 && !error && (
            <EmptyState message={MESSAGES.NO_RESULTS} />
          )}

          {!loading && (
            <button
              onClick={handleHome}
              className="mt-8 text-[10px] text-orange-500 uppercase font-bold hover:text-orange-400"
            >
              ← Quay lại trang chủ
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
